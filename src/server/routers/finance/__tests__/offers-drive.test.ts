import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { Offer } from '../../../models/Offer';
import { offerDriveQueue } from '../../../jobs/queue';
import { offersDriveRouter } from '../offers-drive';

vi.mock('../../../models/Offer');
vi.mock('../../../jobs/queue', () => ({ offerDriveQueue: { add: vi.fn(), getJob: vi.fn() } }));

const ctx = { user: { userId: 'u1', email: 'a@bumbleflies.de', role: 'admin' as const }, accessToken: 'ya29.x' };
const caller = () => offersDriveRouter.createCaller(ctx as any);

beforeEach(() => vi.clearAllMocks());

describe('offersDrive.fileOfferInDrive', () => {
  it('rejects when offer is not draft', async () => {
    vi.mocked(Offer.findById).mockResolvedValue({ status: 'sent' } as any);
    await expect(caller().fileOfferInDrive({ offerId: 'o1', driveFolderId: 'f1' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects when no Google token', async () => {
    vi.mocked(Offer.findById).mockResolvedValue({ status: 'draft', save: vi.fn() } as any);
    const noTokenCaller = offersDriveRouter.createCaller({ user: ctx.user } as any);
    await expect(noTokenCaller.fileOfferInDrive({ offerId: 'o1', driveFolderId: 'f1' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('queues a job with { offerId, driveFolderId } and sets status sending', async () => {
    const save = vi.fn();
    vi.mocked(Offer.findById).mockResolvedValue({ status: 'draft', save } as any);
    vi.mocked(offerDriveQueue.add as any).mockResolvedValue({ id: 7 });
    const res = await caller().fileOfferInDrive({ offerId: 'o1', driveFolderId: 'f1' });
    expect(offerDriveQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'o1', driveFolderId: 'f1', accessToken: 'ya29.x' }),
      expect.any(Object)
    );
    expect(res.status).toBe('queued');
  });
});
