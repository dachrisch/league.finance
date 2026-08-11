import { describe, it, expect } from 'vitest';
import { buildLineDescriptions } from '../invoiceDescriptions';

describe('buildLineDescriptions', () => {
  it('prefixes only the first league with the app/season descriptor', () => {
    const result = buildLineDescriptions(['Regionalliga', 'Oberliga', 'U10'], '2026');
    expect(result).toEqual([
      'LeagueSphere App Saison 2026 - Regionalliga',
      'Oberliga',
      'U10',
    ]);
  });

  it('handles a single league', () => {
    expect(buildLineDescriptions(['Bayernliga'], '2025')).toEqual([
      'LeagueSphere App Saison 2025 - Bayernliga',
    ]);
  });

  it('handles an empty list', () => {
    expect(buildLineDescriptions([], '2026')).toEqual([]);
  });
});
