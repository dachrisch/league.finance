import { z } from 'zod';

export const OfferLineSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
  amount: z.number(),
  kind: z.enum(['league', 'fee', 'discount', 'optional']),
  leagueId: z.number().int().positive().optional(),
});

export const OfferLetterSchema = z.object({
  offerNumber: z.string().trim().min(1).optional(),
  offerDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  // Nullable so the client can explicitly clear a previously-saved note: `undefined`
  // keys are dropped by JSON before they reach the server, so `null` is the only way
  // to tell the server "unset this" rather than "leave it as-is" (see updateLetter).
  introNote: z.string().optional().nullable(),
  closingNote: z.string().optional().nullable(),
});

// Offer metadata only - financial config is separate
export const CreateOfferSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  seasonId: z.number().int().positive('Season ID must be positive'),
  leagueIds: z.array(z.number().int().positive()).min(1, 'At least one league required'),
  contactId: z.string().min(1, 'Contact is required'),
});

export const UpdateOfferSchema = z.object({
  status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']).optional(),
  contactId: z.string().optional(),
  leagueIds: z.array(z.number().int().positive()).min(1).optional(),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  sendJobId: z.string().optional(),
  sendJobAttempts: z.number().optional(),
  emailMetadata: z.object({
    sentVia: z.literal('gmail'),
    messageId: z.string().optional(),
    driveFileId: z.string().optional(),
    driveFolderId: z.string().optional(),
    driveLink: z.string().optional(),
    recipientEmail: z.string().email(),
    sentAt: z.date(),
    lastSendAttempt: z.date().optional(),
    failureReason: z.string().optional(),
  }).optional(),
});

export const OfferSchema = CreateOfferSchema.extend({
  _id: z.string(),
  status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']),
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  sendJobId: z.string().optional(),
  sendJobAttempts: z.number().optional(),
  emailMetadata: z.object({
    sentVia: z.literal('gmail'),
    messageId: z.string().optional(),
    driveFileId: z.string().optional(),
    driveFolderId: z.string().optional(),
    driveLink: z.string().optional(),
    recipientEmail: z.string().email(),
    sentAt: z.date(),
    lastSendAttempt: z.date().optional(),
    failureReason: z.string().optional(),
  }).optional(),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;
export type Offer = z.infer<typeof OfferSchema>;
