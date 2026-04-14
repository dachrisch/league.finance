import { describe, it, expect } from 'vitest';
import type { WizardState, ExtractedData } from '../types';

describe('Wizard Types', () => {
  it('should allow creating a valid WizardState', () => {
    const state: WizardState = {
      currentStep: 'step1',
      step1: {
        pathChoice: undefined,
        pasteInput: '',
        isExtracting: false,
      },
      step2: {
        pricing: {
          costModel: 'flatFee',
          expectedTeamsCount: 0,
        },
        selectedLeagueIds: [],
        leagueSearchTerm: '',
      },
    };

    expect(state.currentStep).toBe('step1');
    expect(state.step1.pasteInput).toBe('');
    expect(state.step2.selectedLeagueIds).length(0);
  });

  it('should allow partial ExtractedData', () => {
    const data: Partial<ExtractedData> = {
      organizationName: 'Test Org',
      email: 'test@example.com',
    };

    expect(data.organizationName).toBe('Test Org');
  });
});
