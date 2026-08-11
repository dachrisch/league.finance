import { z } from 'zod';

export const ChosenSourceSchema = z.enum(['offer', 'live', 'custom']);
export const InvoiceStatusSchema = z.enum(['draft', 'sent', 'paid']);

export const InvoiceDiscountSchema = z.object({
  type: z.enum(['FIXED', 'PERCENT']),
  value: z.number().positive(),
  description: z.string().default(''),
});

export const InvoiceLineInputSchema = z.object({
  leagueId: z.number().int().positive(),
  chosenSource: ChosenSourceSchema,
  customPrice: z.number().positive().nullable().optional(),
});

export const CreateInvoiceSchema = z.object({
  offerId: z.string().min(1),
  lines: z.array(InvoiceLineInputSchema).min(1, 'At least one league required'),
  discount: InvoiceDiscountSchema.nullable().optional(),
});

export type ChosenSource = z.infer<typeof ChosenSourceSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type InvoiceDiscountInput = z.infer<typeof InvoiceDiscountSchema>;
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
