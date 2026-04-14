import { Types } from 'mongoose';

export type WizardStep = 'step1' | 'step2';
export type PathChoice = 'paste' | 'existing';

export interface ExtractedData {
  organizationName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  contactName: string;
  email: string;
  phone?: string;
}

export interface DuplicateCheck {
  type: 'exact' | 'fuzzy' | 'none';
  associations?: Array<{ _id: string; name: string }>;
  contacts?: Array<{ _id: string; name: string; email: string }>;
}

export interface Step1State {
  pathChoice?: PathChoice;
  extractedData?: ExtractedData;
  duplicateCheck?: DuplicateCheck;
  selectedAssociationId?: string;
  selectedContactId?: string;
  selectedSeasonId?: string;
  pasteInput: string;
  isExtracting: boolean;
  extractionError?: string;
}

export interface PricingConfig {
  costModel: 'flatFee' | 'perGameDay';
  baseRateOverride?: number;
  expectedTeamsCount: number;
}

export interface Step2State {
  pricing: PricingConfig;
  selectedLeagueIds: string[];
  leagueSearchTerm: string;
  leagueFilterType?: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
}

export interface WizardState {
  currentStep: WizardStep;
  step1: Step1State;
  step2: Step2State;
}

export interface OfferSummary {
  associationName: string;
  contactName: string;
  seasonId: string;
  seasonYear?: string;
}
