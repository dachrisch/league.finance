import { z } from 'zod';

export const CostModelSchema = z.enum(['SEASON', 'GAMEDAY']);

export const FinancialConfigSchema = z.object({
  _id: z.string(),
  leagueId: z.number(),
  seasonId: z.number(),
  costModel: CostModelSchema,
  baseRateOverride: z.number().nullable(),
  expectedTeamsCount: z.number().int().min(0),
  expectedGamedaysCount: z.number().int().min(0),
  expectedTeamsPerGameday: z.number().int().min(0),
  offerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFinancialConfigSchema = z.object({
  leagueId: z.number(),
  seasonId: z.number(),
  costModel: CostModelSchema,
  baseRateOverride: z.number().nullable().default(null),
  expectedTeamsCount: z.number().int().min(0).default(0),
  expectedGamedaysCount: z.number().int().min(0).default(0),
  expectedTeamsPerGameday: z.number().int().min(0).default(0),
  offerId: z.string().optional(),
});

export const UpdateFinancialConfigSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  customPrice: z.number().positive('Custom price must be positive').nullable(),
});
