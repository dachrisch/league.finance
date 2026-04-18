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

// Mock test data
const mockLeagues = [
  { id: 1, name: 'E2E Test League 1', slug: 'e2e-test-league-1', type: 'Regional' },
  { id: 2, name: 'E2E Test League 2', slug: 'e2e-test-league-2', type: 'Regional' },
];

const mockSeasons = [
  { _id: 1, year: '2026', slug: 'e2e-test-2026' },
  { _id: 2, year: '2025', slug: 'e2e-test-2025' },
];

// Track created offers for mocking
const createdOffers: any[] = [];

// Setup API mocking for test data
export async function setupMockData(page: Page): Promise<void> {
  await page.route('**/trpc/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock leagues
    if (url.includes('teams.leagues')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: mockLeagues } }]),
      });
    }

    // Mock seasons
    if (url.includes('teams.seasons')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: mockSeasons } }]),
      });
    }

    // Mock associations list
    if (url.includes('finance.associations.list')) {
      const mockAssociations = [
        { _id: '1', name: 'E2E Test Association 1', address: { street: '123 Test St', city: 'Test City', postalCode: '12345', country: 'Germany' } },
        { _id: '2', name: 'E2E Test Association 2', address: { street: '456 Test Ave', city: 'Another City', postalCode: '67890', country: 'Germany' } },
      ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: mockAssociations } }]),
      });
    }

    // Mock offer creation
    if (url.includes('finance.offers.create')) {
      try {
        const body = route.request().postDataJSON();
        const input = JSON.parse(body.input || '{}');
        const offerId = `offer-${Date.now()}-${Math.random()}`;
        const createdOffer = {
          _id: offerId,
          ...input,
          status: 'draft',
        };
        createdOffers.push(createdOffer);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ result: { data: createdOffer } }]),
        });
      } catch (e) {
        return route.continue();
      }
    }

    // Mock offer list - return created offers
    if (url.includes('finance.offers.list')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: createdOffers } }]),
      });
    }

    // Let all other requests through
    await route.continue();
  });
}

// Get mock leagues (for test setup)
export function getMockLeagues(): typeof mockLeagues {
  return mockLeagues;
}

// Get mock seasons (for test setup)
export function getMockSeasons(): typeof mockSeasons {
  return mockSeasons;
}

// Create a real test association
export async function createTestAssociation(page: Page, name: string): Promise<any> {
  // Ensure the page is authenticated
  await ensurePageAuthenticated(page);

  const assocData = {
    name,
    address: {
      street: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'Germany',
    },
  };

  const response = await page.request.post('/trpc/finance.associations.create', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      0: {
        json: assocData
      }
    }),
  });

  const result = await response.json();
  const data = Array.isArray(result) ? result[0]?.result?.data : result?.result?.data;

  if (data?._id) {
    return data;
  }

  const errorMsg = Array.isArray(result) ? result[0]?.error?.message : result?.error?.message;
  throw new Error(`Failed to create association: ${errorMsg || 'Unknown error'}`);
}
