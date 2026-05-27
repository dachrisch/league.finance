# Unified Offer Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a unified, single-screen edit experience for offers that combines metadata, pricing, and league selection.

**Architecture:** Refactor existing wizard components to support a "unified" layout and fix pre-filling logic in the state hook.

**Tech Stack:** React, TypeScript, TRPC, Vitest.

---

### Task 1: Fix Pre-filling in `useOfferCreation` hook

**Files:**
- Modify: `src/client/hooks/useOfferCreation.ts`
- Test: `src/client/hooks/__tests__/useOfferCreation.test.ts`

**Step 1: Write failing test for `resetWithData` with backend format**
```typescript
// Add to useOfferCreation.test.ts
it('should correctly map backend configs to selectedLeagueIds', () => {
  const { result } = renderHook(() => useOfferCreation());
  const mockOfferResponse = {
    offer: {
      associationId: 'assoc-1',
      contactId: 'cont-1',
      seasonId: 1,
      leagueIds: [10, 11]
    },
    configs: [
      { leagueId: 10, costModel: 'SEASON', baseRateOverride: 50, expectedTeamsCount: 5 },
      { leagueId: 11, costModel: 'SEASON', baseRateOverride: 50, expectedTeamsCount: 5 }
    ]
  };
  
  act(() => {
    result.current.resetWithData(mockOfferResponse);
  });
  
  expect(result.current.step2.selectedLeagueIds).toEqual(['10', '11']);
  expect(result.current.step2.pricing.baseRateOverride).toBe(50);
});
```

**Step 2: Run test to verify it fails**
Run: `npm test src/client/hooks/__tests__/useOfferCreation.test.ts`
Expected: FAIL (leagueIds empty or pricing not pre-filled)

**Step 3: Update `resetWithData` implementation**
```typescript
const resetWithData = useCallback((data: any) => {
  const { offer, configs } = data;
  const firstConfig = configs?.[0];
  
  setState({
    currentStep: 'step1',
    step1: {
      pathChoice: 'existing',
      selectedAssociationId: offer.associationId,
      selectedContactId: offer.contactId,
      selectedSeasonId: String(offer.seasonId),
      pasteInput: '',
      isExtracting: false,
    },
    step2: {
      pricing: {
        costModel: firstConfig?.costModel === 'GAMEDAY' ? 'perGameDay' : 'flatFee',
        baseRateOverride: firstConfig?.baseRateOverride || undefined,
        expectedTeamsCount: firstConfig?.expectedTeamsCount || 0,
      },
      selectedLeagueIds: offer.leagueIds.map(String),
      leagueSearchTerm: '',
      leagueFilterType: 'All',
    },
  });
}, []);
```

**Step 4: Run test to verify it passes**
Run: `npm test src/client/hooks/__tests__/useOfferCreation.test.ts`

**Step 5: Commit**
```bash
git add src/client/hooks/useOfferCreation.ts src/client/hooks/__tests__/useOfferCreation.test.ts
git commit -m "fix: pre-fill logic in useOfferCreation hook"
```

---

### Task 2: Add Unified Mode to `Step1`

**Files:**
- Modify: `src/client/components/Offer/Step1/Step1.tsx`

**Step 1: Add `isUnified` prop and conditionally hide "Path Selection"**
```tsx
// src/client/components/Offer/Step1/Step1.tsx
interface Step1Props {
  // ... existing
  isUnified?: boolean;
}

// In component:
{!isUnified && (
  <PathSelectionSection ... />
)}
```

**Step 2: Hide "Next" button in unified mode**
```tsx
{!isUnified && (
  <button onClick={onNext}>Next</button>
)}
```

**Step 3: Commit**
```bash
git add src/client/components/Offer/Step1/Step1.tsx
git commit -m "feat: add isUnified mode to Step1"
```

---

### Task 3: Add Unified Mode to `Step2`

**Files:**
- Modify: `src/client/components/Offer/Step2/Step2.tsx`

**Step 1: Add `isUnified` prop and conditionally hide Progress Header**
```tsx
// src/client/components/Offer/Step2/Step2.tsx
{!isUnified && (
  <div className={styles.wizardHeader}>...</div>
)}
```

**Step 2: Hide "Back" and "Cancel" buttons in footer when unified**
The footer should only show "Save Changes" (handled by the parent container).

**Step 3: Commit**
```bash
git add src/client/components/Offer/Step2/Step2.tsx
git commit -m "feat: add isUnified mode to Step2"
```

---

### Task 4: Create Unified `OfferEditWizard` Component

**Files:**
- Create: `src/client/components/Offer/OfferEditWizard.tsx`

**Step 1: Implement the unified view**
```tsx
export function OfferEditWizard({ editId }: { editId: string }) {
  // Similar logic to OfferCreateWizard but renders Step1 and Step2 vertically
  // Pass isUnified={true} to both
  return (
    <div className="unified-edit-container">
       <h1>Edit Offer</h1>
       <Step1 ... isUnified />
       <hr />
       <Step2 ... isUnified />
       <div className="footer-actions">
          <button onClick={handleSave}>Save Changes</button>
       </div>
    </div>
  );
}
```

**Step 2: Update `OfferNewPage.tsx` to use the new component when `id` is present**

**Step 3: Commit**
```bash
git add src/client/components/Offer/OfferEditWizard.tsx src/client/pages/OfferNewPage.tsx
git commit -m "feat: implement unified OfferEditWizard"
```

---

### Task 5: Final Verification

**Step 1: Run E2E tests**
Run: `npx playwright test e2e/test-frontend-create-offer.spec.ts`

**Step 2: Manual Check**
- Navigate to an existing offer.
- Click "Edit".
- Verify all data is pre-filled on one screen.
- Change a price and save.
- Verify the change persisted in the detail view.
