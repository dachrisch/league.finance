import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';
import { resolveBaseRate, fetchMysqlData } from '../../lib/financeDataFetcher';

export const calculateRouter = router({
  forConfig: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const config = await FinancialConfig.findById(input.configId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const settings = await getOrCreateSettings();
      const discounts = await Discount.find({ configId: input.configId }).lean();
      const discountInputs = discounts.map((d) => ({
        type: d.type as 'FIXED' | 'PERCENT',
        value: d.value,
      }));

      const baseRate = resolveBaseRate(config, settings);
      const { teams, participation } = await fetchMysqlData(pool, config);

      return calculateCosts({
        costModel: config.costModel,
        baseRate,
        teams,
        participation,
        discounts: discountInputs,
        expectedTeamsCount: config.expectedTeamsCount,
        expectedGamedaysCount: config.expectedGamedaysCount,
        expectedTeamsPerGameday: config.expectedTeamsPerGameday,
      });
    }),
});
