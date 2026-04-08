import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfferLineItem } from '../OfferLineItem';
import { Offer } from '../Offer';
import { Association } from '../Association';
import { connectMongo, disconnectMongo } from '../../db/mongo';

describe('OfferLineItem Model', () => {
  let offerId: string;

  beforeAll(async () => {
    await connectMongo();
    const association = await Association.create({
      name: 'Test Association',
      description: 'For testing line items',
      email: 'test@association.local',
      phone: '555-1234',
    });

    const offer = await Offer.create({
      associationId: association._id,
      seasonId: 2024,
      selectedLeagueIds: [1, 2, 3],
    });
    offerId = offer._id.toString();
  }, 60000);

  afterAll(async () => {
    await disconnectMongo();
  });

  it('should create a line item with base price and no custom price', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 1,
      leagueName: 'Premier League',
      basePrice: 500,
    });

    expect(doc.offerId.toString()).toBe(offerId);
    expect(doc.leagueId).toBe(1);
    expect(doc.leagueName).toBe('Premier League');
    expect(doc.basePrice).toBe(500);
    expect(doc.customPrice).toBeNull();
    expect(doc.finalPrice).toBe(500);
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should calculate finalPrice as basePrice when customPrice is null', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 2,
      leagueName: 'Division One',
      basePrice: 750.50,
      customPrice: null,
    });

    expect(doc.basePrice).toBe(750.50);
    expect(doc.customPrice).toBeNull();
    expect(doc.finalPrice).toBe(750.50);
  });

  it('should calculate finalPrice as customPrice when set', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 3,
      leagueName: 'Division Two',
      basePrice: 1000,
      customPrice: 850,
    });

    expect(doc.basePrice).toBe(1000);
    expect(doc.customPrice).toBe(850);
    expect(doc.finalPrice).toBe(850);
  });

  it('should update custom price and reflect in finalPrice', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 4,
      leagueName: 'Development League',
      basePrice: 600,
      customPrice: null,
    });

    expect(doc.finalPrice).toBe(600);

    doc.customPrice = 500;
    await doc.save();

    const updated = await OfferLineItem.findById(doc._id);
    expect(updated?.finalPrice).toBe(500);
  });

  it('should allow removing custom price to revert to base', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 5,
      leagueName: 'Youth League',
      basePrice: 300,
      customPrice: 250,
    });

    expect(doc.finalPrice).toBe(250);

    doc.customPrice = null;
    await doc.save();

    const updated = await OfferLineItem.findById(doc._id);
    expect(updated?.finalPrice).toBe(300);
  });

  it('should enforce unique constraint on offerId and leagueId', async () => {
    const uniqueLeagueId = 99;

    await OfferLineItem.create({
      offerId,
      leagueId: uniqueLeagueId,
      leagueName: 'Unique League',
      basePrice: 400,
    });

    await expect(
      OfferLineItem.create({
        offerId,
        leagueId: uniqueLeagueId,
        leagueName: 'Duplicate',
        basePrice: 500,
      })
    ).rejects.toThrow();
  });

  it('should require offerId', async () => {
    await expect(
      OfferLineItem.create({
        leagueId: 1,
        leagueName: 'Test League',
        basePrice: 500,
      })
    ).rejects.toThrow();
  });

  it('should require leagueId', async () => {
    await expect(
      OfferLineItem.create({
        offerId,
        leagueName: 'Test League',
        basePrice: 500,
      })
    ).rejects.toThrow();
  });

  it('should require leagueName', async () => {
    await expect(
      OfferLineItem.create({
        offerId,
        leagueId: 1,
        basePrice: 500,
      })
    ).rejects.toThrow();
  });

  it('should require basePrice', async () => {
    await expect(
      OfferLineItem.create({
        offerId,
        leagueId: 1,
        leagueName: 'Test League',
      })
    ).rejects.toThrow();
  });

  it('should support decimal prices', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 100,
      leagueName: 'Decimal Test',
      basePrice: 299.99,
      customPrice: 249.75,
    });

    expect(doc.basePrice).toBe(299.99);
    expect(doc.customPrice).toBe(249.75);
    expect(doc.finalPrice).toBe(249.75);
  });

  it('should allow zero prices', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 101,
      leagueName: 'Free League',
      basePrice: 0,
      customPrice: null,
    });

    expect(doc.basePrice).toBe(0);
    expect(doc.finalPrice).toBe(0);
  });

  it('should allow negative custom prices (for credits/discounts)', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 102,
      leagueName: 'Discount League',
      basePrice: 1000,
      customPrice: -100,
    });

    expect(doc.customPrice).toBe(-100);
    expect(doc.finalPrice).toBe(-100);
  });

  it('should find line items by offerId', async () => {
    // Create multiple line items for this offer
    await OfferLineItem.create({
      offerId,
      leagueId: 110,
      leagueName: 'Test 1',
      basePrice: 100,
    });

    await OfferLineItem.create({
      offerId,
      leagueId: 111,
      leagueName: 'Test 2',
      basePrice: 200,
    });

    const found = await OfferLineItem.find({ offerId });
    expect(found.length).toBeGreaterThanOrEqual(2);
    expect(found.map(f => f.leagueId)).toContain(110);
    expect(found.map(f => f.leagueId)).toContain(111);
  });
});
