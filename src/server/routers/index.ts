import { router } from '../trpc';
import { authRouter } from './auth';
import { teamsRouter } from './teams';
import { settingsRouter } from './finance/settings';
import { configsRouter } from './finance/configs';
import { discountsRouter } from './finance/discounts';
import { dashboardRouter } from './finance/dashboard';
import { calculateRouter } from './finance/calculate';
import { associationsRouter } from './finance/associations';
import { offersRouter } from './finance/offers';
import { healthRouter } from './health';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  teams: teamsRouter,
  finance: router({
    settings: settingsRouter,
    configs: configsRouter,
    discounts: discountsRouter,
    dashboard: dashboardRouter,
    calculate: calculateRouter,
    associations: associationsRouter,
    offers: offersRouter,
  }),
});

export type AppRouter = typeof appRouter;
