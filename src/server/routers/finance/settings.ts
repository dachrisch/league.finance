import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { UpdateFinancialSettingsSchema } from '../../../../shared/schemas/financialSettings';
import { getOrCreateSettings } from '../../models/FinancialSettings';

export const settingsRouter = router({
  get: protectedProcedure.query(async () => {
    const settings = await getOrCreateSettings();
    return {
      defaultRatePerTeamSeason: settings.defaultRatePerTeamSeason,
      defaultRatePerTeamGameday: settings.defaultRatePerTeamGameday,
    };
  }),

  update: adminProcedure
    .input(UpdateFinancialSettingsSchema)
    .mutation(async ({ input }) => {
      const settings = await getOrCreateSettings();
      settings.defaultRatePerTeamSeason = input.defaultRatePerTeamSeason;
      settings.defaultRatePerTeamGameday = input.defaultRatePerTeamGameday;
      await settings.save();
      return {
        defaultRatePerTeamSeason: settings.defaultRatePerTeamSeason,
        defaultRatePerTeamGameday: settings.defaultRatePerTeamGameday,
      };
    }),
});
