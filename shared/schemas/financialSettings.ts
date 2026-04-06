import { z } from 'zod';

export const FinancialSettingsSchema = z.object({
  defaultRatePerTeamSeason: z.number().min(0),
  defaultRatePerTeamGameday: z.number().min(0),
});

export const UpdateFinancialSettingsSchema = FinancialSettingsSchema;
