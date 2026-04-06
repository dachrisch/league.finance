import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../app';

describe('createApp', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.GOOGLE_CLIENT_ID = 'ci-test';
    process.env.GOOGLE_CLIENT_SECRET = 'ci-test';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    process.env.JWT_SECRET = 'ci-test-secret';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('registers routes without throwing in development mode', () => {
    process.env.NODE_ENV = 'development';
    expect(() => createApp()).not.toThrow();
  });

  it('registers production static routes without throwing', () => {
    process.env.NODE_ENV = 'production';
    expect(() => createApp()).not.toThrow();
  });
});
