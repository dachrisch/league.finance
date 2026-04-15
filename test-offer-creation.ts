import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Contact } from './src/server/models/Contact';
import { Association } from './src/server/models/Association';
import { Season } from './src/server/models/Season';
import { Offer } from './src/server/models/Offer';
import { connectMongo, disconnectMongo } from './src/server/db/mongo';
import { appRouter } from './src/server/routers/index';
import { createInnerTRPCContext } from './src/server/trpc';

describe('E2E: Complete Offer Creation Flow', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  it('should create a complete offer from Step 1 data through Step 2', async () => {
    // Setup: Create test data
    const association = await Association.create({
      name: 'Bundesliga GmbH',
      address: {
        street: 'Arenastrasse 1',
        city: 'München',
        postalCode: '80939',
        country: 'Germany',
      },
    });

    const contact = await Contact.create({
      name: 'Max Mueller',
      email: 'max@bundesliga.de',
      address: {
        street: 'Arenastrasse 1',
        city: 'München',
        postalCode: '80939',
        country: 'Germany',
      },
    });

    const season = await Season.create({ year: 2025 });

    // Create tRPC caller
    const ctx = createInnerTRPCContext({
      user: { id: 'test-user', email: 'admin@example.com', role: 'admin' },
    });
    const caller = appRouter.createCaller(ctx);

    // STEP 1 & 2: Create offer with all required data
    const offerData = {
      associationId: association._id.toString(),
      contactId: contact._id.toString(),
      seasonId: season._id.toString(),
      costModel: 'flatFee' as const,
      expectedTeamsCount: 10,
      baseRateOverride: 100,
      leagueIds: ['league-1', 'league-2', 'league-3'],
    };

    const result = await caller.finance.offers.create(offerData);

    // Verify offer was created
    expect(result._id).toBeDefined();
    expect(result.associationId).toBe(association._id.toString());
    expect(result.contactId).toBe(contact._id.toString());

    // Verify offer appears in list
    const offers = await caller.finance.offers.list.query();
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.some(o => o._id.toString() === result._id.toString())).toBe(true);

    console.log('✅ Offer created successfully:', result._id);
  });
});
