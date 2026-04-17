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

    // Step 2: Create associations in MongoDB directly
    console.log('📝 Creating test associations...');
    try {
      const mongoose = require('mongoose');

      // Connect to MongoDB
      const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/leagues-finance';
      await mongoose.connect(mongoUrl);

      // Import the Association model
      const { Association } = require('./src/server/models/Association');

      const testAssociations = [
        {
          name: 'Test Association 1',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Germany',
          },
        },
        {
          name: 'Test Association 2',
          address: {
            street: '456 Test Avenue',
            city: 'Another City',
            postalCode: '67890',
            country: 'Germany',
          },
        },
      ];

      for (const assoc of testAssociations) {
        // Check if already exists
        const existing = await Association.findOne({ name: assoc.name });
        if (existing) {
          console.log(`  ✓ Association already exists: ${assoc.name}`);
        } else {
          await Association.create(assoc);
          console.log(`  ✓ Created association: ${assoc.name}`);
        }
      }

      await mongoose.disconnect();
    } catch (error) {
      throw new Error(`Failed to create associations: ${error.message}`);
    }
    console.log();

    // Step 3: Create leagues in MySQL
    console.log('⚽ Creating test leagues in MySQL...');
    const mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gamedays',
    });

    try {
      // Check if test leagues exist
      const [existingLeagues] = await mysqlConnection.query(
        'SELECT id FROM gamedays_league WHERE slug IN ("test-league-1", "test-league-2") LIMIT 2'
      );

      if (existingLeagues.length < 2) {
        // Create test leagues
        const leagues = [
          ['test-league-1', 'Test League 1'],
          ['test-league-2', 'Test League 2'],
        ];

        for (const [slug, name] of leagues) {
          await mysqlConnection.query(
            'INSERT IGNORE INTO gamedays_league (slug, name) VALUES (?, ?)',
            [slug, name]
          );
        }
        console.log('  ✓ Created test leagues');
      } else {
        console.log('  ✓ Test leagues already exist');
      }

      // Step 4: Create seasons in MySQL
      console.log('📅 Creating test seasons in MySQL...');
      const [existingSeasons] = await mysqlConnection.query(
        'SELECT id FROM gamedays_season WHERE slug IN ("test-2026", "test-2025") LIMIT 2'
      );

      if (existingSeasons.length < 2) {
        const seasons = [
          ['test-2026', '2026'],
          ['test-2025', '2025'],
        ];

        for (const [slug, name] of seasons) {
          await mysqlConnection.query(
            'INSERT IGNORE INTO gamedays_season (slug, name) VALUES (?, ?)',
            [slug, name]
          );
        }
        console.log('  ✓ Created test seasons');
      } else {
        console.log('  ✓ Test seasons already exist');
      }
    } finally {
      await mysqlConnection.end();
    }

    console.log('\n✅ Test preconditions ready!\n');
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
