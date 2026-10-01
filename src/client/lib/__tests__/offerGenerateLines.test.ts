// src/client/lib/__tests__/offerGenerateLines.test.ts

import { describe, it, expect, vi } from 'vitest';
import { shouldGenerateLines } from '../offerGenerateLines';

describe('shouldGenerateLines', () => {
  it('generates directly (no confirm) when there are no existing lines', () => {
    const confirmReplace = vi.fn();
    expect(shouldGenerateLines(false, confirmReplace)).toBe(true);
    expect(confirmReplace).not.toHaveBeenCalled();
  });

  // F4: cancelling "Vorhandene Zeilen ersetzen?" must not call generateLines at all, not call
  // it with overwrite:false (which would hit the server and come back as a CONFLICT alert).
  it('F4: returns false (do not generate) when the admin cancels the replace confirmation', () => {
    expect(shouldGenerateLines(true, () => false)).toBe(false);
  });

  it('returns true when the admin confirms replacing existing lines', () => {
    expect(shouldGenerateLines(true, () => true)).toBe(true);
  });
});
