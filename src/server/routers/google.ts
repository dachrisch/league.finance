import { z } from 'zod';
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
    return await driveService.listFolders();
  }),
});
