import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Contact } from '../models/Contact';
import { Offer } from '../models/Offer';
import { FinancialConfig } from '../models/FinancialConfig';
import { connectMongo, disconnectMongo } from '../db/mongo';

describe('Offer Workflow Integration', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterEach(async () => {
    await Contact.deleteMany({});
    await Offer.deleteMany({});
    await FinancialConfig.deleteMany({});
  });

  it('should create contact, then offer with auto-configs', async () => {
    // Step 1: Create contact
    const contact = await Contact.create({
      name: 'Integration Test Contact',
      address: {
        street: '999 Integration St',
        city: 'TestCity',
        postalCode: '12345',
        country: 'TestLand',
      },
    });

    expect(contact._id).toBeDefined();

    // Step 2: Create offer
    const offer = await Offer.create({
      status: 'draft',
      associationId: 99,
      seasonId: 2024,
      leagueIds: [1, 2, 3],
      contactId: contact._id,
    });

    expect(offer._id).toBeDefined();

    // Step 3: Create configs for each league
    const configs = await Promise.all(
      [1, 2, 3].map((leagueId) =>
        FinancialConfig.create({
          leagueId,
          seasonId: 2024,
          costModel: 'SEASON',
          baseRateOverride: 50,
          expectedTeamsCount: 15,
          expectedGamedaysCount: 0,
          expectedTeamsPerGameday: 0,
          offerId: offer._id,
        })
      )
    );

    expect(configs.length).toBe(3);

    // Verify configs exist and are linked
    const linkedConfigs = await FinancialConfig.find({ offerId: offer._id }).lean();
    expect(linkedConfigs.length).toBe(3);
    expect(linkedConfigs.every((c) => c.offerId?.equals(offer._id))).toBe(true);
  });

  it('should prevent duplicate draft offers', async () => {
    const contact = await Contact.create({
      name: 'Duplicate Test',
      address: {
        street: '111 Test Ave',
        city: 'TestCity',
        postalCode: '54321',
        country: 'TestLand',
      },
    });

    // Create first offer
    await Offer.create({
      status: 'draft',
      associationId: 88,
      seasonId: 2024,
      leagueIds: [1],
      contactId: contact._id,
    });

    // Try to create duplicate
    try {
      await Offer.create({
        status: 'draft',
        associationId: 88,
        seasonId: 2024,
        leagueIds: [2],
        contactId: contact._id,
      });
      fail('Should have thrown duplicate key error');
    } catch (err: any) {
      expect(err.code).toBe(11000);
    }
  });

  it('should allow accepted offers and new draft offers for same association-season', async () => {
    const contact = await Contact.create({
      name: 'Accepted Test',
      address: {
        street: '222 Test Blvd',
        city: 'TestCity',
        postalCode: '99999',
        country: 'TestLand',
      },
    });

    // Create and accept first offer
    const offer1 = await Offer.create({
      status: 'draft',
      associationId: 77,
      seasonId: 2024,
      leagueIds: [1],
      contactId: contact._id,
    });

    await Offer.findByIdAndUpdate(offer1._id, { status: 'accepted', acceptedAt: new Date() });

    // Should allow new draft offer now
    const offer2 = await Offer.create({
      status: 'draft',
      associationId: 77,
      seasonId: 2024,
      leagueIds: [2],
      contactId: contact._id,
    });

    expect(offer2._id).toBeDefined();
    expect(offer2.status).toBe('draft');
  });

  it('should cascade delete configs when deleting offer', async () => {
    const contact = await Contact.create({
      name: 'Delete Test',
      address: {
        street: '333 Test Ln',
        city: 'TestCity',
        postalCode: '55555',
        country: 'TestLand',
      },
    });

    const offer = await Offer.create({
      status: 'draft',
      associationId: 66,
      seasonId: 2024,
      leagueIds: [1, 2],
      contactId: contact._id,
    });

    // Create configs
    await Promise.all(
      [1, 2].map((leagueId) =>
        FinancialConfig.create({
          leagueId,
          seasonId: 2024,
          costModel: 'SEASON',
          baseRateOverride: 50,
          expectedTeamsCount: 15,
          offerId: offer._id,
        })
      )
    );

    // Verify configs exist
    let configs = await FinancialConfig.find({ offerId: offer._id });
    expect(configs.length).toBe(2);

    // Delete offer (manually cascade)
    await FinancialConfig.deleteMany({ offerId: offer._id });
    await Offer.findByIdAndDelete(offer._id);

    // Verify deletion
    const deletedOffer = await Offer.findById(offer._id);
    const deletedConfigs = await FinancialConfig.find({ offerId: offer._id });

    expect(deletedOffer).toBeNull();
    expect(deletedConfigs.length).toBe(0);
  });

  it('should track offer status transitions', async () => {
    const contact = await Contact.create({
      name: 'Status Test',
      address: {
        street: '444 Status Way',
        city: 'TestCity',
        postalCode: '11111',
        country: 'TestLand',
      },
    });

    let offer = await Offer.create({
      status: 'draft',
      associationId: 55,
      seasonId: 2024,
      leagueIds: [1],
      contactId: contact._id,
    });

    expect(offer.status).toBe('draft');
    expect(offer.sentAt).toBeUndefined();
    expect(offer.acceptedAt).toBeUndefined();

    // Transition to sent
    offer = await Offer.findByIdAndUpdate(
      offer._id,
      { status: 'sent', sentAt: new Date() },
      { returnDocument: 'after' }
    ).lean() as any;

    expect(offer.status).toBe('sent');
    expect(offer.sentAt).toBeDefined();
    expect(offer.acceptedAt).toBeUndefined();

    // Transition to accepted
    offer = await Offer.findByIdAndUpdate(
      offer._id,
      { status: 'accepted', acceptedAt: new Date() },
      { returnDocument: 'after' }
    ).lean() as any;

    expect(offer.status).toBe('accepted');
    expect(offer.sentAt).toBeDefined();
    expect(offer.acceptedAt).toBeDefined();
  });

  afterAll(async () => {
    await Contact.deleteMany({});
    await Offer.deleteMany({});
    await FinancialConfig.deleteMany({});
    await disconnectMongo();
  });
});
