import Oystehr, { SearchParam } from '@oystehr/sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import {
  Account,
  Appointment,
  Encounter as FhirEncounter,
  Patient,
  RelatedPerson,
  Resource,
  Task as FhirTask,
} from 'fhir/r4b';
import { DateTime } from 'luxon';
import {
  FHIR_EXTENSION,
  GET_INVOICES_TASKS_ZAMBDA_KEY,
  getEmailForIndividual,
  getFullName,
  GetInvoicesTasksInput,
  GetInvoicesTasksResponse,
  getPatientReferenceFromAccount,
  getPhoneNumberForIndividual,
  getResponsiblePartyFromAccount,
  getSecret,
  INVOICEABLE_PATIENTS_PAGE_SIZE,
  InvoiceablePatientReport,
  mapGenderToLabel,
  parseInvoiceTaskInput,
  PATIENT_BILLING_ACCOUNT_TYPE,
  RCM_TASK_SYSTEM,
  RcmTaskCode,
  SecretsKeys,
} from 'utils';
import {
  checkOrCreateM2MClientToken,
  createOystehrClient,
  topLevelCatch,
  wrapHandler,
  ZambdaInput,
} from '../../shared';
import { accountMatchesType } from '../shared/harvest';
import { validateRequestParameters } from './validateRequestParameters';

let m2mToken: string;
const ZAMBDA_NAME = GET_INVOICES_TASKS_ZAMBDA_KEY;

type PatientRelationshipToInsured = 'Self' | 'Spouse' | 'Parent' | 'Legal Guardian' | 'Other';
interface TaskGroup {
  task: FhirTask;
  encounter: FhirEncounter;
  patient: Patient;
  account?: Account;
  appointment?: Appointment;
  responsibleParty?: Patient | RelatedPerson;
  relatedPerson?: RelatedPerson;
}

export const index = wrapHandler(ZAMBDA_NAME, async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    const validatedParams = validateRequestParameters(input);
    const { secrets } = validatedParams;

    m2mToken = await checkOrCreateM2MClientToken(m2mToken, secrets);
    const oystehr = createOystehrClient(m2mToken, secrets);
    // const candid = createCandidApiClient(secrets);

    const taskGroups = await getFhirResourcesGroupped(oystehr, validatedParams);

    const response = performEffect(taskGroups);
    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error: unknown) {
    const ENVIRONMENT = getSecret(SecretsKeys.ENVIRONMENT, input.secrets);
    console.log('Error occurred:', error);
    return await topLevelCatch(ZAMBDA_NAME, error, ENVIRONMENT);
  }
});

function performEffect(taskGroups: TaskGroup[]): GetInvoicesTasksResponse {
  const reports: InvoiceablePatientReport[] = [];

  taskGroups.forEach((group) => {
    const { task, patient, appointment, responsibleParty } = group;
    const input = parseInvoiceTaskInput(task);

    const patientName = getFullName(patient);
    const patientDob = patient?.birthDate
      ? DateTime.fromISO(patient.birthDate)?.toFormat('MM/dd/yyyy')?.toString()
      : undefined;
    const patientGenderLabel = patient?.gender && mapGenderToLabel[patient.gender];

    const responsiblePartyName = responsibleParty && getFullName(responsibleParty);
    const responsiblePartyPhoneNumber = responsibleParty && getPhoneNumberForIndividual(responsibleParty);
    const responsiblePartyEmail = responsibleParty && getEmailForIndividual(responsibleParty);

    reports.push({
      claimId: '---',
      appointmentDate: appointment?.start ? isoToFormat(appointment.start) : undefined,
      // finalizationDate: isoToFormat(claim.timestamp, 'MM/dd/yyyy HH:mm'), todo fix this
      finalizationDate: '---',
      amountInvoiceable: `${input.amountCents / 100}`,
      visitDate: '---',
      location: '---',
      task: task,
      patient: {
        patientId: patient.id!,
        fullName: patientName,
        dob: patientDob,
        gender: patientGenderLabel,
        phoneNumber: 'll',
      },
      responsibleParty: {
        fullName: responsiblePartyName,
        email: responsiblePartyEmail,
        phoneNumber: responsiblePartyPhoneNumber,
        relationshipToPatient: responsibleParty && getResponsiblePartyRelationship(responsibleParty)?.toLowerCase(),
      },
    });
  });

  return { reports };
}

