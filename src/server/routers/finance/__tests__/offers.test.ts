import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { offersRouter } from '../offers';
import { Offer } from '../../../models/Offer';
import { Contact } from '../../../models/Contact';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

describe('offersRouter.markRejected', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([Offer.deleteMany({}), Contact.deleteMany({})]);
  });

  it('sets status to rejected', async () => {
    const contact = await Contact.create({
      name: 'Michael Hanke',
      email: 'michael@afvh.de',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
    });
    const offer = await Offer.create({
      associationId: 'assoc-1',
      seasonId: 2026,
      leagueIds: [16],
      contactId: contact._id,
      status: 'sent',
    });

    const caller = offersRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.markRejected({ id: offer._id.toString() });

    expect(result.status).toBe('rejected');
    const fromDb = await Offer.findById(offer._id);
    expect(fromDb?.status).toBe('rejected');
  });

  it('throws NOT_FOUND for a missing offer', async () => {
    const caller = offersRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    await expect(
      caller.markRejected({ id: '507f1f77bcf86cd799439011' })
    ).rejects.toThrow();
  });
});
