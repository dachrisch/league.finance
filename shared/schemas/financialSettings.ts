import { z } from 'zod';

export const FinancialSettingsSchema = z.object({
  defaultRatePerTeamSeason: z.number().min(0),
  defaultRatePerTeamGameday: z.number().min(0),
  defaultDriveFolderId: z.string().optional(),
});

export const UpdateFinancialSettingsSchema = FinancialSettingsSchema;
