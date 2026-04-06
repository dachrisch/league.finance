import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);

export const DiscountSchema = z.object({
  _id: z.string(),
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string(),
  createdAt: z.date(),
});

export const AddDiscountSchema = z.object({
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string().default(''),
});
