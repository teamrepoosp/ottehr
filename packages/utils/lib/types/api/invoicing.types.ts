import z from 'zod';
import { Secrets } from '../../secrets';

export const PrefilledInvoiceInfoSchema = z.object({
  dueDate: z.string(),
  memo: z.string().optional(),
  smsTextMessage: z.string(),
  amountCents: z.number(),
});
export type PrefilledInvoiceInfo = z.infer<typeof PrefilledInvoiceInfoSchema>;

export const UpdateInvoiceTaskZambdaInputSchema = z.object({
  taskId: z.string().uuid(),
  status: z.string(),
  prefilledInvoiceInfo: PrefilledInvoiceInfoSchema,
  userTimezone: z.string(),
});
export type UpdateInvoiceTaskZambdaInput = z.infer<typeof UpdateInvoiceTaskZambdaInputSchema>;

export type InvoiceMessagesPlaceholders = {
  'patient-full-name'?: string;
  location?: string;
  'visit-date'?: string;
  'url-to-patient-portal'?: string;
  clinic?: string;
  amount?: string;
  'due-date'?: string;
  'invoice-link'?: string;
};

export const GetInvoicesTasksZambdaInputSchema = z.object({
  count: z.number(),
  page: z.number(),
  status: z.string().optional(),
});
export const GetInvoicesTasksZambdaValidatedInputSchema = GetInvoicesTasksZambdaInputSchema.extend({
  secrets: z.custom<Secrets>().nullable(),
});

export type GetInvoicesTasksValidatedInput = z.infer<typeof GetInvoicesTasksZambdaValidatedInputSchema>;
