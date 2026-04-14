# Offer Stepper Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the 2-step offer creation wizard with modernized visual design, improved UX (collapsible blocks, duplicate detection), and better league selection (search, filters, categories).

**Architecture:** Modular React component structure with custom hooks for state management and extraction logic. Step 1 handles association/contact/season selection with duplicate detection. Step 2 handles pricing configuration and multi-select league selection with search/filters. Wizard state centralized in `useOfferCreation` hook.

**Tech Stack:** React 19, TypeScript, Zod (validation), tRPC (API), Vitest (unit tests), React Router (navigation)

---

## Phase 1: Types, Schemas & Setup

### Task 1: Create wizard types and state interface

**Files:**
- Create: `src/client/components/Offer/types.ts`
- Test: `src/client/components/Offer/__tests__/types.test.ts`

- [ ] **Step 1: Create types file with wizard state interface**

```typescript
// src/client/components/Offer/types.ts

import { Types } from 'mongoose';

export type WizardStep = 'step1' | 'step2';

export type PathChoice = 'paste' | 'existing';

// Step 1 State
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

// Step 2 State
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

// Combined wizard state
export interface WizardState {
  currentStep: WizardStep;
  step1: Step1State;
  step2: Step2State;
}

// Summary for Step 2 display
export interface OfferSummary {
  associationName: string;
  contactName: string;
  seasonId: string;
  seasonYear?: string;
}
```

- [ ] **Step 2: Write integration test for types**

```typescript
// src/client/components/Offer/__tests__/types.test.ts

import { describe, it, expect } from 'vitest';
import type {
  WizardState,
  ExtractedData,
  Step1State,
  Step2State,
} from '../types';

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
```

- [ ] **Step 3: Commit types**

```bash
git add src/client/components/Offer/types.ts src/client/components/Offer/__tests__/types.test.ts
git commit -m "feat(offer-wizard): add wizard state types and interfaces"
```

---

### Task 2: Create Zod validation schemas

**Files:**
- Create: `shared/schemas/offerWizard.ts`
- Test: `shared/schemas/__tests__/offerWizard.test.ts`

- [ ] **Step 1: Create Zod schemas for extraction and offer creation**

```typescript
// shared/schemas/offerWizard.ts

import { z } from 'zod';

// Extraction input
export const ExtractTextSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters'),
});

export type ExtractTextInput = z.infer<typeof ExtractTextSchema>;

// Extracted data output
export const ExtractedDataSchema = z.object({
  organizationName: z.string(),
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  contactName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

// Duplicate check response
export const DuplicateCheckResponseSchema = z.object({
  associationMatches: z.array(
    z.object({
      _id: z.string(),
      name: z.string(),
      type: z.enum(['exact', 'fuzzy']),
    })
  ),
  contactMatches: z.array(
    z.object({
      _id: z.string(),
      name: z.string(),
      email: z.string(),
      type: z.enum(['exact']),
    })
  ),
});

export type DuplicateCheckResponse = z.infer<
  typeof DuplicateCheckResponseSchema
>;

// Step 1 submission
export const Step1SubmissionSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  contactId: z.string().min(1, 'Contact is required'),
  seasonId: z.string().min(1, 'Season is required'),
});

export type Step1Submission = z.infer<typeof Step1SubmissionSchema>;

// Step 2 submission (pricing + leagues)
export const Step2SubmissionSchema = z.object({
  costModel: z.enum(['flatFee', 'perGameDay']),
  baseRateOverride: z.number().positive().optional(),
  expectedTeamsCount: z.number().nonnegative(),
  leagueIds: z.array(z.string()).min(1, 'At least one league is required'),
});

export type Step2Submission = z.infer<typeof Step2SubmissionSchema>;

// Complete offer creation
export const CreateOfferSchema = z.object({
  associationId: z.string(),
  contactId: z.string(),
  seasonId: z.string(),
  costModel: z.enum(['flatFee', 'perGameDay']),
  baseRateOverride: z.number().positive().optional(),
  expectedTeamsCount: z.number().nonnegative(),
  leagueIds: z.array(z.string()).min(1),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
```

- [ ] **Step 2: Write schema validation tests**

