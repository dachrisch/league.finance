import { z } from 'zod';

// Offer metadata only - financial config is separate
export const CreateOfferSchema = z.object({
  associationId: z.number().int().positive('Association ID must be positive'),
  seasonId: z.number().int().positive('Season ID must be positive'),
  leagueIds: z.array(z.number().int().positive()).min(1, 'At least one league required'),
  contactId: z.string().min(1, 'Contact is required'),
});

export const UpdateOfferSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted']).optional(),
  contactId: z.string().optional(),
  leagueIds: z.array(z.number().int().positive()).min(1).optional(),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
});

export const OfferSchema = CreateOfferSchema.extend({
  _id: z.string(),
  status: z.enum(['draft', 'sent', 'accepted']),
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
export type Offer = z.infer<typeof OfferSchema>;
