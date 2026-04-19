import { beforeAll, afterAll, vi } from 'vitest';
import { connectMongo, disconnectMongo } from '../server/db/mongo';

// CRITICAL: Block all MySQL pool access in tests to prevent accidental production DB writes.
// Tests must explicitly mock getMysqlPool() if they need MySQL data.
vi.mock('../server/db/mysql', () => ({
  getMysqlPool: () => {
    throw new Error(
      'Tests must not access production MySQL. ' +
      'Mock getMysqlPool() explicitly in your test using: ' +
      'vi.mocked(getMysqlPool).mockReturnValueOnce(mockPool)'
    );
  }
}));

// Connect to MongoDB before all tests (gracefully handle errors)
beforeAll(async () => {
  try {
    await connectMongo();
  } catch (err: any) {
    console.warn('Failed to connect to MongoDB for tests:', err.message);
    // Continue anyway - some tests don't need the database
  }
});

// Disconnect from MongoDB after all tests
afterAll(async () => {
  try {
    await disconnectMongo();
  } catch (err: any) {
    // Ignore disconnect errors
  }
});
