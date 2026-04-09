import { z } from 'zod';

export const CreateOfferSchema = z.object({
  associationId: z.number().int().positive('Association ID must be a positive integer'),
  seasonId: z.number().int().positive('Season ID must be a positive integer'),
  leagueIds: z
    .array(z.number().int().positive('League IDs must be positive integers'))
    .min(1, 'At least one league ID is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
  costModel: z.string().min(1, 'Cost model is required'),
  baseRateOverride: z.number().positive('Base rate must be positive').nullable(),
  expectedTeamsCount: z.number().int().positive('Expected teams count must be a positive integer'),
  expectedGamedaysCount: z
    .number()
    .int()
    .positive('Expected gamedays count must be a positive integer')
    .optional(),
  expectedTeamsPerGameday: z
    .number()
    .int()
    .positive('Expected teams per gameday must be a positive integer')
    .optional(),
});

export const UpdateOfferSchema = CreateOfferSchema.partial();

export const OfferSchema = CreateOfferSchema.extend({
  _id: z.string(),
  status: z.enum(['draft', 'sent', 'accepted']),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
export type Offer = z.infer<typeof OfferSchema>;
