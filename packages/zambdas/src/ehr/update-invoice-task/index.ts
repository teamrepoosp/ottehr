import { APIGatewayProxyResult } from 'aws-lambda';
import { Encounter, Task } from 'fhir/r4b';
import { createInvoiceTaskInput, getSecret, SecretsKeys, USER_TIMEZONE_EXTENSION_URL } from 'utils';
import {
  checkOrCreateM2MClientToken,
  createOystehrClient,
  topLevelCatch,
  wrapHandler,
  ZambdaInput,
} from '../../shared';
import { validateRequestParameters } from './validateRequestParameters';

let m2mToken: string;

const ZAMBDA_NAME = 'update-invoice-task';

export const index = wrapHandler(ZAMBDA_NAME, async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    const validatedParams = validateRequestParameters(input);
    const { secrets, taskId, status, invoiceTaskInput, userTimezone } = validatedParams;

    m2mToken = await checkOrCreateM2MClientToken(m2mToken, secrets);
    const oystehr = createOystehrClient(m2mToken, secrets);

    const taskInput = createInvoiceTaskInput(invoiceTaskInput);

    const resources = (
      await oystehr.fhir.search({
        resourceType: 'Task',
        params: [
          {
            name: 'id',
            value: taskId,
          },
          {
            name: '_include',
            value: 'Task:encounter',
          },
        ],
      })
    ).unbundle();
    const task = resources.find((resource) => resource.resourceType === 'Task' && resource.id === taskId) as Task;
    const encounter = resources.find((res) => res.resourceType === 'Encounter') as Encounter;
    console.log('Encounter: ', encounter);

    // task.status = status as any;
    console.log('status: ', status);
    task.input = taskInput;

    if (!task.extension) {
      task.extension = [];
    }
    task.extension.push({
      url: USER_TIMEZONE_EXTENSION_URL,
      valueString: userTimezone,
    });

    await oystehr.fhir.update(task);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Task changed successfully' }),
    };
  } catch (error) {
    const ENVIRONMENT = getSecret(SecretsKeys.ENVIRONMENT, input.secrets);
    await topLevelCatch(ZAMBDA_NAME, error, ENVIRONMENT);
    console.log('Error occurred:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
});

// async function syncWithCandid(
//   candid: CandidApiClient,
//   encounter: Encounter
// ): Promise<{ claimId: string; patientBalance: number } | undefined> {
//   const candidEncounterId = getCandidEncounterIdFromEncounter(encounter);
//   if (candidEncounterId) {
//     const candidResponse = await candid.encounters.v4.get(EncounterId(candidEncounterId));
//     if (candidResponse.ok && candidResponse.body) {
//       const candidEncounter = candidResponse.body;
//       const claimId = candidEncounter.claims.at(0)?.claimId;
//       if (claimId) {
//         const itemization = await candid.patientAr.v1.itemize(CandidApi.ClaimId(claimId));
//         if (itemization.ok && itemization.body) {
//           const balance = itemization.body.patientBalanceCents;
//           return {
//             claimId,
//             patientBalance: balance,
//           };
//         }
//       }
//     }
//   }
//   return undefined;
// }
