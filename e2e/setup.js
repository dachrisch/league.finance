const { chromium } = require('@playwright/test');
const mysql = require('mysql2/promise');

/**
 * Global setup for E2E tests
 * Creates required test data: associations, leagues, and seasons
 */
async function globalSetup() {
  console.log('🔧 Setting up test preconditions...\n');

  // Wait for server to be ready
  console.log('⏳ Waiting for server...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        serverReady = true;
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!serverReady) {
    throw new Error('Server did not start in time');
  }
  console.log('✓ Server ready\n');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating test user...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'domcontentloaded' });

    const authResponse = await page.request.get('http://localhost:3000/auth/test-token');
    if (!authResponse.ok()) {
      throw new Error(`Failed to authenticate: ${authResponse.status()}`);
    }
    console.log('✓ Test user authenticated\n');

    // Step 2: Check test preconditions
    console.log('🔍 Checking test preconditions...\n');

    const assocResponse = await page.request.get('http://localhost:3000/trpc/finance.associations.list');
    const assocData = await assocResponse.json();
    const associations = assocData[0]?.result?.data || [];

    const leaguesResponse = await page.request.get('http://localhost:3000/trpc/teams.leagues');
    const leaguesData = await leaguesResponse.json();
    const leagues = leaguesData[0]?.result?.data || [];

    const seasonsResponse = await page.request.get('http://localhost:3000/trpc/teams.seasons');
    const seasonsData = await seasonsResponse.json();
    const seasons = seasonsData[0]?.result?.data || [];

    console.log('Preconditions Status:');
    console.log(`  🏢 Associations: ${associations.length} available`);
    console.log(`  ⚽ Leagues: ${leagues.length} available`);
    console.log(`  📅 Seasons: ${seasons.length} available`);

    // Fail if preconditions are not met
    const missingData = [];
    if (associations.length === 0) missingData.push('Associations');
    if (leagues.length === 0) missingData.push('Leagues');
    if (seasons.length === 0) missingData.push('Seasons');

    if (missingData.length > 0) {
      console.log(`\n❌ Missing test data: ${missingData.join(', ')}`);
      console.log('\nTo fix:');
      if (associations.length === 0) {
        console.log('  1. Create associations:');
        console.log('     - Navigate to http://localhost:5173');
        console.log('     - Go to Settings or Admin section');
        console.log('     - Create at least one association');
      }
      if (leagues.length === 0 || seasons.length === 0) {
        console.log('  2. Database seeding:');
        console.log('     - Connect to production MySQL database');
        console.log('     - Ensure gamedays_league and gamedays_season have data');
        console.log('     - Or configure test database with sample data');
      }
      throw new Error(`Missing test preconditions: ${missingData.join(', ')}`);
    }

    console.log('\n✅ All test preconditions met!\n');
  } catch (error) {
    console.error('\n❌ Setup failed! Tests will fail because preconditions are missing.\n');
    console.error('Error:', error.message);
    console.error('\nRequired:');
    console.error('  - MySQL database (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)');
    console.error('  - MongoDB running (for associations)');
    console.error('  - Server running on port 3000\n');
    throw error; // This will cause tests to fail
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
