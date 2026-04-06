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
});

export const UpdateFinancialConfigSchema = CreateFinancialConfigSchema.partial().omit({
  leagueId: true,
  seasonId: true,
});
