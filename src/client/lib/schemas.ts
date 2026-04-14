import { z } from 'zod';

// Association schemas
export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
});

export type Address = z.infer<typeof AddressSchema>;

export const AssociationInputSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  address: AddressSchema,
});

export type AssociationInput = z.infer<typeof AssociationInputSchema>;

export const AssociationSchema = AssociationInputSchema.extend({
  _id: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Association = z.infer<typeof AssociationSchema>;

// Offer schemas
export const OfferStatusSchema = z.enum(['draft', 'sent', 'accepted']);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

export const OfferLineItemSchema = z.object({
  _id: z.string(),
  offerId: z.string(),
  leagueId: z.number(),
  leagueName: z.string(),
  basePrice: z.number(),
  customPrice: z.number().nullable(),
  finalPrice: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type OfferLineItem = z.infer<typeof OfferLineItemSchema>;

export const OfferSchema = z.object({
  _id: z.string(),
  associationId: z.string(),
  seasonId: z.number(),
  leagueIds: z.array(z.number()),
  status: OfferStatusSchema,
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  sentAt: z.date().or(z.string()).nullable().optional(),
  acceptedAt: z.date().or(z.string()).nullable().optional(),
});

export type Offer = z.infer<typeof OfferSchema>;
