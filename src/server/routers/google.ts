import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../trpc';
import { DriveService } from '../services/DriveService';

export const googleRouter = router({
  listFolders: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.accessToken) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No Google OAuth access token found. Please re-login.',
      });
    }

    const driveService = new DriveService(ctx.accessToken);
    try {
      return await driveService.listFolders();
    } catch (err: any) {
      // An expired/invalid Google token surfaces as a 401 from the Drive API.
      // Map it to UNAUTHORIZED so the client can prompt a re-login instead of
      // treating it as a 500 server error.
      if (err?.status === 401 || err?.status === 403) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Google session expired. Please re-login to reconnect Google Drive.',
        });
      }
      throw err;
    }
  }),
});
