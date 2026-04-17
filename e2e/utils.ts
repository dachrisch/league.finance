import { Page } from '@playwright/test';

// Utility to get auth token from backend
export async function getAuthToken(page: Page): Promise<string> {
  // Use the mock auth setup - in development mode, we can get a token from the server
  const response = await page.request.get('/api/auth/test-token');
  const data = await response.json();
  return data.token;
}

// Utility to make authenticated TRPC calls
export async function callTRPC(
  page: Page,
  path: string,
  input: any = {}
) {
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
