import { router, protectedProcedure } from '../trpc';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
});
