import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Offer } from '../Offer';
import { Contact } from '../Contact';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('Offer Model', () => {
  let contactId: string;

  beforeAll(async () => {
    await connectMongo();
    const contact = await Contact.create({
      name: 'Test Contact',
      address: {
        street: '123 Main St',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Germany',
      },
    });
    contactId = contact._id.toString();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('should create an offer with required fields', async () => {
    const doc = await Offer.create({
      associationId: 'assoc-123',
      seasonId: 2024,
      leagueIds: [1, 2, 3],
      contactId,
      status: 'draft',
    });

    expect(doc.associationId).toBe('assoc-123');
    expect(doc.seasonId).toBe(2024);
    expect(doc.leagueIds).toEqual([1, 2, 3]);
    expect(doc.status).toBe('draft');
    expect(doc.contactId.toString()).toBe(contactId);
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should update offer status to sent', async () => {
    const doc = await Offer.create({
      associationId: 456,
      seasonId: 2024,
      leagueIds: [1, 2],
      contactId,
      status: 'draft',
    });

    doc.status = 'sent';
    doc.sentAt = new Date();
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.status).toBe('sent');
    expect(updated?.sentAt).toBeDefined();
  });

  it('should update offer status to accepted', async () => {
    const doc = await Offer.create({
      associationId: 789,
      seasonId: 2025,
      leagueIds: [4, 5],
      contactId,
    });

    doc.status = 'accepted';
    doc.acceptedAt = new Date();
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.status).toBe('accepted');
    expect(updated?.acceptedAt).toBeDefined();
  });

  it('should validate status enum', async () => {
    await expect(
      Offer.create({
        associationId: 111,
        seasonId: 2024,
        leagueIds: [1],
        contactId,
        status: 'INVALID_STATUS' as any,
      })
    ).rejects.toThrow();
  });

  it('should require leagueIds to have at least 1 element', async () => {
    await expect(
      Offer.create({
        associationId: 222,
        seasonId: 2024,
        leagueIds: [],
        contactId,
      })
    ).rejects.toThrow();
  });

  it('should require contactId', async () => {
    await expect(
      Offer.create({
        associationId: 333,
        seasonId: 2024,
        leagueIds: [1],
      })
    ).rejects.toThrow();
  });

  it('should require associationId', async () => {
    await expect(
      Offer.create({
        seasonId: 2024,
        leagueIds: [1],
        contactId,
      })
    ).rejects.toThrow();
  });

  it('should require seasonId', async () => {
    await expect(
      Offer.create({
        associationId: 444,
        leagueIds: [1],
        contactId,
      })
    ).rejects.toThrow();
  });

  it('should enforce unique index for draft/sent offers', async () => {
    const doc1 = await Offer.create({
      associationId: 555,
      seasonId: 2026,
      leagueIds: [1],
      contactId,
      status: 'draft',
    });

    // Should not allow duplicate draft offer for same association-season
    await expect(
      Offer.create({
        associationId: 555,
        seasonId: 2026,
        leagueIds: [2],
        contactId,
        status: 'draft',
      })
    ).rejects.toThrow();
  });

  it('should allow new draft offer after acceptance', async () => {
    const doc1 = await Offer.create({
      associationId: 666,
      seasonId: 2026,
      leagueIds: [1],
      contactId,
      status: 'draft',
    });

    // Accept the offer
    doc1.status = 'accepted';
    doc1.acceptedAt = new Date();
    await doc1.save();

    // Should allow new draft offer for same association-season after acceptance
    const doc2 = await Offer.create({
      associationId: 666,
      seasonId: 2026,
      leagueIds: [2],
      contactId,
      status: 'draft',
    });

    expect(doc2).toBeDefined();
  });

  it('should index by associationId and status', async () => {
    const doc1 = await Offer.create({
      associationId: 777,
      seasonId: 2099,
      leagueIds: [1],
      contactId,
    });

    const doc2 = await Offer.create({
      associationId: 778,
      seasonId: 2098,
      leagueIds: [2],
      contactId,
    });

    // Query using the index
    const found = await Offer.find({ associationId: 777, status: 'draft' });
    expect(found.length).toBeGreaterThan(0);
    const foundDoc1 = found.find(d => d._id.toString() === doc1._id.toString());
    expect(foundDoc1).toBeDefined();
  });
});
