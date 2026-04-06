import { router } from '../trpc';
import { authRouter } from './auth';
import { teamsRouter } from './teams';
import { settingsRouter } from './finance/settings';
import { configsRouter } from './finance/configs';
import { discountsRouter } from './finance/discounts';
import { dashboardRouter } from './finance/dashboard';
import { calculateRouter } from './finance/calculate';

export const appRouter = router({
  auth: authRouter,
  teams: teamsRouter,
  finance: router({
    settings: settingsRouter,
    configs: configsRouter,
    discounts: discountsRouter,
    dashboard: dashboardRouter,
    calculate: calculateRouter,
  }),
});

export type AppRouter = typeof appRouter;
