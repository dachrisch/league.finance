const { chromium } = require('@playwright/test');

/**
 * Global setup for E2E tests
 * Creates MongoDB test data only (leagues/seasons are mocked via API)
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
    // Step 1: Authenticate via page to set cookies
    console.log('🔐 Authenticating test user...');
    await page.goto('http://localhost:3000/auth/test-token');
    await page.waitForLoadState('networkidle');

    // Verify we got auth
    const cookiesStr = (await context.cookies()).find(c => c.name === 'auth_token');
    if (!cookiesStr) {
      throw new Error('Failed to get auth token cookie');
    }
    console.log('✓ Test user authenticated\n');

    // Step 2: Verify infrastructure is ready
    // (Tests will create their own data - one test creates associations functionally, others use mocked data)
    console.log('📝 Verifying infrastructure...');

    try {
      const assocResponse = await page.request.get('http://localhost:3000/trpc/finance.associations.list');
      const assocData = await assocResponse.json();
      console.log(`  ✓ Associations API is available`);
    } catch (error) {
      throw new Error(`Associations API is not available: ${error.message}`);
    }
    console.log();

    console.log('✅ Test infrastructure ready!\n');
  } catch (error) {
    console.error('\n❌ Setup failed!\n');
    console.error('Error:', error.message);
    console.error('\nMake sure:');
    console.error('  - Dev server is running (npm run dev:server)');
    console.error('  - MongoDB is available (in-memory via dev server)');
    console.error();
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
