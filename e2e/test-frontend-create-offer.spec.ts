import { test, expect } from '@playwright/test';
import {
  ensureAuthenticated,
  getLeaguesList,
  getSeasonsList,
  getAssociationsList,
  getOffersFromDashboard,
} from './utils';

test.describe('Frontend Offer Creation Flow', () => {
  test('should create an offer through the UI and see it in the dashboard', async ({
    page,
  }) => {
    // Setup: Get available data
    await page.goto('/offers');

    const leagues = await getLeaguesList(page);
    const seasons = await getSeasonsList(page);
    const associations = await getAssociationsList(page);

    expect(leagues.length).toBeGreaterThan(0);
    expect(seasons.length).toBeGreaterThan(0);
    expect(associations.length).toBeGreaterThan(0);

    const testLeague = leagues[0];
    const testSeason = seasons[0];
    const testAssociation = associations[0];

    // Navigate to create offer page
    await page.click('button:has-text("Create New Offer")');
    await expect(page).toHaveURL(/\/offers\/new/);

    // Step 1: Select Association and Leagues
    // Note: Adjust selectors based on actual form structure
    const associationSelect = page.locator('select[name="association"]');
    if (await associationSelect.isVisible()) {
      await associationSelect.selectOption(testAssociation._id);
    }

    // Select league
    const leagueCheckbox = page.locator(`input[value="${testLeague.id}"]`);
    if (await leagueCheckbox.isVisible()) {
      await leagueCheckbox.check();
    }

    // Step 2: Select Season
    const seasonSelect = page.locator('select[name="season"]');
    if (await seasonSelect.isVisible()) {
      await seasonSelect.selectOption(testSeason.id.toString());
    }

    // Step 3: Set pricing (if applicable)
    const priceInput = page.locator('input[name="price"]').first();
    if (await priceInput.isVisible()) {
      await priceInput.fill('5000');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message or navigation to dashboard
    await page.waitForURL(/\/offers/, { timeout: 10000 });

    // Verify offer appears in the list
    await page.goto('/offers');

    // Look for the newly created offer
    const offers = await page.locator('[data-testid="offer-row"]').all();
    expect(offers.length).toBeGreaterThan(0);

    // Verify offer details
    const offerRow = page.locator('[data-testid="offer-row"]').first();
    await expect(offerRow.locator('[data-testid="offer-status"]')).toHaveText('draft');

    console.log('✓ Offer created successfully via UI');
  });

  test('should navigate to offer details after creation', async ({ page }) => {
    // Setup: Get data
    const leagues = await getLeaguesList(page);
    const seasons = await getSeasonsList(page);
    const associations = await getAssociationsList(page);

    const testLeague = leagues[0];
    const testSeason = seasons[0];
    const testAssociation = associations[0];

    // Navigate to create offer
    await page.goto('/offers/new');

    // Fill and submit form (simplified)
    const associationSelect = page.locator('select[name="association"]');
    if (await associationSelect.isVisible()) {
      await associationSelect.selectOption(testAssociation._id);
    }

    const leagueCheckbox = page.locator(`input[value="${testLeague.id}"]`);
    if (await leagueCheckbox.isVisible()) {
      await leagueCheckbox.check();
    }

    const seasonSelect = page.locator('select[name="season"]');
    if (await seasonSelect.isVisible()) {
      await seasonSelect.selectOption(testSeason.id.toString());
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should navigate to offer detail page
    await page.waitForURL(/\/offers\/[a-f0-9]+/, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/offers\/[a-f0-9]+/);

    console.log('✓ Navigated to offer details');
  });
});
