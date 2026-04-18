import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app';
import { closeQueues } from '../jobs/queue';

describe('createApp', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.GOOGLE_CLIENT_ID = 'ci-test';
    process.env.GOOGLE_CLIENT_SECRET = 'ci-test';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    process.env.JWT_SECRET = 'ci-test-secret';
    // Force development mode to use mock queue in tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    try {
      await closeQueues();
    } catch (err) {
      // Ignore cleanup errors in tests
    }
  });

  it('registers routes without throwing', () => {
    expect(() => createApp()).not.toThrow();
  });
});
