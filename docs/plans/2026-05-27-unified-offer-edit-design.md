# Design Spec: Unified Offer Edit Page

## Overview
The current "Edit Offer" experience is a 2-step wizard designed for creation, which leads to incomplete pre-filling and a repetitive UX. This redesign moves the "Edit" flow to a single-screen, unified component.

## Architecture
- **Page:** `src/client/pages/OfferNewPage.tsx` will be updated (or a new `OfferEditPage.tsx` created) to handle both flows.
- **Components:** Reuse `Step1` and `Step2` logic but render them vertically without step-based navigation.
- **State:** Enhanced `useOfferCreation` hook to handle initialization from existing data correctly.

## Data Flow
1. **Fetch:** Load offer by ID.
2. **Sync:** Map `offer.configs` and metadata to wizard state.
3. **Unified View:** Render Metadata (Association/Contact/Season) at the top, Pricing in the middle, and League Selection at the bottom.
4. **Save:** Use the existing `update` mutation which handles bulk configuration resets for draft offers.

## Technical Tasks
- Fix `resetWithData` in `useOfferCreation.ts`.
- Create a "Unified" mode in `Step1` and `Step2` components.
- Integrate both sections into a single scrollable view for editing.
- Ensure "Season Change" logic correctly handles league selection resets.

## Verification Plan
- **Pre-fill Check:** Open an existing draft and verify all fields (Association, Contact, Season, Pricing, selected Leagues) are correct.
- **Global Pricing Check:** Change the global price and save; verify all league configurations are updated in the detail page.
- **League Selection Check:** Add/remove leagues and verify the `FinancialConfig` records are updated accordingly.