async function getFhirResourcesGroupped(
  oystehr: Oystehr,
  complexValidatedInput: GetInvoicesTasksInput
): Promise<TaskGroup[]> {
  const { page, status } = complexValidatedInput;
  // todo: add here filter by patient for example
  const params: SearchParam[] = [
    {
      name: '_sort',
      value: '-authored-on',
    },
    {
      name: '_total',
      value: 'accurate',
    },
    {
      name: '_count',
      value: INVOICEABLE_PATIENTS_PAGE_SIZE,
    },
    {
      name: 'status:not',
      value: 'cancelled',
    },
    {
      name: 'code',
      value: `${RCM_TASK_SYSTEM}|${RcmTaskCode.sendInvoiceToPatient}`,
    },
    {
      name: '_include',
      value: 'Task:encounter',
    },
    {
      name: '_include:iterate',
      value: 'Encounter:patient',
    },
    {
      name: '_include:iterate',
      value: 'Encounter:appointment',
    },
    {
      name: '_revinclude:iterate',
      value: 'RelatedPerson:patient',
    },
    {
      name: '_revinclude:iterate',
      value: 'Account:patient',
    },
  ];
  if (page) {
    params.push({
      name: '_offset',
      value: page * INVOICEABLE_PATIENTS_PAGE_SIZE,
    });
  }
  if (status) {
    params.push({
      name: 'status',
      value: status,
    });
  }
  const bundle = await oystehr.fhir.search({
    resourceType: 'Task',
    params,
  });
  const resources = bundle.unbundle() as Resource[];
  const tasks = resources.filter((r) => r.resourceType === 'Task') as FhirTask[];
  console.log('Tasks found: ', tasks.length);
  const resultGroups: TaskGroup[] = [];

  tasks.forEach((task) => {
    const encounterId = task.encounter?.reference?.replace('Encounter/', '');
    const encounter = findResourceById<FhirEncounter>('Encounter', encounterId, resources);
    if (!encounter) {
      console.error(
        `Task with id: ${task.id} was not included in the bundle because it's missing encounter with id: ${encounterId}`
      );
      return;
    }

    const patientId = encounter.subject?.reference?.replace('Patient/', '');
    const patient = findResourceById<Patient>('Patient', patientId, resources);
    if (!patient || !patientId) {
      console.error(
        `Task with id: ${task.id} was not included in the bundle because it's missing patient with id: ${patientId}`
      );
      return;
    }

    const appointmentId = encounter.appointment
      ?.find((ref) => ref.reference?.includes('Appointment/'))
      ?.reference?.replace('Appointment/', '');
    const appointment = findResourceById<Appointment>('Appointment', appointmentId, resources);

    const account = resources.find(
      (res) =>
        res.resourceType === 'Account' &&
        accountMatchesType(res as Account, PATIENT_BILLING_ACCOUNT_TYPE) &&
        getPatientReferenceFromAccount(res as Account)?.includes(patientId)
    ) as Account;
    const responsibleParty = account ? getResponsiblePartyFromAccount(account, resources) : undefined;

    const relatedPerson = resources.find(
      (resource) =>
        resource.resourceType === 'RelatedPerson' &&
        (resource as RelatedPerson).patient?.reference?.includes(patientId) &&
        (resource as RelatedPerson).relationship?.find(
          (relationship) => relationship.coding?.find((code) => code.code === 'user-relatedperson')
        )
    ) as RelatedPerson;

    resultGroups.push({ task, encounter, patient, account, appointment, responsibleParty, relatedPerson });
  });

  console.log('Tasks groups created: ', resultGroups.length);
  return resultGroups;
}

function findResourceById<T extends Resource>(
  resourceType: Resource['resourceType'],
  id: string | undefined,
  resources: Resource[]
): T | undefined {
  if (!id) return undefined;
  return resources.find((res) => res.resourceType === resourceType && res.id === id) as T;
}

function isoToFormat(isoDate: string, format: string = 'MM/dd/yyyy'): string {
  return DateTime.fromISO(isoDate).toFormat(format);
}

export function getResponsiblePartyRelationship(
  responsibleParty: RelatedPerson | Patient
): PatientRelationshipToInsured | undefined {
  let result: PatientRelationshipToInsured | undefined = undefined;
  if (responsibleParty.resourceType === 'Patient') return 'Self';
  responsibleParty.relationship?.find(
    (rel) =>
      rel.coding?.find((coding) => {
        if (coding.system === FHIR_EXTENSION.RelatedPerson.responsiblePartyRelationship.url) {
          result = coding.code as PatientRelationshipToInsured;
          return true;
        }
        return false;
      })
  );
  return result;
}
