import { Page, BrowserContext } from '@playwright/test';

// Track authenticated contexts to avoid re-auth
const authenticatedContexts = new Set<BrowserContext>();

// Utility to ensure the page is authenticated
export async function ensurePageAuthenticated(page: Page): Promise<void> {
  const context = page.context();

  // Skip if already authenticated in this context
  if (authenticatedContexts.has(context)) {
    return;
  }

  // Call test auth endpoint to set auth cookie
  const authResponse = await page.request.get('/auth/test-token');
  if (!authResponse.ok()) {
    throw new Error('Failed to authenticate: /auth/test-token returned ' + authResponse.status());
  }

  // Mark context as authenticated
  authenticatedContexts.add(context);
}

// Utility to get auth token from backend
export async function getAuthToken(page: Page): Promise<string> {
  const response = await page.request.get('/auth/test-token');
  if (!response.ok()) {
    throw new Error('Failed to get test token');
  }
  const data = await response.json();
  return data.token;
}

// Utility to make authenticated TRPC calls
export async function callTRPC(
  page: Page,
  path: string,
  input: any = {}
) {
  // Ensure authentication is set up
  await ensurePageAuthenticated(page);

  // Make the request with credentials (cookies will be sent automatically)
  const response = await page.request.get(
    `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  // Handle TRPC batch response
  if (Array.isArray(data)) {
    if (data[0].error) {
      throw new Error(`TRPC Error: ${data[0].error.message}`);
    }
    return data[0].result?.data;
  }

  // Handle single TRPC response
  if (data.error) {
    throw new Error(`TRPC Error: ${data.error.message}`);
  }

  return data.result?.data;
}

// Wait for authentication and login if needed
export async function ensureAuthenticated(page: Page): Promise<void> {
  // Navigate to page, if we get redirected to login, we're not authenticated
  await page.goto('/dashboard');

  // Check if we're on login page
  const url = page.url();
  if (url.includes('/login')) {
    // In development, use test auth bypass or mock
    // For now, we'll assume test auth is available
    console.log('Would need to authenticate - in dev mode, using mock auth');
  }
}

// Create an offer via the API (backend creation)
export async function createOfferViaAPI(
  page: Page,
  offerData: {
    associationId: string;
    seasonId: number;
    leagueIds: number[];
  }
): Promise<any> {
  const response = await page.request.post(
    '/trpc/finance.offers.create',
    {
      data: {
        input: offerData,
      },
    }
  );

  const result = await response.json();
  if (result.error) {
    throw new Error(`Failed to create offer: ${result.error.message}`);
  }

  return result.result?.data;
}

// Get all offers from the dashboard
export async function getOffersFromDashboard(page: Page): Promise<any[]> {
  const offers = await page.locator('[data-testid="offer-row"]').all();
  const offerData = [];

  for (const offer of offers) {
    offerData.push({
      status: await offer.locator('[data-testid="offer-status"]').textContent(),
      league: await offer.locator('[data-testid="offer-league"]').textContent(),
      association: await offer.locator('[data-testid="offer-association"]').textContent(),
    });
  }

  return offerData;
}

// Get leagues list
export async function getLeaguesList(page: Page): Promise<any[]> {
  return callTRPC(page, 'teams.leagues');
}

// Get seasons list
export async function getSeasonsList(page: Page): Promise<any[]> {
  return callTRPC(page, 'teams.seasons');
}

// Get associations list
export async function getAssociationsList(page: Page): Promise<any[]> {
  return callTRPC(page, 'finance.associations.list');
}
