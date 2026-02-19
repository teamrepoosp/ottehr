import Oystehr from '@oystehr/sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { CandidApi, CandidApiClient } from 'candidhealth';
import { InventoryRecord, InvoiceItemizationResponse } from 'candidhealth/api/resources/patientAr/resources/v1';
import { Encounter } from 'fhir/r4b';
import { DateTime } from 'luxon';
import {
  createCandidApiClient,
  createInvoiceTaskInput,
  findClaimsBy,
  getSecret,
  getStartTimeFromEncounterStatusHistory,
  mapDisplayToInvoiceTaskStatus,
  SecretsKeys,
} from 'utils';
import {
  checkOrCreateM2MClientToken,
  createOystehrClient,
  getCandidEncounterIdFromEncounter,
  topLevelCatch,
  wrapHandler,
  ZambdaInput,
} from '../../../shared';
import { validateRequestParameters } from './validateRequestParameters';

let m2mToken: string;
const ZAMBDA_NAME = 'sub-refresh-invoice-task';

export const index = wrapHandler(ZAMBDA_NAME, async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    const validatedParams = validateRequestParameters(input);
    const { secrets, invoiceTaskInput, taskId } = validatedParams;

    m2mToken = await checkOrCreateM2MClientToken(m2mToken, secrets);
    const oystehr = createOystehrClient(m2mToken, secrets);
    const candid = createCandidApiClient(secrets);

    const inventoryRecord = await getCandidInventoryRecordForTask(oystehr, candid, taskId);
    if (inventoryRecord) {
      console.log(
        `Found inventory record for task, claim id: "${inventoryRecord.claimId}", updating task input finalizationDate`
      );
      invoiceTaskInput.finalizationDate = inventoryRecord.timestamp.toISOString();
      console.log('Finalization date: ', invoiceTaskInput.finalizationDate);
      const itemization = await getItemizationForClaim(candid, inventoryRecord.claimId);
      if (itemization) {
        console.log(`Found itemization for claim: "${itemization.claimId}", updating task input amountCents`);
        invoiceTaskInput.amountCents = itemization.patientBalanceCents;
        console.log('Amount cents: ', invoiceTaskInput.amountCents);
      }
      await oystehr.fhir.patch({
        resourceType: 'Task',
        id: taskId,
        operations: [
          { op: 'replace', path: '/input', value: createInvoiceTaskInput(invoiceTaskInput) },
          { op: 'replace', path: '/status', value: mapDisplayToInvoiceTaskStatus('ready') },
        ],
      });
      console.log(`Updated task input for task id: "${taskId}"`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Task was successfully updated.' }),
      };
    }

    console.warn('Task was not updated because no inventory record was found for the task.'); // todo how i can better manage this situation
    await oystehr.fhir.patch({
      resourceType: 'Task',
      id: taskId,
      operations: [{ op: 'replace', path: '/status', value: mapDisplayToInvoiceTaskStatus('error') }],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Task was not updated because no inventory record was found for the task.' }),
    };
  } catch (error: unknown) {
    const ENVIRONMENT = getSecret(SecretsKeys.ENVIRONMENT, input.secrets);
    console.log('Error occurred:', error);
    return await topLevelCatch(ZAMBDA_NAME, error, ENVIRONMENT);
  }
});

async function getCandidInventoryRecordForTask(
  oystehr: Oystehr,
  candid: CandidApiClient,
  taskId: string
): Promise<InventoryRecord | undefined> {
  const resources = (
    await oystehr.fhir.search({
      resourceType: 'Task',
      params: [
        {
          name: '_id',
          value: taskId,
        },
        {
          name: '_include',
          value: 'Task:encounter',
        },
      ],
    })
  ).unbundle();
  const encounter = resources.find((res) => res.resourceType === 'Encounter') as Encounter | undefined;
  if (encounter) {
    const candidEncounterId = getCandidEncounterIdFromEncounter(encounter);
    const startFromIso = getStartTimeFromEncounterStatusHistory(encounter);
    const startFromDate = startFromIso ? DateTime.fromISO(startFromIso) : undefined;
    if (candidEncounterId && startFromDate && startFromDate.isValid) {
      return (
        await findClaimsBy({
          candid,
          candidEncountersIds: [candidEncounterId],
          since: startFromDate,
        })
      )?.find((record) => record.encounterId === candidEncounterId);
    }
  }
  return undefined;
}

async function getItemizationForClaim(
  candid: CandidApiClient,
  claimId: string
): Promise<InvoiceItemizationResponse | undefined> {
  const itemizationResponse = await candid.patientAr.v1.itemize(CandidApi.ClaimId(claimId));
  if (itemizationResponse && itemizationResponse.ok && itemizationResponse.body) {
    return itemizationResponse.body as InvoiceItemizationResponse;
  }
  return undefined;
}
