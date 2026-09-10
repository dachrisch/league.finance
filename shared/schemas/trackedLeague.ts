import { z } from 'zod';

export const TrackedLeagueStatusSchema = z.enum([
  'lead',
  'contacted',
  'offer_in_progress',
  'rejected_pre_offer',
  'closed_historical',
]);

export const CreateTrackedLeagueSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  contactId: z.string().min(1).nullable().optional(),
  name: z.string().min(1, 'Name is required').max(255).trim(),
  year: z.number().int().min(2000).max(2100),
  isYouth: z.boolean(),
  estimatedTeamsCount: z.string().max(100).nullable().optional(),
  estimatedGamedaysCount: z.string().max(100).nullable().optional(),
  comment: z.string().max(2000).optional().default(''),
  status: TrackedLeagueStatusSchema.default('lead'),
});

export const UpdateTrackedLeagueSchema = CreateTrackedLeagueSchema.partial().extend({
  comment: z.string().max(2000).optional(),
  status: TrackedLeagueStatusSchema.optional(),
  leaguesphereLeagueId: z.number().int().positive().nullable().optional(),
  linkedOfferId: z.string().nullable().optional(),
});

export const TrackedLeagueSchema = CreateTrackedLeagueSchema.extend({
  _id: z.string(),
  leaguesphereLeagueId: z.number().nullable(),
  linkedOfferId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TrackedLeagueStatus = z.infer<typeof TrackedLeagueStatusSchema>;
export type CreateTrackedLeagueInput = z.infer<typeof CreateTrackedLeagueSchema>;
export type UpdateTrackedLeagueInput = z.infer<typeof UpdateTrackedLeagueSchema>;
export type TrackedLeague = z.infer<typeof TrackedLeagueSchema>;