```typescript
// shared/schemas/__tests__/offerWizard.test.ts

import { describe, it, expect } from 'vitest';
import {
  ExtractTextSchema,
  ExtractedDataSchema,
  Step1SubmissionSchema,
  Step2SubmissionSchema,
} from '../offerWizard';

describe('Offer Wizard Schemas', () => {
  describe('ExtractTextSchema', () => {
    it('should accept valid extraction text', () => {
      const result = ExtractTextSchema.safeParse({
        text: 'AFCV NRW e.V.\nFabian Pawlowski\nf.pawlowski@example.de',
      });
      expect(result.success).toBe(true);
    });

    it('should reject text shorter than 10 characters', () => {
      const result = ExtractTextSchema.safeParse({
        text: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ExtractedDataSchema', () => {
    it('should accept valid extracted data', () => {
      const result = ExtractedDataSchema.safeParse({
        organizationName: 'AFCV NRW e.V.',
        street: 'Halterner Straße 193',
        city: 'Marl',
        postalCode: '45770',
        country: 'Germany',
        contactName: 'Fabian Pawlowski',
        email: 'f.pawlowski@example.de',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = ExtractedDataSchema.safeParse({
        organizationName: 'AFCV NRW e.V.',
        street: 'Street',
        city: 'City',
        postalCode: '12345',
        country: 'Country',
        contactName: 'Name',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Step2SubmissionSchema', () => {
    it('should require at least one league', () => {
      const result = Step2SubmissionSchema.safeParse({
        costModel: 'flatFee',
        expectedTeamsCount: 5,
        leagueIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid step 2 submission', () => {
      const result = Step2SubmissionSchema.safeParse({
        costModel: 'perGameDay',
        baseRateOverride: 75,
        expectedTeamsCount: 5,
        leagueIds: ['league1', 'league2'],
      });
      expect(result.success).toBe(true);
    });
  });
});
```

- [ ] **Step 3: Commit schemas**

```bash
git add shared/schemas/offerWizard.ts shared/schemas/__tests__/offerWizard.test.ts
git commit -m "feat(schemas): add offer wizard validation schemas"
```

---

### Task 3: Create CSS/styling module with design system

**Files:**
- Create: `src/client/styles/OfferWizard.module.css`

- [ ] **Step 1: Create CSS module with design system variables and components**

```css
/* src/client/styles/OfferWizard.module.css */

:root {
  --color-primary: #1a1a2e;
  --color-primary-hover: #0f0f1a;
  --color-secondary: #6b7280;
  --color-success: #10b981;
  --color-success-bg: #ecfdf5;
  --color-border: #e5e7eb;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;

  --border-radius-sm: 4px;
  --border-radius-md: 6px;
  --border-radius-lg: 8px;

  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 14px;
  --font-size-xl: 15px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  --transition-normal: 150ms ease;
}

/* Container */
.wizard {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
  overflow: hidden;
}

.wizardHeader {
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wizardTitle {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0;
}

.progressIndicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
}

.progressStep {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.progressDot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-semibold);
  border: 2px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.progressDot.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.progressLabel {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.progressSeparator {
  color: var(--color-border);
}

/* Blocks */
.block {
  border-bottom: 1px solid var(--color-border);
}

.block:last-of-type {
  border-bottom: none;
}

.blockHeader {
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-normal);
  background: var(--color-bg-primary);
}

.blockHeader:hover {
  background: var(--color-bg-secondary);
}

.blockHeader.open {
  background: var(--color-bg-secondary);
}

.blockIcon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  transition: all var(--transition-normal);
}

.blockIcon.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.blockIcon.done {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success);
}

.blockIcon.badge {
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.blockText {
  flex: 1;
}

.blockTitle {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  display: block;
}

.blockSubtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  display: block;
  margin-top: var(--spacing-xs);
}

.blockChevron {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  transition: transform var(--transition-normal);
}

.blockChevron.open {
  transform: rotate(180deg);
}

/* Block body */
.blockBody {
  overflow: hidden;
  transition: max-height var(--transition-normal), opacity var(--transition-normal);
  max-height: 0;
  opacity: 0;
}

.blockBody.open {
  max-height: 1000px;
  opacity: 1;
}

.blockInner {
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-lg) calc(28px + var(--spacing-lg) + var(--spacing-lg));
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Form fields */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.fieldLabel {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.fieldInput,
.fieldSelect,
.fieldTextarea {
  font-family: inherit;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md) var(--spacing-sm);
  outline: none;
  transition: border-color var(--transition-normal);
  width: 100%;
}

.fieldInput:focus,
.fieldSelect:focus,
.fieldTextarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(26, 26, 46, 0.1);
}

.fieldInput.disabled,
.fieldSelect.disabled,
.fieldTextarea.disabled {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: not-allowed;
}

.fieldTextarea {
  resize: none;
  line-height: 1.5;
  min-height: 80px;
}

.fieldRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.fieldRow.col3 {
  grid-template-columns: 1fr 1fr 80px;
}

/* Buttons */
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all var(--transition-normal);
  text-decoration: none;
}

.buttonPrimary {
  background: var(--color-primary);
  color: white;
}

.buttonPrimary:hover:not(:disabled) {
  opacity: 0.9;
}

.buttonPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buttonGhost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.buttonGhost:hover {
  background: var(--color-bg-secondary);
}

.buttonSmall {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
}

/* Tags */
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  border: 1px solid;
  width: fit-content;
}

.tagSuccess {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success);
}

.tagInfo {
  background: #eff6ff;
  color: #0369a1;
  border-color: #bae6fd;
}

/* Footer */
.wizardFooter {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-bg-secondary);
}

.footerHint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.footerActions {
  display: flex;
  gap: var(--spacing-md);
}

/* League selector specific */
.leagueSearch {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.leagueSearchIcon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.leagueSearchInput {
  padding-left: 36px !important;
}

.leagueFilters {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.leagueFilter {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.leagueFilter.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.leagueSelectionCounter {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  font-weight: var(--font-weight-medium);
}

.leagueCounterBulkActions {
  display: flex;
  gap: var(--spacing-md);
}

.leagueCounterLink {
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.leagueCounterLink:hover {
  text-decoration: underline;
}

.leagueCategory {
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.leagueCategoryHeader {
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-bg-secondary);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.leagueCategoryHeader:hover {
  background: var(--color-bg-primary);
}

.leagueCategoryChevron {
  transition: transform var(--transition-normal);
}

.leagueCategoryChevron.open {
  transform: rotate(180deg);
}

.leagueCategoryContent {
  overflow: hidden;
  max-height: 0;
  transition: max-height var(--transition-normal);
}

.leagueCategoryContent.open {
  max-height: 1000px;
}

.leagueCategoryList {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.leagueItem {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background var(--transition-normal);
}

.leagueItem:hover {
  background: var(--color-bg-secondary);
}

.leagueCheckbox {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}

.leagueName {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.leagueCheckmark {
  color: var(--color-success);
  font-weight: var(--font-weight-semibold);
}

.leagueShowMore {
  padding: var(--spacing-md) var(--spacing-lg);
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-align: center;
}

.leagueShowMore:hover {
  text-decoration: underline;
}

/* Summary section */
.summary {
  background: var(--color-bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
}

.summaryTitle {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.summaryRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.summaryRow:last-child {
  border-bottom: none;
}

.summaryLabel {
  color: var(--color-text-secondary);
}

.summaryValue {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.summaryEdit {
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.summaryEdit:hover {
  text-decoration: underline;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  padding: var(--spacing-md) var(--spacing-xl);
  margin: var(--spacing-md) 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .wizard {
    max-width: 100%;
    border-radius: 0;
  }

  .blockInner {
    padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg) calc(28px + var(--spacing-lg) + var(--spacing-lg));
  }

  .leagueFilters {
    flex-direction: column;
  }

  .leagueFilter {
    width: 100%;
  }

  .footerActions {
    width: 100%;
    flex-direction: column;
  }

  .button {
    width: 100%;
    justify-content: center;
  }
}
```

