export function buildLineDescriptions(leagueNames: string[], seasonName: string): string[] {
  return leagueNames.map((name, i) =>
    i === 0 ? `LeagueSphere App Saison ${seasonName} - ${name}` : name
  );
}
