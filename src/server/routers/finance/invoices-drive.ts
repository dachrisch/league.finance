import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from '../../trpc';
import { Invoice } from '../../models/Invoice';
import { invoiceDriveQueue } from '../../jobs/queue';

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export const invoicesDriveRouter = router({
  fileInvoiceInDrive: adminProcedure
    .input(z.object({ invoiceId: z.string().min(1), driveFolderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const invoice = await Invoice.findById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      if (invoice.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft invoices can be filed' });
      }
      if (!ctx.accessToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No Google OAuth access token found' });
      }

      const job = await invoiceDriveQueue.add(
        {
          invoiceId: input.invoiceId,
          userId: ctx.user.userId,
          driveFolderId: input.driveFolderId,
          accessToken: ctx.accessToken,
        },
        JOB_OPTS
      );

      invoice.sendJobId = job.id?.toString();
      await invoice.save();

      return { jobId: job.id?.toString(), status: 'queued', estimatedTime: 15000 };
    }),

  getInvoiceDriveStatus: adminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input }) => {
      const invoice = await Invoice.findById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      if (invoice.status === 'sent') {
        return {
          jobId: undefined,
          status: 'completed' as const,
          progress: 100,
          driveLink: invoice.driveMetadata?.driveLink,
          completedAt: invoice.driveMetadata?.filedAt,
        };
      }
      if (!invoice.sendJobId) return { jobId: undefined, status: 'none' as const, progress: 0 };

      const job = await invoiceDriveQueue.getJob(invoice.sendJobId);
      if (!job) return { jobId: invoice.sendJobId, status: 'none' as const, progress: 0 };

      const state = await job.getState();
      const progress = (job.progress() as number) || 0;
      let status: 'none' | 'pending' | 'generating-pdf' | 'uploading' | 'completed' | 'failed' = 'pending';
      if (state === 'completed') status = 'completed';
      else if (state === 'failed') status = 'failed';
      else if (progress > 40) status = 'uploading';
      else if (progress > 10) status = 'generating-pdf';

      return {
        jobId: invoice.sendJobId,
        status,
        progress: Math.min(progress, 100),
        error: job.failedReason,
        driveLink: invoice.driveMetadata?.driveLink,
        completedAt: invoice.driveMetadata?.filedAt,
      };
    }),

  retryInvoiceFiling: adminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invoice = await Invoice.findById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      if (invoice.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft invoices can be retried' });
      }
      if ((invoice.sendJobAttempts || 0) >= 3) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum retry attempts reached' });
      }
      if (!ctx.accessToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No Google OAuth access token found' });
      }
      const driveFolderId = invoice.driveMetadata?.driveFolderId;
      if (!driveFolderId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Drive folder information found' });
      }

      const job = await invoiceDriveQueue.add(
        { invoiceId: input.invoiceId, userId: ctx.user.userId, driveFolderId, accessToken: ctx.accessToken },
        JOB_OPTS
      );

      invoice.sendJobId = job.id?.toString();
      invoice.sendJobAttempts = (invoice.sendJobAttempts || 0) + 1;
      await invoice.save();

      return { jobId: job.id?.toString(), status: 'queued' };
    }),
});
