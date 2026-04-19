
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfferCreation } from '../useOfferCreation';

describe('useOfferCreation', () => {
  it('should initialize with step1 and empty state', () => {
    const { result } = renderHook(() => useOfferCreation());

    expect(result.current.currentStep).toBe('step1');
    expect(result.current.step1.pasteInput).toBe('');
    expect(result.current.step1.isExtracting).toBe(false);
    expect(result.current.step2.selectedLeagueIds).toEqual([]);
  });

  it('should toggle league selection', () => {
    const { result } = renderHook(() => useOfferCreation());

    act(() => {
      result.current.toggleLeague('league1');
    });

    expect(result.current.step2.selectedLeagueIds).toContain('league1');

    act(() => {
      result.current.toggleLeague('league1');
    });

    expect(result.current.step2.selectedLeagueIds).not.toContain('league1');
  });

  it('should update pricing config', () => {
    const { result } = renderHook(() => useOfferCreation());

    act(() => {
      result.current.updatePricing({
        costModel: 'perGameDay',
        baseRateOverride: 75,
      });
    });

    expect(result.current.step2.pricing.costModel).toBe('perGameDay');
    expect(result.current.step2.pricing.baseRateOverride).toBe(75);
  });

  it('should navigate between steps', () => {
    const { result } = renderHook(() => useOfferCreation());

    expect(result.current.currentStep).toBe('step1');

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('step2');

    act(() => {
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe('step1');
  });

  it('should reset wizard state', () => {
    const { result } = renderHook(() => useOfferCreation());

    act(() => {
      result.current.updatePasteInput('some text');
      result.current.toggleLeague('league1');
    });

    expect(result.current.step1.pasteInput).toBe('some text');
    expect(result.current.step2.selectedLeagueIds).toContain('league1');

    act(() => {
      result.current.reset();
    });

    expect(result.current.step1.pasteInput).toBe('');
    expect(result.current.step2.selectedLeagueIds).toEqual([]);
  });

  it('should reset wizard with existing offer data', () => {
    const { result } = renderHook(() => useOfferCreation());

    const existingOffer = {
      associationId: 'assoc123',
      contactId: 'contact456',
      seasonId: 2026,
      leagueIds: [1, 2],
      financialConfigs: [
        {
          costModel: 'SEASON',
          baseRateOverride: 100,
          expectedTeamsCount: 10,
        },
      ],
    };

    act(() => {
      result.current.resetWithData(existingOffer);
    });

    expect(result.current.currentStep).toBe('step1');
    expect(result.current.step1.pathChoice).toBe('existing');
    expect(result.current.step1.selectedAssociationId).toBe('assoc123');
    expect(result.current.step1.selectedContactId).toBe('contact456');
    expect(result.current.step1.selectedSeasonId).toBe('2026');
    expect(result.current.step2.pricing.costModel).toBe('flatFee');
    expect(result.current.step2.pricing.baseRateOverride).toBe(100);
    expect(result.current.step2.selectedLeagueIds).toEqual(['1', '2']);
  });
});
