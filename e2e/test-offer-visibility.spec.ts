import { test, expect } from '@playwright/test';
import { ensurePageAuthenticated } from './utils';

test.describe('Offer Visibility Bug Fix', () => {
  test.beforeEach(async ({ page }) => {
    await ensurePageAuthenticated(page);
  });

  test('Draft offers created via API should appear in Dashboard Active Contracts', async ({
    page,
  }) => {
    // Step 1: Seed test data
    console.log('🌱 Seeding test data...');
    const seedResponse = await page.request.post('/trpc/finance.testData.seedTestData', {
      data: JSON.stringify({ 0: { json: {} } })
    });
    const seedResult = await seedResponse.json();
    console.log('✓ Test data seeded');

    // Step 2: Get test data (associations, leagues, seasons)
    console.log('\n📋 Fetching test data...');
    const [assocResponse, leaguesResponse, seasonsResponse] = await Promise.all([
      page.request.get('/trpc/finance.associations.list'),
      page.request.get('/trpc/teams.leagues'),
      page.request.get('/trpc/teams.seasons')
    ]);

    const assocData = await assocResponse.json();
    const leaguesData = await leaguesResponse.json();
    const seasonsData = await seasonsResponse.json();

    console.log('Seasons data:', JSON.stringify(seasonsData, null, 2));

    const association = Array.isArray(assocData) ? assocData[0]?.result?.data?.[0] : assocData?.result?.data?.[0];
    const leagues = Array.isArray(leaguesData) ? leaguesData[0]?.result?.data : leaguesData?.result?.data;
    const seasons = Array.isArray(seasonsData) ? seasonsData[0]?.result?.data : seasonsData?.result?.data;

    if (!association?._id || !leagues?.[0]?.id || !seasons?.[0]) {
      console.error('Missing data:', {
        assoc: !!association?._id,
        leagues: !!leagues?.[0]?.id,
        seasons: !!seasons?.[0]
      });
      throw new Error('Failed to fetch test data');
    }

    console.log(`✓ Association: ${association.name}`);
    console.log(`✓ League: ${leagues[0].name}`);
    console.log(`✓ Season:`, seasons[0]);

    // Step 3: Create an offer via API
    console.log('\n📝 Creating test offer via API...');
    const offerResponse = await page.request.post('/trpc/finance.offers.create', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        0: {
          json: {
            associationId: association._id,
            contactId: association._id, // Using association ID as placeholder for contact
            seasonId: seasons[0]._id || seasons[0].id,
            leagueIds: [leagues[0].id],
            costModel: 'flatFee',
            expectedTeamsCount: 10
          }
        }
      })
    });

    const offerResult = await offerResponse.json();
    const offer = Array.isArray(offerResult) ? offerResult[0]?.result?.data : offerResult?.result?.data;

    if (!offer?._id) {
      console.error('Offer creation response:', JSON.stringify(offerResult));
      throw new Error('Failed to create test offer');
    }

    console.log(`✓ Offer created: ${offer._id} (status: ${offer.status})`);

    // Step 4: Navigate to Offers page and verify offer exists
    console.log('\n📍 Verifying offer in Offers page...');
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');

    // Check that the offer count increased
    const offersCard = page.locator('text=TOTAL OFFERS').first();
    const offersCountText = await offersCard.locator('..').locator('..').textContent();
    const offersCount = offersCountText?.match(/(\d+)/)?.[1] || '0';
    console.log(`✓ Offers page shows: ${offersCount} total offers`);
    expect(parseInt(offersCount)).toBeGreaterThan(0);

    // Step 5: Navigate to Dashboard and verify offer appears in Active Contracts
    console.log('\n📊 Checking Dashboard Active Contracts...');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get Active Contracts count
    const activeContractsCard = page.locator('text=Active Contracts').first();
    const activeContractsText = await activeContractsCard.locator('..').locator('..').textContent();
    const activeContractsCount = activeContractsText?.match(/(\d+)/)?.[1] || '0';

    console.log(`✓ Dashboard Active Contracts: ${activeContractsCount} leagues`);

    // BUG FIX VALIDATION: Offer should now appear in Active Contracts
    expect(parseInt(activeContractsCount)).toBeGreaterThan(0);
    expect(parseInt(activeContractsCount)).toBe(parseInt(offersCount),
      `Dashboard Active Contracts (${activeContractsCount}) should match Total Offers (${offersCount})`
    );

    console.log('\n✅ BUG FIXED: Offers now appear in Dashboard Active Contracts!');
  });
});
