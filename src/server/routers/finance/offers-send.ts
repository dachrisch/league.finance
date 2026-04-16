import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from '../../trpc';
import { Offer } from '../../models/Offer';
import { offerSendQueue } from '../../jobs/queue';
import { Contact } from '../../models/Contact';

export const offersSendRouter = router({
  sendOffer: adminProcedure
    .input(
      z.object({
        offerId: z.string().min(1),
        driveFolderId: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { offerId, driveFolderId } = input;

      // Fetch offer
      const offer = await Offer.findById(offerId);
      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Offer not found',
        });
      }

      // Only draft offers can be sent
      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft offers can be sent',
        });
      }

      // Fetch contact for email
      const contact = await Contact.findById(offer.contactId);
      if (!contact) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contact not found',
        });
      }

      // Get user's access token from context
      const accessToken = ctx.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No Google OAuth access token found',
        });
      }

      // Queue job
      const job = await offerSendQueue.add(
        {
          offerId,
          userId: ctx.user.userId,
          driveFolderId,
          recipientEmail: contact.email,
          accessToken,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      // Update offer status to 'sending'
      offer.status = 'sending';
      offer.sendJobId = job.id?.toString();
      await offer.save();

      return {
        jobId: job.id?.toString(),
        status: 'queued',
        estimatedTime: 30000,
      };
    }),

  getOfferSendStatus: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Offer not found',
        });
      }

      if (!offer.sendJobId) {
        return {
          jobId: undefined,
          status: 'none' as const,
          progress: 0,
        };
      }

      // Fetch job from queue
      const job = await offerSendQueue.getJob(offer.sendJobId);
      if (!job) {
        return {
          jobId: offer.sendJobId,
          status: 'none' as const,
          progress: 0,
        };
      }

      const state = await job.getState();
      const progress = (job.progress() as number) || 0;

      let status: 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed' =
        'pending';

      if (state === 'completed') {
        status = 'completed';
      } else if (state === 'failed') {
        status = 'failed';
      } else if (progress > 65) {
        status = 'sending-email';
      } else if (progress > 40) {
        status = 'uploading';
      } else if (progress > 10) {
        status = 'generating-pdf';
      }

      return {
        jobId: offer.sendJobId,
        status,
        progress: Math.min(progress, 100),
        error: job.failedReason,
        driveLink: offer.emailMetadata?.driveLink,
        completedAt: offer.sentAt,
      };
    }),

  retryOfferSend: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Offer not found',
        });
      }

      // Only failed draft offers can retry
      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft offers can be retried',
        });
      }

      if ((offer.sendJobAttempts || 0) >= 3) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Maximum retry attempts reached',
        });
      }

      const contact = await Contact.findById(offer.contactId);
      if (!contact) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contact not found',
        });
      }

      const accessToken = ctx.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No Google OAuth access token found',
        });
      }

      const driveFolderId = offer.emailMetadata?.driveFolderId;
      if (!driveFolderId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Drive folder information found',
        });
      }

      // Queue new job
      const job = await offerSendQueue.add(
        {
          offerId: input.offerId,
          userId: ctx.user.userId,
          driveFolderId,
          recipientEmail: contact.email,
          accessToken,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      offer.status = 'sending';
      offer.sendJobId = job.id?.toString();
      offer.sendJobAttempts = (offer.sendJobAttempts || 0) + 1;
      await offer.save();

      return {
        jobId: job.id?.toString(),
        status: 'queued',
      };
    }),
});
