import { Task, TaskInput } from 'fhir/r4b';
import { ottehrCodeSystemUrl } from '../../fhir/systemUrls';
import { InvoiceTaskInput } from '../../types';

export function createInvoiceTaskInput(input: InvoiceTaskInput): TaskInput[] {
  const fieldsNames = Object.keys(input);

  return fieldsNames.map((fieldName) => {
    let fieldValue = input[fieldName as keyof InvoiceTaskInput];
    if (typeof fieldValue === 'number') fieldValue = fieldValue.toString();
    return {
      type: {
        coding: [
          {
            system: ottehrCodeSystemUrl('invoice-task-input'),
            code: fieldName,
          },
        ],
      },
      valueString: fieldValue,
    };
  });
}

export function parseInvoiceTaskInput(invoiceTask: Task): InvoiceTaskInput {
  const dueDate = getInvoiceTaskInputFieldByCode('dueDate', invoiceTask);
  const memo = getInvoiceTaskInputFieldByCode('memo', invoiceTask);
  const smsTextMessage = getInvoiceTaskInputFieldByCode('smsTextMessage', invoiceTask);
  const amount = getInvoiceTaskInputFieldByCode('amountCents', invoiceTask) ?? '0';
  const claimId = getInvoiceTaskInputFieldByCode('claimId', invoiceTask);
  const finalizationDate = getInvoiceTaskInputFieldByCode('finalizationDate', invoiceTask);
  if (isNaN(parseInt(amount))) throw new Error('Invalid amountCents value');
  return {
    dueDate,
    memo,
    smsTextMessage,
    amountCents: parseInt(amount),
    claimId,
    finalizationDate,
  };
}

function getInvoiceTaskInputFieldByCode(code: keyof InvoiceTaskInput, task: Task): string | undefined {
  return task.input?.find(
    (input) =>
      input.type.coding?.find((type) => type.system === ottehrCodeSystemUrl('invoice-task-input') && type.code === code)
  )?.valueString;
}
