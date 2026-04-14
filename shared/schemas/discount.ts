import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);

const percentValuePredicate = (d: { type: string; value: number }) =>
  d.type === 'FIXED' || d.value <= 100;

const percentValueError = {
  message: 'PERCENT discounts must have a value <= 100',
  path: ['value'],
} as const;

export const DiscountSchema = z.object({
  _id: z.string(),
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string(),
  createdAt: z.date(),
}).refine(percentValuePredicate, percentValueError);

export const AddDiscountSchema = z.object({
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string().default(''),
}).refine(percentValuePredicate, percentValueError);
