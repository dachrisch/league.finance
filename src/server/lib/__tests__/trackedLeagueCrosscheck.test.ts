import { describe, it, expect } from 'vitest';
import { matchLeaguesphereCandidates } from '../trackedLeagueCrosscheck';

describe('matchLeaguesphereCandidates', () => {
  const leagues = [
    { _id: 1, name: 'Regionalliga Hessen' },
    { _id: 2, name: 'U16 Hessen' },
    { _id: 3, name: 'Bayernliga' },
  ];

  it('returns an exact case-insensitive match first', () => {
    const result = matchLeaguesphereCandidates('regionalliga hessen', leagues);
    expect(result).toEqual([{ leaguesphereLeagueId: 1, name: 'Regionalliga Hessen', confidence: 'exact' }]);
  });

  it('falls back to a substring match when there is no exact match', () => {
    const result = matchLeaguesphereCandidates('Hessen', leagues);
    expect(result.map((c) => c.leaguesphereLeagueId).sort()).toEqual([1, 2]);
    expect(result.every((c) => c.confidence === 'partial')).toBe(true);
  });

  it('returns an empty array when nothing matches', () => {
    const result = matchLeaguesphereCandidates('Oberliga NRW', leagues);
    expect(result).toEqual([]);
  });

  it('caps partial matches at 3 candidates', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ _id: i, name: `Test League ${i}` }));
    const result = matchLeaguesphereCandidates('Test League', many);
    expect(result).toHaveLength(3);
  });
});
