import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { UpdateFinancialSettingsSchema } from '../../../../shared/schemas/financialSettings';
import { FinancialSettings, getOrCreateSettings } from '../../models/FinancialSettings';

export const settingsRouter = router({
  get: protectedProcedure.query(async () => {
    const settings = await getOrCreateSettings();
    return {
      defaultRatePerTeamSeason: settings.defaultRatePerTeamSeason,
      defaultRatePerTeamGameday: settings.defaultRatePerTeamGameday,
      defaultDriveFolderId: settings.defaultDriveFolderId,
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
            defaultDriveFolderId: input.defaultDriveFolderId,
          },
        },
        { upsert: true }
      );
      return {
        defaultRatePerTeamSeason: input.defaultRatePerTeamSeason,
        defaultRatePerTeamGameday: input.defaultRatePerTeamGameday,
        defaultDriveFolderId: input.defaultDriveFolderId,
      };
    }),
});
