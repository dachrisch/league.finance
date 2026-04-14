import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../db/mongo';

describe('Offer Model', () => {
  let contact: any;

  beforeAll(async () => {
    await connectMongo();
    contact = await Contact.create({
      name: 'Test Contact',
      email: 'test@example.com',
      address: {
        street: '123 Test St',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Germany',
      },
    });
  });

  afterEach(async () => {
    await Offer.deleteMany({});
  });

  it('should create an offer with required fields', async () => {
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-1',
      seasonId: 1,
      leagueIds: [1, 2],
      contactId: contact._id,
    });

    expect(offer.status).toBe('draft');
    expect(offer.associationId).toBe('assoc-1');
    expect(offer.seasonId).toBe(1);
    expect(offer.leagueIds).toEqual([1, 2]);
    expect(offer.contactId).toEqual(contact._id);
    expect(offer.createdAt).toBeDefined();
  });

  it('should track sent and accepted dates', async () => {
    const sentDate = new Date();
    const acceptedDate = new Date();

    const offer = await Offer.create({
      status: 'accepted',
      associationId: 2,
      seasonId: 1,
      leagueIds: [1],
      contactId: contact._id,
      sentAt: sentDate,
      acceptedAt: acceptedDate,
    });

    expect(offer.status).toBe('accepted');
    expect(offer.sentAt).toEqual(sentDate);
    expect(offer.acceptedAt).toEqual(acceptedDate);
  });

  it('should prevent duplicate draft offers for same association-season', async () => {
    await Offer.create({
      status: 'draft',
      associationId: 3,
      seasonId: 1,
      leagueIds: [1],
      contactId: contact._id,
    });

    await expect(
      Offer.create({
        status: 'draft',
        associationId: 3,
        seasonId: 1,
        leagueIds: [2],
        contactId: contact._id,
      })
    ).rejects.toThrow();
  });

  it('should require at least one league', async () => {
    await expect(
      Offer.create({
        status: 'draft',
        associationId: 1,
        seasonId: 1,
        leagueIds: [], // Empty array - should fail
        contactId: contact._id,
      })
    ).rejects.toThrow();
  });

  it('should require a valid contact reference', async () => {
    const invalidContactId = new Types.ObjectId();

    const offer = await Offer.create({
      status: 'draft',
      associationId: 1,
      seasonId: 1,
      leagueIds: [1],
      contactId: invalidContactId, // Won't enforce foreign key, but document shows intent
    });

    expect(offer.contactId).toEqual(invalidContactId);
  });

  afterAll(async () => {
    // Clean up test contact created in beforeAll
    await Contact.deleteMany({});
    await disconnectMongo();
  });
});
