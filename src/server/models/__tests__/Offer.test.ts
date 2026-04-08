import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Offer } from '../Offer';
import { Association } from '../Association';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('Offer Model', () => {
  let associationId: string;

  beforeAll(async () => {
    await connectMongo();
    const association = await Association.create({
      name: 'Test Association',
      description: 'For testing offers',
      email: 'test@association.local',
      phone: '555-1234',
    });
    associationId = association._id.toString();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('should create an offer with required fields', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [1, 2, 3],
      status: 'DRAFT',
    });

    expect(doc.associationId.toString()).toBe(associationId);
    expect(doc.seasonId).toBe(2024);
    expect(doc.selectedLeagueIds).toEqual([1, 2, 3]);
    expect(doc.status).toBe('DRAFT');
    expect(doc.driveFileId).toBeNull();
    expect(doc.sentTo).toEqual([]);
    expect(doc.notes).toBe('');
    expect(doc.sentAt).toBeNull();
    expect(doc.viewedAt).toBeNull();
    expect(doc.completedAt).toBeNull();
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should update offer status', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [1, 2],
      status: 'DRAFT',
    });

    doc.status = 'SENT';
    doc.sentAt = new Date();
    doc.sentTo.push({ email: 'contact@association.local', sentAt: new Date() });
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.status).toBe('SENT');
    expect(updated?.sentAt).toBeDefined();
    expect(updated?.sentTo.length).toBe(1);
    expect(updated?.sentTo[0].email).toBe('contact@association.local');
  });

  it('should track multiple sentTo entries', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2025,
      selectedLeagueIds: [4, 5],
    });

    doc.sentTo.push(
      { email: 'email1@test.local', sentAt: new Date() },
      { email: 'email2@test.local', sentAt: new Date() }
    );
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.sentTo.length).toBe(2);
    expect(updated?.sentTo[0].email).toBe('email1@test.local');
    expect(updated?.sentTo[1].email).toBe('email2@test.local');
  });

  it('should allow custom notes', async () => {
    const notes = 'Custom pricing applied due to early commitment';
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [1],
      notes,
    });

    expect(doc.notes).toBe(notes);
  });

  it('should allow setting driveFileId', async () => {
    const driveFileId = 'file_abc123def456';
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [1],
      driveFileId,
    });

    expect(doc.driveFileId).toBe(driveFileId);
  });

  it('should track offer completion dates', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [1],
    });

    const viewDate = new Date();
    const completeDate = new Date();

    doc.viewedAt = viewDate;
    doc.completedAt = completeDate;
    doc.status = 'ACCEPTED';
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.viewedAt?.getTime()).toBe(viewDate.getTime());
    expect(updated?.completedAt?.getTime()).toBe(completeDate.getTime());
    expect(updated?.status).toBe('ACCEPTED');
  });

  it('should allow empty selectedLeagueIds', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2024,
      selectedLeagueIds: [],
    });

    expect(doc.selectedLeagueIds).toEqual([]);
  });

  it('should require associationId', async () => {
    await expect(
      Offer.create({
        seasonId: 2024,
        selectedLeagueIds: [1],
      })
    ).rejects.toThrow();
  });

  it('should require seasonId', async () => {
    await expect(
      Offer.create({
        associationId,
        selectedLeagueIds: [1],
      })
    ).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    await expect(
      Offer.create({
        associationId,
        seasonId: 2024,
        selectedLeagueIds: [1],
        status: 'INVALID_STATUS' as any,
      })
    ).rejects.toThrow();
  });

  it('should index by associationId and seasonId', async () => {
    const doc1 = await Offer.create({
      associationId,
      seasonId: 2099,
      selectedLeagueIds: [1],
    });

    const doc2 = await Offer.create({
      associationId,
      seasonId: 2098,
      selectedLeagueIds: [2],
    });

    // Query using the index
    const found = await Offer.find({ associationId, seasonId: 2099 });
    expect(found.length).toBeGreaterThan(0);
    const foundDoc1 = found.find(d => d._id.toString() === doc1._id.toString());
    expect(foundDoc1).toBeDefined();
  });
});
