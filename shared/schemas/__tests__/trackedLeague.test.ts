import { describe, it, expect } from 'vitest';
import { CreateTrackedLeagueSchema, UpdateTrackedLeagueSchema } from '../trackedLeague';

const validLeague = () => ({
  associationId: '507f1f77bcf86cd799439011',
  name: 'Regionalliga Hessen',
  year: 2026,
  isYouth: false,
});

describe('CreateTrackedLeagueSchema', () => {
  it('accepts the minimal required fields and applies defaults', () => {
    const result = CreateTrackedLeagueSchema.safeParse(validLeague());
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('lead');
    expect(result.data?.comment).toBe('');
  });

  it('rejects a missing name', () => {
    const result = CreateTrackedLeagueSchema.safeParse({ ...validLeague(), name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = CreateTrackedLeagueSchema.safeParse({ ...validLeague(), status: 'bogus' });
    expect(result.success).toBe(false);
  });

  it('accepts free-text estimate fields', () => {
    const result = CreateTrackedLeagueSchema.safeParse({
      ...validLeague(),
      estimatedTeamsCount: '~50',
      estimatedGamedaysCount: 'max. 6/Spieltag',
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateTrackedLeagueSchema', () => {
  it('accepts a partial update setting only leaguesphereLeagueId', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ leaguesphereLeagueId: 42 });
    expect(result.success).toBe(true);
  });

  it('accepts a partial update setting only linkedOfferId', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ linkedOfferId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  it('does not silently apply the status default on partial update', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ comment: 'updated' });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBeUndefined();
  });
});
