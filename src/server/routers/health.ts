import { router, publicProcedure } from '../trpc';
import { getHealthResponse } from '../health';

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return getHealthResponse();
  }),
});
