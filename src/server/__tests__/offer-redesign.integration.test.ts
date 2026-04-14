import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Contact } from '../models/Contact';
import { Offer } from '../models/Offer';
import { FinancialConfig } from '../models/FinancialConfig';
import { connectMongo, disconnectMongo } from '../db/mongo';
import { appRouter } from '../routers/index';
import { createInnerTRPCContext } from '../trpc';

describe('Offer Redesign Integration', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterEach(async () => {
    await Contact.deleteMany({});
    await Offer.deleteMany({});
    await FinancialConfig.deleteMany({});
  });

  const ctx = createInnerTRPCContext({
    user: { id: 'test-user', email: 'admin@example.com', role: 'admin' },
  });
  const caller = appRouter.createCaller(ctx);

  it('should extract contact information from text', async () => {
    const text = 'AFCV NRW e.V.\nFabian Pawlowski\nf.pawlowski@afcvnrw.de';
    const result = await caller.finance.offers.extractContact({ text });

    expect(result.data.organizationName).toContain('AFCV NRW');
    expect(result.data.contactName).toBe('Fabian Pawlowski');
    expect(result.data.email).toBe('f.pawlowski@afcvnrw.de');
  });

  it('should create offer and configs using redesigned wizard inputs', async () => {
    // 1. Create a contact first
    const contact = await Contact.create({
      name: 'Fabian Pawlowski',
      email: 'f.pawlowski@afcvnrw.de',
      address: {
        street: 'Teststrasse 1',
        city: 'Marl',
        postalCode: '45770',
        country: 'Germany',
      },
    });

    // 2. Create offer via tRPC
    const input = {
      associationId: 'assoc-123',
      contactId: contact._id.toString(),
      seasonId: 2025,
      leagueIds: [101, 102],
      costModel: 'flatFee' as const,
      baseRateOverride: 75,
      expectedTeamsCount: 12,
    };

    const result = await caller.finance.offers.create(input);

    expect(result._id).toBeDefined();
    expect(result.associationId).toBe('assoc-123');
    
    // 3. Verify configs were created correctly
    const configs = await FinancialConfig.find({ offerId: result._id }).lean();
    expect(configs.length).toBe(2);
    expect(configs[0].costModel).toBe('SEASON');
    expect(configs[0].baseRateOverride).toBe(75);
    expect(configs[0].expectedTeamsCount).toBe(12);
    expect(configs[0].leagueId).toBe(101);
  });

  afterAll(async () => {
    await disconnectMongo();
  });
});
