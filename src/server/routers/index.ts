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
import { offersSendRouter } from './finance/offers-send';
import { contactsRouter } from './finance/contacts';
import { leaguesRouter } from './finance/leagues';
import { seasonsRouter } from './finance/seasons';
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
    offersSend: offersSendRouter,
    contacts: contactsRouter,
    leagues: leaguesRouter,
    seasons: seasonsRouter,
  }),
});

export type AppRouter = typeof appRouter;
