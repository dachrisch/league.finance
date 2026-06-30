import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('offersDrive.getOfferDriveStatus', () => {
  it('returns status:completed, progress:100 and driveLink when offer.status is sent', async () => {
    const sentAt = new Date('2024-01-15T10:00:00Z');
    vi.mocked(Offer.findById).mockResolvedValue({
      status: 'sent',
      sentAt,
      sendJobId: 'j99',
      driveMetadata: { driveLink: 'https://drive/x' },
    } as any);
    const res = await caller().getOfferDriveStatus({ offerId: 'o1' });
    expect(res.status).toBe('completed');
    expect(res.progress).toBe(100);
    expect(res.driveLink).toBe('https://drive/x');
    expect(res.completedAt).toEqual(sentAt);
  });

  it('returns status:completed even when sendJobId is undefined on a sent offer', async () => {
    const sentAt = new Date('2024-01-15T10:00:00Z');
    vi.mocked(Offer.findById).mockResolvedValue({
      status: 'sent',
      sentAt,
      sendJobId: undefined,
      driveMetadata: { driveLink: 'https://drive/y' },
    } as any);
    const res = await caller().getOfferDriveStatus({ offerId: 'o1' });
    expect(res.status).toBe('completed');
    expect(res.progress).toBe(100);
    expect(res.driveLink).toBe('https://drive/y');
  });
});
