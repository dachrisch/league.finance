import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Invoice } from '../../../models/Invoice';
import { invoiceDriveQueue } from '../../../jobs/queue';
import { invoicesDriveRouter } from '../invoices-drive';

vi.mock('../../../models/Invoice');
vi.mock('../../../jobs/queue', () => ({ invoiceDriveQueue: { add: vi.fn(), getJob: vi.fn() } }));

const ctx = { user: { userId: 'u1', email: 'a@bumbleflies.de', role: 'admin' as const }, accessToken: 'ya29.x' };
const caller = () => invoicesDriveRouter.createCaller(ctx as any);

beforeEach(() => vi.clearAllMocks());

describe('invoicesDrive.fileInvoiceInDrive', () => {
  it('rejects when invoice is not draft', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({ status: 'sent' } as any);
    await expect(caller().fileInvoiceInDrive({ invoiceId: 'i1', driveFolderId: 'f1' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects when no Google token', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({ status: 'draft', save: vi.fn() } as any);
    const noTokenCaller = invoicesDriveRouter.createCaller({ user: ctx.user } as any);
    await expect(noTokenCaller.fileInvoiceInDrive({ invoiceId: 'i1', driveFolderId: 'f1' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('queues a job with { invoiceId, driveFolderId } and stores sendJobId', async () => {
    const save = vi.fn();
    const invoice: any = { status: 'draft', save };
    vi.mocked(Invoice.findById).mockResolvedValue(invoice);
    vi.mocked(invoiceDriveQueue.add as any).mockResolvedValue({ id: 7 });
    const res = await caller().fileInvoiceInDrive({ invoiceId: 'i1', driveFolderId: 'f1' });
    expect(invoiceDriveQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'i1', driveFolderId: 'f1', accessToken: 'ya29.x' }),
      expect.any(Object)
    );
    expect(res.status).toBe('queued');
    expect(invoice.sendJobId).toBe('7');
    expect(save).toHaveBeenCalled();
  });
});

describe('invoicesDrive.getInvoiceDriveStatus', () => {
  it('returns status:completed when invoice.status is sent', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({
      status: 'sent', driveMetadata: { driveLink: 'https://drive/x', filedAt: new Date('2026-08-10') },
    } as any);
    const res = await caller().getInvoiceDriveStatus({ invoiceId: 'i1' });
    expect(res).toMatchObject({ status: 'completed', progress: 100, driveLink: 'https://drive/x' });
  });

  it('returns status:none when there is no sendJobId', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({ status: 'draft', sendJobId: undefined } as any);
    const res = await caller().getInvoiceDriveStatus({ invoiceId: 'i1' });
    expect(res).toMatchObject({ status: 'none', progress: 0 });
  });

  it('maps job state/progress to a status', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({ status: 'draft', sendJobId: '7' } as any);
    vi.mocked(invoiceDriveQueue.getJob as any).mockResolvedValue({
      getState: async () => 'active', progress: () => 55, failedReason: undefined,
    });
    const res = await caller().getInvoiceDriveStatus({ invoiceId: 'i1' });
    expect(res.status).toBe('uploading');
    expect(res.progress).toBe(55);
  });
});

describe('invoicesDrive.retryInvoiceFiling', () => {
  it('rejects when max attempts reached', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue({ status: 'draft', sendJobAttempts: 3 } as any);
    await expect(caller().retryInvoiceFiling({ invoiceId: 'i1' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('re-enqueues using the stored driveFolderId and increments attempts', async () => {
    const save = vi.fn();
    const invoice: any = { status: 'draft', sendJobAttempts: 1, driveMetadata: { driveFolderId: 'fold1' }, save };
    vi.mocked(Invoice.findById).mockResolvedValue(invoice);
    vi.mocked(invoiceDriveQueue.add as any).mockResolvedValue({ id: 9 });
    const res = await caller().retryInvoiceFiling({ invoiceId: 'i1' });
    expect(invoiceDriveQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'i1', driveFolderId: 'fold1' }),
      expect.any(Object)
    );
    expect(res.status).toBe('queued');
    expect(invoice.sendJobAttempts).toBe(2);
  });
});