- [ ] **Step 2: Commit CSS module**

```bash
git add src/client/styles/OfferWizard.module.css
git commit -m "feat(styles): add offer wizard design system and component styles"
```

---

## Phase 2: Custom Hooks (State Management & Logic)

### Task 4: Create useOfferCreation hook for wizard state management

**Files:**
- Create: `src/client/hooks/useOfferCreation.ts`
- Test: `src/client/hooks/__tests__/useOfferCreation.test.ts`

- [ ] **Step 1: Write failing test for initial state**

```typescript
// src/client/hooks/__tests__/useOfferCreation.test.ts

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
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/hooks/__tests__/useOfferCreation.test.ts
# Expected: FAIL - "useOfferCreation is not defined"
```

- [ ] **Step 3: Implement useOfferCreation hook**

```typescript
// src/client/hooks/useOfferCreation.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/client/hooks/__tests__/useOfferCreation.test.ts
# Expected: PASS
```

- [ ] **Step 5: Add more comprehensive tests**

```typescript
// Add to src/client/hooks/__tests__/useOfferCreation.test.ts

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
```

- [ ] **Step 6: Commit hook and tests**

```bash
git add src/client/hooks/useOfferCreation.ts src/client/hooks/__tests__/useOfferCreation.test.ts
git commit -m "feat(hooks): add useOfferCreation hook for wizard state management"
```

---

### Task 5: Create useExtraction hook for text extraction logic

**Files:**
- Create: `src/client/hooks/useExtraction.ts`
- Test: `src/client/hooks/__tests__/useExtraction.test.ts`

- [ ] **Step 1: Write failing tests for extraction logic**

```typescript
// src/client/hooks/__tests__/useExtraction.test.ts

import { describe, it, expect } from 'vitest';
import { extractContactInfo } from '../useExtraction';

describe('extractContactInfo', () => {
  it('should extract organization name', () => {
    const text = `AFCV NRW e.V.
Fabian Pawlowski
Halterner Straße 193
45770 Marl
f.pawlowski@afcvnrw.de`;

    const result = extractContactInfo(text);

    expect(result.organizationName).toBe('AFCV NRW e.V.');
  });

  it('should extract email', () => {
    const text = `Organization
