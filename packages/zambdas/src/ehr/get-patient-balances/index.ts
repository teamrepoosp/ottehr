import Oystehr from '@oystehr/sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { CandidApi, CandidApiClient } from 'candidhealth';
import { APIResponse } from 'candidhealth/core';
import { Encounter } from 'fhir/r4b';
import { createCandidApiClient, GetPatientBalancesZambdaOutput, Secrets } from 'utils';
import {
  CANDID_ENCOUNTER_ID_IDENTIFIER_SYSTEM,
  checkOrCreateM2MClientToken,
  createOystehrClient,
  lambdaResponse,
  wrapHandler,
  ZambdaInput,
} from '../../shared';
import { ValidatedInput, validateInput, validateSecrets } from './validateRequestParameters';

type IdMap = Map<
  string,
  {
    candidId: string | undefined;
    claimId: string | undefined;
    patientBalanceCents?: number;
  }
>;

// Lifting up value to outside of the handler allows it to stay in memory across warm lambda invocations
let m2mToken: string;

const ZAMBDA_NAME = 'get-patient-balances';

export const index = wrapHandler(ZAMBDA_NAME, async (unsafeInput: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    const secrets = validateSecrets(unsafeInput.secrets);

    const validatedInput = await validateInput(unsafeInput);

    m2mToken = await checkOrCreateM2MClientToken(m2mToken, secrets);
    const oystehr = createOystehrClient(m2mToken, secrets);

    const response = await performEffect(validatedInput, secrets, oystehr);

    return lambdaResponse(200, response);
  } catch (error: any) {
    console.log('Error: ', JSON.stringify(error.message));
    return lambdaResponse(500, { error: error.message });
  }
});

async function performEffect(
  validatedInput: ValidatedInput,
  _secrets: Secrets,
  _oystehr: Oystehr
): Promise<GetPatientBalancesZambdaOutput> {
  const { patientId } = validatedInput.body;

  const noData = {
    encounters: [],
    totalBalanceCents: 0,
  };

  // get all encounters
  console.group('getFhirEncountersForPatient');
  const encounters = await getFhirEncountersForPatient(_oystehr, patientId);
  console.groupEnd();
  console.debug('getFhirEncountersForPatient success');
  if (encounters.length === 0) {
    return noData;
  }

  // to keep track of all the separate ids
  const idMap: IdMap = new Map();
  encounters.forEach((encounter) => {
    idMap.set(encounter.id!, { candidId: undefined, claimId: undefined });
  });

  // get candid ids from encounters
  console.group('saveCandidEncounterIdsInMap');
  const candidEncountersLength = saveCandidEncounterIdsInMap(encounters, idMap);
  console.groupEnd();
  console.debug('saveCandidEncounterIdsInMap success');
  if (candidEncountersLength === 0) {
    return noData;
  }

  // get all candid encounters
  console.group('creating candid api client');
  const candidApiClient = createCandidApiClient(_secrets);
  console.groupEnd();
  console.debug('creating candid api client success');

  // todo should i use getCandidInventoryPagesRecursive instead and then filter after the fact?
  console.group('getAllCandidEncounters');
  const candidEncounters = await getAllCandidEncounters(candidApiClient, idMap);
  console.groupEnd();
  console.debug('getAllCandidEncounters success');
  if (candidEncounters.length === 0) {
    return noData;
  }

  // Unpack the array of claims (should only be one) and grab the first claim id
  console.group('saveFirstClaimIdInMap');
  const claimsLength = saveFirstClaimIdInMap(candidEncounters, idMap);
  console.groupEnd();
  console.debug('saveFirstClaimIdInMap success');
  if (claimsLength === 0) {
    return noData;
  }

  console.log('idMap', JSON.stringify(idMap));

  // For each Candid claim id, call the Candid invoice itemization API endpoint
  console.group('getAllCandidClaims');
  const claims = await getAllCandidClaims(candidApiClient, idMap);
  console.groupEnd();
  console.debug('getAllCandidClaims success');
  if (claims.length === 0) {
    return noData;
  }

  // Save the balances in the map
  console.group('saveBalancesInMap');
  saveBalancesInMap(claims, idMap);
  console.groupEnd();
  console.debug('saveBalancesInMap success');

  console.log('idMap with balances', JSON.stringify(idMap));

  const encounterBalancesOnly = Array.from(idMap.entries()).map(([encounterId, mapValue]) => ({
    encounterId,
    patientBalanceCents: mapValue.patientBalanceCents || 0,
  }));
  return {
    encounters: encounterBalancesOnly,
    totalBalanceCents: encounterBalancesOnly.reduce((acc, { patientBalanceCents }) => acc + patientBalanceCents, 0),
  };
}

