export interface LeaguesphereLeagueOption {
  _id: number;
  name: string;
}

export interface CrosscheckCandidate {
  leaguesphereLeagueId: number;
  name: string;
  confidence: 'exact' | 'partial';
}

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Name-matches a TrackedLeague against real leaguesphere leagues for the
 * same association+season. Computed on read — nothing here is persisted.
 */
export function matchLeaguesphereCandidates(
  trackedLeagueName: string,
  leaguesphereLeagues: LeaguesphereLeagueOption[]
): CrosscheckCandidate[] {
  const target = normalize(trackedLeagueName);

  const exact = leaguesphereLeagues.filter((l) => normalize(l.name) === target);
  if (exact.length > 0) {
    return exact.map((l) => ({ leaguesphereLeagueId: l._id, name: l.name, confidence: 'exact' as const }));
  }

  const partial = leaguesphereLeagues.filter((l) => {
    const n = normalize(l.name);
    return n.includes(target) || target.includes(n);
  });

  return partial.slice(0, 3).map((l) => ({ leaguesphereLeagueId: l._id, name: l.name, confidence: 'partial' as const }));
}
