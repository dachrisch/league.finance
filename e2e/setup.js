const { chromium } = require('@playwright/test');

/**
 * Global setup for E2E tests
 * Creates all required test preconditions
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

    // Step 2: Create test associations via direct database call
    console.log('📝 Creating test associations...');
    try {
      // Use the test API endpoint to create associations
      const associations = [
        {
          name: 'E2E Test Association 1',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Germany',
          },
        },
        {
          name: 'E2E Test Association 2',
          address: {
            street: '456 Test Avenue',
            city: 'Another City',
            postalCode: '67890',
            country: 'Germany',
          },
        },
      ];

      for (const assoc of associations) {
        try {
          // Use POST with JSON body for TRPC mutation
          const response = await page.request.post(
            'http://localhost:3000/trpc/finance.associations.create',
            {
              headers: {
                'Content-Type': 'application/json',
              },
              data: JSON.stringify({
                input: assoc,
              }),
            }
          );

          const contentType = response.headers()['content-type'] || '';
          let result;

          if (contentType.includes('application/json')) {
            result = await response.json();
          } else {
            console.log(`  ⚠ Unexpected response type for ${assoc.name}: ${contentType}`);
            continue;
          }

          if (result.result?.data?._id) {
            console.log(`  ✓ Created association: ${assoc.name}`);
          } else if (result.error) {
            console.log(`  ⚠ Failed to create ${assoc.name}: ${result.error.message}`);
          } else {
            console.log(`  ⚠ Unexpected response for ${assoc.name}`);
          }
        } catch (error) {
          console.log(`  ⚠ Error creating association ${assoc.name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠ Failed to create associations:`, error.message);
    }
    console.log();

    // Step 3: Create test leagues in MySQL
    console.log('⚽ Creating test leagues in MySQL...');
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 's207.goserver.host',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'gamedays',
      });

      const testLeagues = [
        ['e2e-test-league-1', 'E2E Test League 1'],
        ['e2e-test-league-2', 'E2E Test League 2'],
      ];

      for (const [slug, name] of testLeagues) {
        try {
          await connection.query(
            'INSERT INTO gamedays_league (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
            [slug, name, name]
          );
          console.log(`  ✓ Created/updated league: ${name}`);
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') {
            console.log(`  ⚠ ${name}: ${err.message}`);
          } else {
            console.log(`  ✓ League already exists: ${name}`);
          }
        }
      }

      // Step 4: Create test seasons in MySQL
      console.log('📅 Creating test seasons in MySQL...');
      const testSeasons = [
        ['e2e-test-2026', '2026'],
        ['e2e-test-2025', '2025'],
      ];

      for (const [slug, name] of testSeasons) {
        try {
          await connection.query(
            'INSERT INTO gamedays_season (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
            [slug, name, name]
          );
          console.log(`  ✓ Created/updated season: ${name}`);
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') {
            console.log(`  ⚠ ${name}: ${err.message}`);
          } else {
            console.log(`  ✓ Season already exists: ${name}`);
          }
        }
      }

      await connection.end();
    } catch (error) {
      console.log(`  ⚠ Could not connect to MySQL:`, error.message);
      console.log('     Tests may skip if no leagues/seasons available');
    }
    console.log();

    // Step 5: Verify preconditions
    console.log('🔍 Verifying preconditions...');
    const assocResponse = await page.request.get('http://localhost:3000/trpc/finance.associations.list');
    const assocData = await assocResponse.json();
    const associations = assocData[0]?.result?.data || [];

    const leaguesResponse = await page.request.get('http://localhost:3000/trpc/teams.leagues');
    const leaguesData = await leaguesResponse.json();
    const leagues = leaguesData[0]?.result?.data || [];

    const seasonsResponse = await page.request.get('http://localhost:3000/trpc/teams.seasons');
    const seasonsData = await seasonsResponse.json();
    const seasons = seasonsData[0]?.result?.data || [];

    console.log(`  📊 Associations: ${associations.length} available`);
    console.log(`  ⚽ Leagues: ${leagues.length} available`);
    console.log(`  📅 Seasons: ${seasons.length} available\n`);

    if (associations.length === 0) {
      throw new Error('Failed to create/verify associations (MongoDB issue)');
    }

    if (leagues.length === 0 || seasons.length === 0) {
      console.log('⚠️  MySQL data not available - some tests may be skipped\n');
    } else {
      console.log('✅ All test preconditions ready!\n');
    }
  } catch (error) {
    console.error('\n❌ Setup failed!\n');
    console.error('Error:', error.message);
    console.error('\nMake sure:');
    console.error('  - Dev server is running (npm run dev:server)');
    console.error('  - MongoDB is running (in-memory via dev server)');
    console.error('  - MySQL is accessible at', process.env.MYSQL_HOST || 's207.goserver.host');
    console.error();
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
