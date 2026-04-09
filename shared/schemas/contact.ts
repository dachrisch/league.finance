import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

export const CreateContactSchema = z.object({
  name: z.string().min(1),
  address: AddressSchema,
});

export const UpdateContactSchema = CreateContactSchema.partial();

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
