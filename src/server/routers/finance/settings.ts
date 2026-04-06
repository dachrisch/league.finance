import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { UpdateFinancialSettingsSchema } from '../../../../shared/schemas/financialSettings';
import { FinancialSettings, getOrCreateSettings } from '../../models/FinancialSettings';

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
      await FinancialSettings.updateOne(
        {},
        {
          $set: {
            defaultRatePerTeamSeason: input.defaultRatePerTeamSeason,
            defaultRatePerTeamGameday: input.defaultRatePerTeamGameday,
          },
        },
        { upsert: true }
      );
      return {
        defaultRatePerTeamSeason: input.defaultRatePerTeamSeason,
        defaultRatePerTeamGameday: input.defaultRatePerTeamGameday,
      };
    }),
});