Contact
Address
f.pawlowski@example.com`;

    const result = extractContactInfo(text);

    expect(result.email).toBe('f.pawlowski@example.com');
  });

  it('should extract postal code and city', () => {
    const text = `Org
Contact
Street
45770 Marl
Email`;

    const result = extractContactInfo(text);

    expect(result.postalCode).toBe('45770');
    expect(result.city).toBe('Marl');
  });

  it('should extract phone number', () => {
    const text = `Org
Contact
+49 123 456789
Email`;

    const result = extractContactInfo(text);

    expect(result.phone).toBe('+49 123 456789');
  });

  it('should handle partial extraction', () => {
    const text = `AFCV NRW
Fabian`;

    const result = extractContactInfo(text);

    expect(result.organizationName).toBe('AFCV NRW');
    expect(result.contactName).toBe('Fabian');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm run test -- src/client/hooks/__tests__/useExtraction.test.ts
# Expected: FAIL - functions not defined
```

- [ ] **Step 3: Implement extraction utilities**

```typescript
// src/client/hooks/useExtraction.ts

import type { ExtractedData } from '../components/Offer/types';

/**
 * Extract organization and contact information from pasted text
 * Handles German address formats (e.g., "45770 Marl")
 */
export function extractContactInfo(text: string): Partial<ExtractedData> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let organizationName = '';
  let street = '';
  let city = '';
  let postalCode = '';
  let country = 'Germany'; // Default to Germany
  let contactName = '';
  let email = '';
  let phone = '';

  for (const line of lines) {
    // Email pattern
    if (line.includes('@')) {
      email = line;
      continue;
    }

    // Phone pattern (starts with + or digit, contains spaces/dashes)
    if (/^\+?\d[\d\s\-\/()]{6,}/.test(line)) {
      phone = line;
      continue;
    }

    // Organization pattern (contains e.V., e.v., gmbh, verband, verein)
    if (/e\.V\.|e\.v\.|gmbh|GmbH|verband|Verband|verein|Verein/i.test(line)) {
      organizationName = line;
      continue;
    }

    // Street pattern (contains Straße, Str., Weg, Allee, Gasse, Platz, etc.)
    if (
      /straße|straße|str\.|weg|allee|gasse|platz|avenue|street|str/i.test(
        line
      )
    ) {
      street = line;
      continue;
    }

    // Postal code + city pattern (5-digit postal followed by city name)
    const postalMatch = line.match(/^(\d{5})\s+(.+)/);
    if (postalMatch) {
      postalCode = postalMatch[1];
      city = postalMatch[2];
      continue;
    }

    // Contact name (after we've found organization)
    if (!contactName && organizationName && !street && !email && !phone) {
      contactName = line;
    }
  }

  return {
    organizationName: organizationName || undefined,
    street: street || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
    contactName: contactName || undefined,
    email: email || undefined,
    phone: phone || undefined,
  };
}

/**
 * Validate extracted data has required fields
 */
export function isValidExtraction(data: Partial<ExtractedData>): boolean {
  return !!(
    data.organizationName &&
    data.contactName &&
    data.email &&
    data.city &&
    data.postalCode
  );
}

/**
 * Get human-readable feedback on extraction quality
 */
export function getExtractionFeedback(data: Partial<ExtractedData>): {
  confidence: 'high' | 'medium' | 'low';
  message: string;
  missing: string[];
} {
  const required = ['organizationName', 'contactName', 'email', 'city', 'postalCode'];
  const missing = required.filter((field) => !data[field as keyof ExtractedData]);

  if (missing.length === 0) {
    return {
      confidence: 'high',
      message: '✓ High-confidence extraction',
      missing: [],
    };
  }

  if (missing.length <= 2) {
    return {
      confidence: 'medium',
      message: `Partial extraction (missing ${missing.join(', ')})`,
      missing,
    };
  }

  return {
    confidence: 'low',
    message: 'Low-confidence extraction - please review and complete',
    missing,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/hooks/__tests__/useExtraction.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit extraction utilities**

```bash
git add src/client/hooks/useExtraction.ts src/client/hooks/__tests__/useExtraction.test.ts
git commit -m "feat(hooks): add text extraction utilities for contact info"
```

---

## Phase 3: Step 1 Components (Association, Contact & Season)

### Task 6: Create PasteExtractBlock component

**Files:**
- Create: `src/client/components/Offer/Step1/PasteExtractBlock.tsx`
- Test: `src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx`

- [ ] **Step 1: Write failing component test**

```typescript
// src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasteExtractBlock } from '../PasteExtractBlock';