async function getFhirEncountersForPatient(oystehr: Oystehr, patientId: string): Promise<Encounter[]> {
  const encountersResponse = await oystehr.fhir.search<Encounter>({
    resourceType: 'Encounter',
    params: [
      {
        name: 'subject',
        value: `Patient/${patientId}`,
      },
    ],
  });
  const encounters = encountersResponse.unbundle();
  console.log(`Found ${encounters.length} encounters for patient ${patientId}`);
  return encounters;
}

function saveCandidEncounterIdsInMap(encounters: Encounter[], idMap: IdMap): number {
  encounters.forEach((encounter) => {
    const candidId = encounter.identifier?.find(
      (identifier) => identifier.system === CANDID_ENCOUNTER_ID_IDENTIFIER_SYSTEM && identifier.value != null
    )?.value;
    if (!encounter.id || !candidId) {
      // no candid id for this encounter
      return;
    }
    idMap.set(encounter.id, { candidId, claimId: undefined });
  });
  const length = Array.from(idMap.values()).filter(({ candidId }) => candidId !== undefined).length;
  console.log(`Found ${length} Candid ids`);
  return length;
}

async function getAllCandidEncounters(
  candidApiClient: CandidApiClient,
  idMap: IdMap
): Promise<APIResponse<CandidApi.encounters.v4.Encounter, CandidApi.encounters.v4.get.Error._Unknown>[]> {
  const candidEncounters = await Promise.all(
    Array.from(idMap.values())
      .filter(({ candidId }) => candidId !== undefined)
      .map(({ candidId }) => {
        return candidApiClient.encounters.v4.get(CandidApi.EncounterId(candidId!));
      })
  );
  console.log(`Fetched ${candidEncounters.length} Candid encounters`);
  return candidEncounters;
}

function saveFirstClaimIdInMap(
  candidEncounters: APIResponse<CandidApi.encounters.v4.Encounter, CandidApi.encounters.v4.get.Error._Unknown>[],
  idMap: IdMap
): number {
  candidEncounters.forEach((candidEncounter) => {
    if (!candidEncounter.ok) {
      throw new Error(`Failed to fetch Candid encounter: ${candidEncounter.error}`);
    }

    const { claims } = candidEncounter.body;
    if (claims.length !== 1) {
      throw new Error(`Expected exactly one claim per encounter, but got ${claims.length}`);
    }

    const encounterMapObject = Array.from(idMap.entries()).find(
      ([_, mapValue]) => mapValue.candidId === candidEncounter.body.encounterId
    );
    if (!encounterMapObject) return;
    const [encounterId, mapValue] = encounterMapObject;
    mapValue.claimId = claims[0].claimId;
    idMap.set(encounterId, mapValue);
  });
  const length = Array.from(idMap.values()).filter(({ claimId }) => claimId !== undefined).length;
  console.log(`found ${length} claim ids`);
  return length;
}

async function getAllCandidClaims(
  candidApiClient: CandidApiClient,
  idMap: IdMap
): Promise<APIResponse<CandidApi.patientAr.v1.InvoiceItemizationResponse, CandidApi.patientAr.v1.itemize.Error>[]> {
  const claimItemizations = await Promise.all(
    Array.from(idMap.values())
      .filter(({ claimId }) => claimId !== undefined)
      .map(({ claimId }) => {
        return candidApiClient.patientAr.v1.itemize(CandidApi.ClaimId(claimId!));
      })
  );
  console.log(`Fetched ${claimItemizations.length} claims`);
  return claimItemizations;
}

function saveBalancesInMap(
  candidClaims: APIResponse<CandidApi.patientAr.v1.InvoiceItemizationResponse, CandidApi.patientAr.v1.itemize.Error>[],
  idMap: IdMap
): void {
  candidClaims.forEach((candidClaim) => {
    if (!candidClaim.ok) {
      throw new Error(`Failed to fetch Candid claim: ${candidClaim.error}`);
    }

    const encounterMapObject = Array.from(idMap.entries()).find(
      ([_, mapValue]) => mapValue.claimId === candidClaim.body.claimId
    );
    if (!encounterMapObject) return;
    const [encounterId, mapValue] = encounterMapObject;
    mapValue.patientBalanceCents = candidClaim.body.patientBalanceCents;
    idMap.set(encounterId, mapValue);
  });
}
