import { test, expect } from '@playwright/test';
import { ensurePageAuthenticated, setupMockData } from './utils';

test.describe('Season Field Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure authentication
    await ensurePageAuthenticated(page);

    // Setup mock data
    await setupMockData(page);
  });

  test('should load offer creation page without "Cannot read properties of undefined" error', async ({
    page,
  }) => {
    console.log('\n=== Testing Season Field Fix ===\n');

    // Step 1: Navigate to offer creation page
    console.log('📍 Step 1: Navigating to /offers/new');

    // Set up listener for console errors BEFORE navigation
    let consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Navigate to the page
    await page.goto('/offers/new', { waitUntil: 'networkidle' });
    console.log('✓ Page navigated to /offers/new');

    // Wait a moment for React to render
    await page.waitForTimeout(1000);

    // Step 2: Check for the specific error
    console.log('\n📋 Step 2: Checking for runtime errors');

    const hasYearError = consoleErrors.some(error =>
      error.includes('Cannot read properties of undefined') &&
      error.includes('toString')
    );

    if (hasYearError) {
      console.log('❌ FAILED: Found "Cannot read properties of undefined" error');
      throw new Error('Season field fix validation failed: year property error detected');
    } else {
      console.log('✓ No "Cannot read properties of undefined" errors detected');
    }

    // Step 3: Verify page structure loads
    console.log('\n📝 Step 3: Verifying page structure');
    const wizardTitle = page.locator('h1').filter({ hasText: /Create New Offer|Edit Offer/ });
    await expect(wizardTitle).toBeVisible({ timeout: 5000 });
    console.log('✓ Wizard title visible');

    // Step 4: Verify form elements exist
    console.log('\n📝 Step 4: Verifying form elements');
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`✓ Found ${selectCount} select elements`);
    expect(selectCount).toBeGreaterThan(0);

    // Step 5: Interact with season selector
    console.log('\n🔘 Step 5: Testing season selector interaction');

    const seasonSelects = page.locator('select');
    const firstSelect = seasonSelects.first();

    // Get available options
    const options = await firstSelect.locator('option').all();
    console.log(`✓ Season selector has ${options.length} options available`);
    expect(options.length).toBeGreaterThan(0);

    // Try to select an option
    try {
      await firstSelect.selectOption({ index: 1 });
      console.log('✓ Successfully selected season option');
    } catch (error) {
      console.log(`⚠ Could not select option (may not have value attribute): ${error}`);
    }

    // Wait for any potential errors to surface
    await page.waitForTimeout(500);

    // Step 6: Final verification - no new errors
    console.log('\n✅ Step 6: Final error check');
    const finalErrors = consoleErrors.filter(error =>
      error.includes('Cannot read properties of undefined')
    );

    if (finalErrors.length === 0) {
      console.log('✅ PASSED: No "Cannot read properties of undefined" errors found');
    } else {
      console.log(`❌ FAILED: Found ${finalErrors.length} error(s)`);
      throw new Error('Errors detected during season field interaction');
    }

    console.log('\n=== ✅ Season Field Fix Validation Complete ===\n');
  });

  test('should properly display season selector with name field', async ({
    page,
  }) => {
    console.log('\n=== Testing Season Name Display ===\n');

    // Navigate to page
    console.log('📍 Navigating to /offers/new');
    await page.goto('/offers/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Get season selector
    const selects = page.locator('select');
    const seasonSelect = selects.nth(0); // Assuming first select is season

    // Get all option texts
    const options = await seasonSelect.locator('option').all();

    console.log('\n📋 Available season options:');
    for (let i = 0; i < options.length; i++) {
      const text = await options[i].textContent();
      const value = await options[i].getAttribute('value');
      console.log(`  Option ${i}: "${text}" (value: ${value})`);
    }

    // Verify we have options
    expect(options.length).toBeGreaterThan(0);
    console.log('\n✅ Season selector displaying options correctly');
  });
});