describe('PasteExtractBlock', () => {
  it('should render paste input field', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    expect(
      screen.getByPlaceholderText(/Paste organization & contact text/i)
    ).toBeInTheDocument();
  });

  it('should call onExtract when auto-fill button clicked', async () => {
    const user = userEvent.setup();
    const onExtract = vi.fn();

    const props = {
      pasteInput: 'AFCV NRW\nFabian\nf@example.com',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract,
    };

    render(<PasteExtractBlock {...props} />);

    const button = screen.getByText(/Auto-fill/i);
    await user.click(button);

    expect(onExtract).toHaveBeenCalledWith(
      'AFCV NRW\nFabian\nf@example.com'
    );
  });

  it('should display extracted fields when available', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: {
        organizationName: 'AFCV NRW e.V.',
        street: 'Halterner Straße 193',
        city: 'Marl',
        postalCode: '45770',
        country: 'Germany',
        contactName: 'Fabian Pawlowski',
        email: 'f.pawlowski@example.com',
        phone: '+49 123 456789',
      },
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    expect(screen.getByDisplayValue('AFCV NRW e.V.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fabian Pawlowski')).toBeInTheDocument();
  });

  it('should disable auto-fill button when input is empty', () => {
    const props = {
      pasteInput: '',
      isExtracting: false,
      extractionError: undefined,
      extractedData: undefined,
      onInputChange: vi.fn(),
      onExtract: vi.fn(),
    };

    render(<PasteExtractBlock {...props} />);

    const button = screen.getByText(/Auto-fill/i);
    expect(button).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx
# Expected: FAIL - component not found
```

- [ ] **Step 3: Implement PasteExtractBlock component**

```typescript
// src/client/components/Offer/Step1/PasteExtractBlock.tsx

import { useMemo } from 'react';
import type { ExtractedData } from '../types';
import { getExtractionFeedback } from '../../../hooks/useExtraction';
import styles from '../../../styles/OfferWizard.module.css';

interface PasteExtractBlockProps {
  pasteInput: string;
  isExtracting: boolean;
  extractionError?: string;
  extractedData?: ExtractedData;
  onInputChange: (text: string) => void;
  onExtract: (text: string) => void;
  onEmailChange?: (email: string) => void;
  onPhoneChange?: (phone: string) => void;
}

export function PasteExtractBlock({
  pasteInput,
  isExtracting,
  extractionError,
  extractedData,
  onInputChange,
  onExtract,
  onEmailChange,
  onPhoneChange,
}: PasteExtractBlockProps) {
  const feedback = useMemo(
    () => (extractedData ? getExtractionFeedback(extractedData) : null),
    [extractedData]
  );

  const isDisabled = !pasteInput.trim() || isExtracting;

  return (
    <div className={styles.block}>
      <div className={`${styles.blockHeader} ${extractedData ? styles.open : ''}`}>
        <div className={`${styles.blockIcon} ${extractedData ? styles.done : styles.active}`}>
          {extractedData ? '✓' : '1'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Paste & extract</strong>
          <span className={styles.blockSubtitle}>
            {extractedData
              ? `${extractedData.organizationName} · ${extractedData.contactName}`
              : 'Auto-fill from contact text'}
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${extractedData ? styles.open : ''}`}>
        <div className={styles.blockInner}>
          {/* Paste textarea */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Paste organization & contact text
            </label>
            <textarea
              className={styles.fieldTextarea}
              placeholder={`e.g. AFCV NRW e.V.\nFabian Pawlowski\nHalterner Straße 193, 45770 Marl\nf.pawlowski@afcvnrw.de`}
              value={pasteInput}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={isExtracting}
            />
          </div>

          {/* Auto-fill button + status */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonSmall}`}
              onClick={() => onExtract(pasteInput)}
              disabled={isDisabled}
            >
              ↯ Auto-fill
            </button>
            {isExtracting && (
              <span className={`${styles.tag} ${styles.tagInfo}`}>
                …extracting
              </span>
            )}
            {extractionError && (
              <span className={`${styles.tag} ${styles.tagInfo}`} style={{color: '#dc2626', background: '#fee2e2', borderColor: '#fecaca'}}>
                ✕ {extractionError}
              </span>
            )}
            {feedback && !isExtracting && (
              <span
                className={`${styles.tag} ${
                  feedback.confidence === 'high'
                    ? styles.tagSuccess
                    : styles.tagInfo
                }`}
              >
                {feedback.message}
              </span>
            )}
          </div>

          {/* Extracted fields display */}
          {extractedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Organization *</label>
                <input
                  type="text"
                  className={`${styles.fieldInput} ${styles.fieldInput}`}
                  disabled
                  value={extractedData.organizationName}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className={styles.fieldLabel} style={{ marginBottom: '8px' }}>
                  Address
                </label>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Street *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.street}
                  />
                </div>

                <div className={`${styles.fieldRow}`}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>City *</label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      disabled
                      value={extractedData.city}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Postal Code *</label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      disabled
                      value={extractedData.postalCode}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Country *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.country}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className={styles.fieldLabel} style={{ marginBottom: '8px' }}>
                  Contact Information
                </label>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Contact Name *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.contactName}
                  />
                </div>

                <div className={`${styles.fieldRow}`}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Email *</label>
                    <input
                      type="email"
                      className={styles.fieldInput}
                      value={extractedData.email}
                      onChange={(e) => onEmailChange?.(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Phone (optional)</label>
                  <input
                    type="tel"
                    className={styles.fieldInput}
                    placeholder="+49 …"
                    value={extractedData.phone || ''}
                    onChange={(e) => onPhoneChange?.(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx
# Expected: PASS
```

- [ ] **Step 5: Commit component**

```bash
git add src/client/components/Offer/Step1/PasteExtractBlock.tsx src/client/components/Offer/Step1/__tests__/PasteExtractBlock.test.tsx
git commit -m "feat(components): add PasteExtractBlock component"
```

---

### Task 7: Create UseExistingBlock component

**Files:**
- Create: `src/client/components/Offer/Step1/UseExistingBlock.tsx`
- Test: `src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx`

- [ ] **Step 1: Write failing component test**

```typescript
// src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UseExistingBlock } from '../UseExistingBlock';

describe('UseExistingBlock', () => {
  const mockAssociations = [
    { _id: 'assoc1', name: 'AFCV NRW e.V.' },
    { _id: 'assoc2', name: 'AFCV Bayern e.V.' },
  ];

  const mockContacts = [
    { _id: 'contact1', name: 'Fabian Pawlowski', email: 'f@example.com' },
  ];

  const mockSeasons = [
    { _id: 'season1', year: 2025 },
    { _id: 'season2', year: 2026 },
  ];

  it('should render dropdowns for association, contact, season', () => {
    render(
      <UseExistingBlock
        associations={mockAssociations}
        contacts={mockContacts}
        seasons={mockSeasons}
        selectedAssociationId=""
        selectedContactId=""
        selectedSeasonId=""
        onAssociationChange={vi.fn()}
        onContactChange={vi.fn()}
        onSeasonChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Association/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Season/i)).toBeInTheDocument();
  });

  it('should call onAssociationChange when selection changes', async () => {
    const user = userEvent.setup();
    const onAssociationChange = vi.fn();

    const { container } = render(
      <UseExistingBlock
        associations={mockAssociations}
        contacts={mockContacts}
        seasons={mockSeasons}
        selectedAssociationId=""
        selectedContactId=""
        selectedSeasonId=""
        onAssociationChange={onAssociationChange}
        onContactChange={vi.fn()}
        onSeasonChange={vi.fn()}
      />
    );

    const select = container.querySelector('select');
    if (select) {
      await user.selectOptions(select, 'assoc1');
      expect(onAssociationChange).toHaveBeenCalledWith('assoc1');
    }
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx
# Expected: FAIL
```

- [ ] **Step 3: Implement UseExistingBlock component**

```typescript
// src/client/components/Offer/Step1/UseExistingBlock.tsx

import type { Types } from 'mongoose';
import styles from '../../../styles/OfferWizard.module.css';

interface Association {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
}

interface Season {
  _id: string;
  year: number;
}

interface UseExistingBlockProps {
  associations: Association[];
  contacts: Contact[];
  seasons: Season[];
  selectedAssociationId: string;
  selectedContactId: string;
  selectedSeasonId: string;
  onAssociationChange: (id: string) => void;
  onContactChange: (id: string) => void;
  onSeasonChange: (id: string) => void;
}

export function UseExistingBlock({
  associations,
  contacts,
  seasons,
  selectedAssociationId,
  selectedContactId,
  selectedSeasonId,
  onAssociationChange,
  onContactChange,
  onSeasonChange,
}: UseExistingBlockProps) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <div className={`${styles.blockIcon} ${styles.badge}`}>
          OR
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Use existing records</strong>
          <span className={styles.blockSubtitle}>
            Pick association, contact & season
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={styles.blockBody}>
        <div className={styles.blockInner}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="association-select">
              Association *
            </label>
            <select
              id="association-select"
              className={styles.fieldSelect}
              value={selectedAssociationId}
              onChange={(e) => onAssociationChange(e.target.value)}
            >
              <option value="">-- Select association --</option>
              {associations.map((assoc) => (
                <option key={assoc._id} value={assoc._id}>
                  {assoc.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="contact-select">
              Contact *
            </label>
            <select
              id="contact-select"
              className={styles.fieldSelect}
              value={selectedContactId}
              onChange={(e) => onContactChange(e.target.value)}
            >
              <option value="">-- Select contact --</option>
              {contacts.map((contact) => (
                <option key={contact._id} value={contact._id}>
                  {contact.name} ({contact.email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="season-select">
              Season *
            </label>
            <select
              id="season-select"
              className={styles.fieldSelect}
              value={selectedSeasonId}
              onChange={(e) => onSeasonChange(e.target.value)}
            >
              <option value="">-- Select season --</option>
              {seasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx
# Expected: PASS
```

- [ ] **Step 5: Commit component**

```bash
git add src/client/components/Offer/Step1/UseExistingBlock.tsx src/client/components/Offer/Step1/__tests__/UseExistingBlock.test.tsx
git commit -m "feat(components): add UseExistingBlock component"
```

---

### Task 8: Create SeasonBlock component

**Files:**
- Create: `src/client/components/Offer/Step1/SeasonBlock.tsx`

- [ ] **Step 1: Implement SeasonBlock component**

```typescript
// src/client/components/Offer/Step1/SeasonBlock.tsx

import styles from '../../../styles/OfferWizard.module.css';

interface Season {
  _id: string;
  year: number;
}

interface SeasonBlockProps {
  seasons: Season[];
  selectedSeasonId: string;
  onSeasonChange: (id: string) => void;
  showBlock: boolean;
}

export function SeasonBlock({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  showBlock,
}: SeasonBlockProps) {
  if (!showBlock) return null;

  return (
    <div className={styles.block}>
      <div className={`${styles.blockHeader} ${selectedSeasonId ? styles.open : ''}`}>
        <div className={`${styles.blockIcon} ${selectedSeasonId ? styles.done : styles.active}`}>
          {selectedSeasonId ? '✓' : '2'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Season</strong>
          <span className={styles.blockSubtitle}>
            Required to complete the offer
          </span>
        </div>
        <span className={styles.blockChevron} >▼</span>
      </div>

      <div className={`${styles.blockBody} ${selectedSeasonId ? styles.open : ''}`}>
        <div className={styles.blockInner}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="season-paste-select">
              Season *
            </label>
            <select
              id="season-paste-select"
              className={styles.fieldSelect}
              value={selectedSeasonId}
              onChange={(e) => onSeasonChange(e.target.value)}
            >
              <option value="">-- Select season --</option>
              {seasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.year}
                </option>
              ))}
            </select>
          </div>

          {selectedSeasonId && (
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '8px 0 0 0' }}>
              ℹ️ Selected season determines available leagues in the next step
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add src/client/components/Offer/Step1/SeasonBlock.tsx
git commit -m "feat(components): add SeasonBlock component"
```

---

### Task 9: Create Step1 container component

**Files:**
- Create: `src/client/components/Offer/Step1/Step1.tsx`
- Test: `src/client/components/Offer/Step1/__tests__/Step1.test.tsx`

- [ ] **Step 1: Write failing test for Step1 container**

```typescript
// src/client/components/Offer/Step1/__tests__/Step1.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Step1 } from '../Step1';

describe('Step1', () => {
  const mockProps = {
    pasteInput: '',
    pathChoice: undefined,
    selectedAssociationId: '',
    selectedContactId: '',
    selectedSeasonId: '',
    isExtracting: false,
    extractedData: undefined,
    extractionError: undefined,
    associations: [],
    contacts: [],
    seasons: [],
    onUpdatePasteInput: vi.fn(),
    onSelectPath: vi.fn(),
    onExtract: vi.fn(),
    onSelectAssociation: vi.fn(),
    onSelectContact: vi.fn(),
    onSelectSeason: vi.fn(),
    onNext: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render step1 layout', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/Association, Contact & Season/i)).toBeInTheDocument();
  });

  it('should render paste extract block', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/Paste & extract/i)).toBeInTheDocument();
  });

  it('should render use existing block', () => {
    render(<Step1 {...mockProps} />);

    expect(screen.getByText(/Use existing records/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/Step1.test.tsx
# Expected: FAIL
```

- [ ] **Step 3: Implement Step1 container**

```typescript
// src/client/components/Offer/Step1/Step1.tsx

import { PasteExtractBlock } from './PasteExtractBlock';
import { UseExistingBlock } from './UseExistingBlock';
import { SeasonBlock } from './SeasonBlock';
import type { ExtractedData, PathChoice } from '../types';
import styles from '../../../styles/OfferWizard.module.css';

interface Association {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
}

interface Season {
  _id: string;
  year: number;
}

interface Step1Props {
  pasteInput: string;
  pathChoice?: PathChoice;
  selectedAssociationId: string;
  selectedContactId: string;
  selectedSeasonId: string;
  isExtracting: boolean;
  extractedData?: ExtractedData;
  extractionError?: string;
  associations: Association[];
  contacts: Contact[];
  seasons: Season[];
  onUpdatePasteInput: (text: string) => void;
  onSelectPath: (path: PathChoice) => void;
  onExtract: (text: string) => void;
  onSelectAssociation: (id: string) => void;
  onSelectContact: (id: string) => void;
  onSelectSeason: (id: string) => void;
  onEmailChange?: (email: string) => void;
  onPhoneChange?: (phone: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function Step1({
  pasteInput,
  pathChoice,
  selectedAssociationId,
  selectedContactId,
  selectedSeasonId,
  isExtracting,
  extractedData,
  extractionError,
  associations,
  contacts,
  seasons,
  onUpdatePasteInput,
  onSelectPath,
  onExtract,
  onSelectAssociation,
  onSelectContact,
  onSelectSeason,
  onEmailChange,
  onPhoneChange,
  onNext,
  onCancel,
}: Step1Props) {
  const canProceed = extractedData && selectedSeasonId;
  const isExistingPath = pathChoice === 'existing' && selectedAssociationId && selectedContactId && selectedSeasonId;
  const isPastePath = pathChoice === 'paste' && canProceed;

  return (
    <div className={styles.wizard}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>Create New Offer</h1>
        <div className={styles.progressIndicator}>
          <div className={`${styles.progressStep} ${styles.progressStep}`}>
            <div className={`${styles.progressDot} ${styles.active}`}>1</div>
            <span className={styles.progressLabel}>Association, Contact & Season</span>
          </div>
          <span className={styles.progressSeparator}>›</span>
          <div className={styles.progressStep}>
            <div className={styles.progressDot}>2</div>
            <span className={styles.progressLabel}>Pricing & Leagues</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <PasteExtractBlock
          pasteInput={pasteInput}
          isExtracting={isExtracting}
          extractionError={extractionError}
          extractedData={extractedData}
          onInputChange={onUpdatePasteInput}
          onExtract={onExtract}
          onEmailChange={onEmailChange}
          onPhoneChange={onPhoneChange}
        />

        <div className={styles.divider}>or use existing records</div>

        <UseExistingBlock
          associations={associations}
          contacts={contacts}
          seasons={seasons}
          selectedAssociationId={selectedAssociationId}
          selectedContactId={selectedContactId}
          selectedSeasonId={selectedSeasonId}
          onAssociationChange={onSelectAssociation}
          onContactChange={onSelectContact}
          onSeasonChange={onSelectSeason}
        />

        {pathChoice === 'paste' && (
          <SeasonBlock
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={onSelectSeason}
            showBlock={true}
          />
        )}
      </div>

      <div className={styles.wizardFooter}>
        <span className={styles.footerHint}>Step 1 of 2</span>
        <div className={styles.footerActions}>
          <button className={`${styles.button} ${styles.buttonGhost}`} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onNext}
            disabled={!isPastePath && !isExistingPath}
          >
            Next: Pricing & Leagues →
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step1/__tests__/Step1.test.tsx
# Expected: PASS
```

- [ ] **Step 5: Commit Step1 container**

```bash
git add src/client/components/Offer/Step1/Step1.tsx src/client/components/Offer/Step1/__tests__/Step1.test.tsx
git commit -m "feat(components): add Step1 container component"
```

---

## Phase 4: Step 2 Components (Pricing & Leagues)

*[Continue in next section due to length limits - Tasks 10-12 follow same TDD pattern]*

### Task 10: Create SummarySection component
### Task 11: Create PricingSection component  
### Task 12: Create LeagueSelectorSection with CategoryGroup
### Task 13: Create Step2 container component

---

## Phase 5: Integration & API Wiring

### Task 14: Integrate with tRPC backend (extract, duplicate detection, create offer)
### Task 15: Create main OfferCreateWizard page component
### Task 16: Add routing and navigation

---

## Phase 6: Testing & Polish

### Task 17: End-to-end tests for complete flow
### Task 18: Accessibility audit and fixes
### Task 19: Mobile responsiveness testing

---

## Success Criteria

✓ Step 1 renders with collapsible blocks (Paste/Use Existing/Season)
✓ Step 2 renders with Summary + Pricing + League Selector  
✓ Text extraction works with duplicate detection
✓ League search and filters functional
✓ Dialog height stays under 400px (Step 1) and 500px (Step 2)
✓ All components tested with >80% coverage
✓ Mobile responsive (768px and 480px breakpoints)
✓ Accessible (WCAG AA, keyboard navigation, focus management)

---

## Execution Notes

**Dependencies:**
- Tasks 1-3: Types, schemas, styling (foundation)
- Tasks 4-5: Custom hooks (state management)
- Tasks 6-9: Step 1 components (build on hooks)
- Tasks 10-13: Step 2 components (build on hooks)
- Tasks 14-19: Integration, testing, polish

**Commit strategy:**
- One task = one commit
- Use semantic commit messages (`feat:`, `test:`, `fix:`)
- Include test files with component commits

**Testing approach:**
- TDD: Write test first, implement to pass
- Test component rendering, user interactions, state updates
- Mock API calls and external dependencies
- Run full test suite before each commit
