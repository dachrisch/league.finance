const { chromium } = require('@playwright/test');

/**
 * Global setup for E2E tests
 * Checks for required test data availability
 */
async function globalSetup() {
  console.log('🔧 Checking test data...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to establish session and get auth token
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'domcontentloaded' });

    // Get auth token
    const authResponse = await page.request.get('http://localhost:3000/auth/test-token');
    if (!authResponse.ok()) {
      throw new Error(`Failed to authenticate: ${authResponse.status()}`);
    }

    console.log('✓ Test authentication working');

    // Check for required data
    const leaguesResponse = await page.request.get('http://localhost:3000/trpc/teams.leagues');
    const leaguesData = await leaguesResponse.json();
    const leagues = leaguesData[0]?.result?.data || [];

    const seasonsResponse = await page.request.get('http://localhost:3000/trpc/teams.seasons');
    const seasonsData = await seasonsResponse.json();
    const seasons = seasonsData[0]?.result?.data || [];

    const associationsResponse = await page.request.get('http://localhost:3000/trpc/finance.associations.list');
    const associationsData = await associationsResponse.json();
    const associations = associationsData[0]?.result?.data || [];

    console.log(`\nTest Data Status:`);
    console.log(`  📊 Leagues: ${leagues.length} available`);
    console.log(`  📅 Seasons: ${seasons.length} available`);
    console.log(`  🏢 Associations: ${associations.length} available\n`);

    if (associations.length === 0) {
      console.log('⚠️  No associations found. Tests will skip.');
      console.log('    Create associations via the admin UI to run full tests.\n');
    }

    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Setup check failed:', error);
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
