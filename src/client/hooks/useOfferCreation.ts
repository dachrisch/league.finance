
import { useState, useCallback } from 'react';
import type {
  WizardState,
  WizardStep,
  PathChoice,
  ExtractedData,
  DuplicateCheck,
  PricingConfig,
} from '../components/Offer/types';

const initialState: WizardState = {
  currentStep: 'step1',
  step1: {
    pathChoice: undefined,
    extractedData: undefined,
    duplicateCheck: undefined,
    selectedAssociationId: undefined,
    selectedContactId: undefined,
    selectedSeasonId: undefined,
    pasteInput: '',
    isExtracting: false,
    extractionError: undefined,
  },
  step2: {
    pricing: {
      costModel: 'flatFee',
      baseRateOverride: undefined,
      expectedTeamsCount: 0,
    },
    selectedLeagueIds: [],
    leagueSearchTerm: '',
    leagueFilterType: 'All',
  },
};

export function useOfferCreation() {
  const [state, setState] = useState<WizardState>(initialState);

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep === 'step1' ? 'step2' : 'step1',
    }));
  }, []);

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep === 'step2' ? 'step1' : 'step2',
    }));
  }, []);

  // Step 1: Paste input
  const updatePasteInput = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, pasteInput: text },
    }));
  }, []);

  // Step 1: Path selection
  const selectPath = useCallback((path: PathChoice) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, pathChoice: path },
    }));
  }, []);

  // Step 1: Extraction
  const setExtractedData = useCallback((data: ExtractedData) => {
    setState((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        extractedData: data,
        isExtracting: false,
      },
    }));
  }, []);

  const setExtracting = useCallback((isExtracting: boolean) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, isExtracting },
    }));
  }, []);

  const setExtractionError = useCallback((error: string | undefined) => {
    setState((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        extractionError: error,
        isExtracting: false,
      },
    }));
  }, []);

  // Step 1: Duplicate detection
  const setDuplicateCheck = useCallback((check: DuplicateCheck) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, duplicateCheck: check },
    }));
  }, []);

  // Step 1: Selection (existing records path)
  const selectAssociation = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, selectedAssociationId: id },
    }));
  }, []);

  const selectContact = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, selectedContactId: id },
    }));
  }, []);

  const selectSeason = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, selectedSeasonId: id },
    }));
  }, []);

  // Step 2: Pricing
  const updatePricing = useCallback((pricing: Partial<PricingConfig>) => {
    setState((prev) => ({
      ...prev,
      step2: {
        ...prev.step2,
        pricing: { ...prev.step2.pricing, ...pricing },
      },
    }));
  }, []);

  // Step 2: League selection
  const toggleLeague = useCallback((leagueId: string) => {
    setState((prev) => {
      const { selectedLeagueIds } = prev.step2;
      return {
        ...prev,
        step2: {
          ...prev.step2,
          selectedLeagueIds: selectedLeagueIds.includes(leagueId)
            ? selectedLeagueIds.filter((id) => id !== leagueId)
            : [...selectedLeagueIds, leagueId],
        },
      };
    });
  }, []);

  const setSelectedLeagues = useCallback((leagueIds: string[]) => {
    setState((prev) => ({
      ...prev,
      step2: { ...prev.step2, selectedLeagueIds: leagueIds },
    }));
  }, []);

  const updateLeagueSearch = useCallback((term: string) => {
    setState((prev) => ({
      ...prev,
      step2: { ...prev.step2, leagueSearchTerm: term },
    }));
  }, []);

  const updateLeagueFilter = useCallback(
    (filterType: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other') => {
      setState((prev) => ({
        ...prev,
        step2: { ...prev.step2, leagueFilterType: filterType },
      }));
    },
    []
  );

  // Reset wizard
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    // State
    ...state,

    // Navigation
    goToStep,
    nextStep,
    previousStep,

    // Step 1
    updatePasteInput,
    selectPath,
    setExtractedData,
    setExtracting,
    setExtractionError,
    setDuplicateCheck,
    selectAssociation,
    selectContact,
    selectSeason,

    // Step 2
    updatePricing,
    toggleLeague,
    setSelectedLeagues,
    updateLeagueSearch,
    updateLeagueFilter,

    // Utilities
    reset,
  };
}
