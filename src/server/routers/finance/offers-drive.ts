import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from '../../trpc';
import { Offer } from '../../models/Offer';
import { FinancialConfig } from '../../models/FinancialConfig';
import { computeConfigPrices } from '../../lib/configPricing';
import { offerDriveQueue } from '../../jobs/queue';

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

/**
 * Build the offer's line items with prices resolved. Prices travel with the job
 * so the PDF renderer only formats numbers — it never calculates them.
 */
const buildPricedConfigs = async (offerId: string) => {
  const configs = await FinancialConfig.find({ offerId }).lean();
  return configs.map((config) => computeConfigPrices(config));
};

export const offersDriveRouter = router({
  fileOfferInDrive: adminProcedure
    .input(z.object({ offerId: z.string().min(1), driveFolderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
      if (offer.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft offers can be filed' });
      }
      if (!ctx.accessToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No Google OAuth access token found' });
      }

      const configs = await buildPricedConfigs(input.offerId);
      const job = await offerDriveQueue.add(
        { offerId: input.offerId, userId: ctx.user.userId, driveFolderId: input.driveFolderId, accessToken: ctx.accessToken, configs },
        JOB_OPTS
      );

      offer.status = 'sending';
      offer.sendJobId = job.id?.toString();
      await offer.save();

      return { jobId: job.id?.toString(), status: 'queued', estimatedTime: 15000 };
    }),

  getOfferDriveStatus: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
      if (offer.status === 'sent') {
        return {
          jobId: undefined,
          status: 'completed' as const,
          progress: 100,
          driveLink: offer.driveMetadata?.driveLink,
          completedAt: offer.sentAt,
        };
      }
      if (!offer.sendJobId) return { jobId: undefined, status: 'none' as const, progress: 0 };

      const job = await offerDriveQueue.getJob(offer.sendJobId);
      if (!job) return { jobId: offer.sendJobId, status: 'none' as const, progress: 0 };

      const state = await job.getState();
      const progress = (job.progress() as number) || 0;
      let status: 'none' | 'pending' | 'generating-pdf' | 'uploading' | 'completed' | 'failed' = 'pending';
      if (state === 'completed') status = 'completed';
      else if (state === 'failed') status = 'failed';
      else if (progress > 40) status = 'uploading';
      else if (progress > 10) status = 'generating-pdf';

      return {
        jobId: offer.sendJobId,
        status,
        progress: Math.min(progress, 100),
        error: job.failedReason,
        driveLink: offer.driveMetadata?.driveLink,
        completedAt: offer.sentAt,
      };
    }),

  retryOfferFiling: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
      if (offer.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft offers can be retried' });
      }
      if ((offer.sendJobAttempts || 0) >= 3) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum retry attempts reached' });
      }
      if (!ctx.accessToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No Google OAuth access token found' });
      }
      const driveFolderId = offer.driveMetadata?.driveFolderId;
      if (!driveFolderId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Drive folder information found' });
      }

      const configs = await buildPricedConfigs(input.offerId);
      const job = await offerDriveQueue.add(
        { offerId: input.offerId, userId: ctx.user.userId, driveFolderId, accessToken: ctx.accessToken, configs },
        JOB_OPTS
      );

      offer.status = 'sending';
      offer.sendJobId = job.id?.toString();
      offer.sendJobAttempts = (offer.sendJobAttempts || 0) + 1;
      await offer.save();

      return { jobId: job.id?.toString(), status: 'queued' };
    }),
});
