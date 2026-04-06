import { describe, it, expect, beforeEach } from 'vitest';
import { getHealthResponse, setDbStatus } from '../health';

describe('health', () => {
  beforeEach(() => setDbStatus('disconnected'));

  it('returns status ok with db disconnected by default', () => {
    expect(getHealthResponse()).toEqual({ status: 'ok', db: 'disconnected' });
  });

  it('returns db connected after setDbStatus connected', () => {
    setDbStatus('connected');
    expect(getHealthResponse()).toEqual({ status: 'ok', db: 'connected' });
  });
});
