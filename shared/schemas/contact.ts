import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required').max(255).trim(),
  city: z.string().min(1, 'City is required').max(255).trim(),
  postalCode: z.string().min(1, 'Postal code is required').max(255).trim(),
  country: z.string().min(1, 'Country is required').max(255).trim(),
});

export const CreateContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  address: AddressSchema,
});

export const UpdateContactSchema = CreateContactSchema.partial();

export const ContactSchema = CreateContactSchema.extend({
  _id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type Contact = z.infer<typeof ContactSchema>;
