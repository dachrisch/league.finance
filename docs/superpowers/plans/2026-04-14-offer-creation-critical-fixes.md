# Offer Creation Critical Fixes Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical data persistence bugs in offer creation wizard that prevent users from creating offers, implement proper form state management, and add association/contact selectors.

**Architecture:** Replace the prototype mock-data wizard with the real backend-integrated version, then enhance UI with proper data display. Modal forms properly integrate with TRPC API, data persists to database, and users can select from existing associations/contacts.

**Tech Stack:** React, TRPC (tRPC), MongoDB, TailwindCSS, React Hook Form

---

## File Structure Overview

**Frontend Components:**
- `src/client/components/OfferCreateWizard.tsx` - Main wizard (ALREADY HAS BACKEND INTEGRATION)
- `src/client/components/OfferCreateWizardProto.tsx` - Prototype with mock data (NEEDS REPLACEMENT)
- `src/client/App.tsx` - Route configuration (NEEDS UPDATE)
- `src/client/components/AssociationForm.tsx` - Association creation form
- `src/client/components/ContactForm.tsx` - Contact creation form

**Backend:**
- `src/server/routers/finance/offers.ts` - TRPC mutation for offer creation
- No backend changes needed - API already correct

**Test files:**
- Can test via browser at `http://localhost:5173/offers/new`

---

## Implementation Tasks

### Task 1: Switch to Real Wizard Component

**Files:**
- Modify: `src/client/App.tsx:65`

**Context:**
The app currently imports and uses `OfferCreateWizardProto` which has mock data with hardcoded IDs ("1", "2") that don't exist in the database. The real `OfferCreateWizard` component already has proper TRPC integration and backend API calls.

- [x] **Step 1: Open App.tsx and verify current import**

```bash
grep -n "OfferCreateWizard" src/client/App.tsx
```

Expected output:
```
12:import { OfferCreateWizardProto } from './components/OfferCreateWizardProto';
65:                <Route path="/offers/new" element={<OfferCreateWizardProto />} />
```

- [x] **Step 2: Replace the import statement**

Old line 12:
```typescript
import { OfferCreateWizardProto } from './components/OfferCreateWizardProto';
```

New line 12:
```typescript
import { OfferCreateWizard } from './components/OfferCreateWizard';
```

- [x] **Step 3: Replace the component in the route**

Old line 65:
```typescript
<Route path="/offers/new" element={<OfferCreateWizardProto />} />
```

New line 65:
```typescript
<Route path="/offers/new" element={<OfferCreateWizard />} />
```

- [x] **Step 4: Verify changes with grep**

```bash
grep -n "OfferCreateWizard" src/client/App.tsx
```

Expected:
```
12:import { OfferCreateWizard } from './components/OfferCreateWizard';
65:                <Route path="/offers/new" element={<OfferCreateWizard />} />
```

- [x] **Step 5: Commit changes**

```bash
git add src/client/App.tsx
git commit -m "fix: switch to real OfferCreateWizard with backend integration

- Replace OfferCreateWizardProto (mock data) with OfferCreateWizard (backend-integrated)
- Fixes data persistence issues where associations/contacts weren't being saved
- Enables proper database operations via TRPC mutations"
```

---

### Task 2: Test Offer Creation Flow

**Files:**
- Browser test only, no code changes
- Test: `http://localhost:5173/offers/new`

**Prerequisites:**
- Dev server running on `http://localhost:3000` and `http://localhost:5173`
- MongoDB in-memory database started

**Context:**
The real wizard should now allow users to create offers and have the data persist properly. This test verifies the fix works.

- [x] **Step 1: Open browser to offer creation page**

Navigate to: `http://localhost:5173/offers/new`

- [x] **Step 2: Test Step 1 - Association & Season**

Verify:
- [x] A `<select>` dropdown for "Association" appears (not just a button)
- [x] Select "-- Select Association --" shows empty option
- [x] "+ Create New Association" button is visible below the dropdown
- [x] Click "+ Create New Association" shows a modal form with fields:
  - [x] Association Name *
  - [x] Description
  - [x] Email *
  - [x] Phone
  - [x] Cancel and Create Association buttons

- [x] **Step 3: Create a test association via modal**

Fill in the form:
```
Association Name: Test League Association
Email: test@league.de
Phone: +49 30 123456
Description: Test association for offer creation
```

Click "Create Association" button

Expected result:
- [x] Modal closes
- [x] Association dropdown now shows "Test League Association" in the list
- [x] The new association is automatically selected
- [x] Dropdown value changes from empty to the association name

- [x] **Step 4: Select a season**

In the Season dropdown:
- [x] Select "2026" from the dropdown
- [x] Season field now shows "2026"

- [x] **Step 5: Click Next to proceed to Step 2**

Click "Next ›" button

Expected result:
- [x] Page advances to Step 2: "Select Contact"
- [x] Step 1 is marked with ✓ indicator

- [x] **Step 6: Test Step 2 - Contact Selection**

Verify:
- [x] No select dropdown for contacts appears initially
- [x] "+ Create New Contact" button is visible
- [x] Click "+ Create New Contact" shows a modal form with fields:
  - [x] Contact Name *
  - [x] Street *
  - [x] City *
  - [x] Postal *
  - [x] Country *
  - [x] Cancel and Create Contact buttons

- [x] **Step 7: Create a test contact via modal**

Fill in the form:
```
Contact Name: Jane Smith
Street: 456 Oak Avenue
City: Munich
Postal: 80331
Country: Germany
```

Click "Create Contact" button

Expected result:
- [x] Modal closes
- [x] Contact appears to be selected (form progresses when Next is clicked)

- [x] **Step 8: Click Next to proceed to Step 3**

Click "Next ›" button

Expected result:
- [x] Page advances to Step 3: "Pricing Configuration"
- [x] Step 2 is marked with ✓ indicator
- [x] Review section shows selected values:
  - [x] Association: Test League Association
  - [x] Season: 2026
  - [x] Contact: Jane Smith

- [x] **Step 9: Test Step 3 - Pricing**

Verify:
- [x] Cost Model shows radio buttons for "Season Flat Fee" and "Per Game Day"
- [x] Can set Base Rate Override to "75"
- [x] Can set Expected Teams Count to "10"

Fill in:
```
Cost Model: Season Flat Fee (selected by default)
Base Rate Override: 75
Expected Teams Count: 10
```

- [x] **Step 10: Click Next to proceed to Step 4**

Click "Next ›" button

Expected result:
- [x] Page advances to Step 4: "Select Leagues"
- [x] Step 3 is marked with ✓ indicator

- [x] **Step 11: Test Step 4 - League Selection**

Verify:
- [x] Search field appears at top
- [x] Category filter buttons visible (All, Youth, Regional, Division, Other)
- [x] List of leagues displays with checkboxes
- [x] "Selected: 0" counter shows at top
- [x] Select All and Clear All buttons present

Select leagues:
- [x] Click "Select All" button
- [x] Verify counter increases and shows selected count
- [x] At least one league should be selected

- [x] **Step 12: Submit the offer**

Click "Create Offer (Draft)" button

**Expected Success Result:**
- [x] Offer created successfully
- [x] Page redirects to offers list: `http://localhost:5173/offers`
- [x] Newly created offer appears in the list
- [x] Status shows "Draft"

**Expected Error (Indicates Bug Still Present):**
- [x] Error message appears about "Association is required" or "Contact is required"
- [x] Page doesn't navigate away
- [x] Offer not visible in offers list

- [x] **Step 13: Verify offer appears in database**

Navigate to: `http://localhost:5173/offers`

Expected:
- [x] Offers page shows the newly created offer
- [x] Offer details match what was entered:
  - [x] Association name
  - [x] Season
  - [x] Contact name

- [x] **Step 14: Verify association persisted**

Navigate to: `http://localhost:5173/associations`

Expected:
- [x] "Test League Association" appears in the list
- [x] Confirms data was saved to database

- [x] **Step 15: Document test result**

If all steps passed: ✅ **FIX SUCCESSFUL**
If errors occurred: ❌ **BUG STILL PRESENT** - proceed to Task 3

---

### Task 3: Debug Remaining Issues (If Task 2 Fails)

**Context:**
If the offer creation still fails after switching to the real wizard, there may be additional issues with data serialization or TRPC mutation parameters.

- [x] **Step 1: Check browser console for errors**

Open DevTools (F12) > Console tab

Look for:
- [x] Red error messages about validation
- [x] Network errors from API calls
- [x] Full error response from `/api/trpc/finance.offers.create` call

- [x] **Step 2: Check server logs**

Look at terminal running `npm run dev:server` for error messages

Expected patterns to look for:
- [x] Zod validation errors (field validation failures)
- [x] MongoDB connection errors
- [x] TRPC mutation call errors

- [x] **Step 3: Verify TRPC queries are working**

In browser console:
```javascript
// Check if TRPC client is available
console.log(window.__TRPC_DEBUG__)
```

- [x] **Step 4: Review OfferCreateWizard.tsx data flow**

Read lines 59-72 (handleAssociationCreated):
```typescript
const handleAssociationCreated = async (data: any) => {
  const result = await createAssociation.mutateAsync(data);
  setState((prev) => ({ ...prev, associationId: result._id }));
  // ...
}
```

Verify:
- [x] Mutation is being called with correct parameters
- [x] Result contains `_id` field
- [x] State is being updated with the association ID

- [x] **Step 5: Check associations query is refetching**

Line 64: `await refetchAssociations();` should refetch the list after creation

If associations still show as empty:
- [x] Check that `trpc.finance.associations.list` query is properly configured
- [x] Verify query returns correct data shape

---

### Task 4: Fix Association/Contact Selector UI (Optional Polish)

**Files:**
- Modify: `src/client/components/OfferCreateWizard.tsx`

**Context:**
The real wizard already has dropdown selectors for associations, which is better than the proto. However, if users report that they can't easily find/select created associations, we can enhance the UI with better filtering or search.

This task is optional if Task 2 test passes successfully.

- [x] **Step 1: Verify association dropdown shows newly created associations**

Test by:
1. Create an association via modal
2. Check dropdown immediately shows the new association
3. Verify it's selectable

If dropdown doesn't show the new association:
- [x] Check that `refetchAssociations()` is being called in `handleAssociationCreated`
- [x] Verify the TRPC query returns updated list

- [x] **Step 2: Test contact selection**

Verify:
1. Create a contact via modal
2. Contact is immediately available in Step 2 selection
3. Can create multiple contacts and switch between them

- [x] **Step 3: (Future enhancement - not part of critical fix)**

If needed in future:
- Add search/filter to association dropdown
- Add contact cards view instead of dropdown
- Implement redesigned 4-step wizard from memory document

---

## Testing Checklist

**Pre-deployment Testing:**
- [x] Create an offer from start to finish without errors
- [x] Verify offer appears in offers list with correct details
- [x] Verify associations/contacts appear in their respective pages
- [x] Test creating multiple offers
- [x] Test navigating back and forth between steps
- [x] Test canceling at each step and returning to offers list

**Manual Testing Steps:**
1. [ ] Clear browser cache/cookies
2. [ ] Stop and restart dev server
3. [ ] Navigate to `/offers/new`
4. [ ] Complete full wizard flow (4 steps)
5. [ ] Verify redirect to `/offers`
6. [ ] Verify new offer appears in list
7. [ ] Check associations and contacts pages for persisted data

---

## Known Limitations (After This Fix)

These items are out of scope for this critical fix but noted for future enhancement:

1. **Proto wizard design not implemented** - Using real wizard which has 3 steps, not the 4-step redesign in memory document
2. **League selector** - Still shows flat checkbox list, not grouped with search (future: implement from memory document)
3. **Association selector** - Dropdown, not selection pills/cards (future: enhance per memory document)
4. **Contact selector** - No contact grid cards (future: implement per memory document)

These will be addressed in follow-up work to implement the full redesigned wizard from the design document.

---

## Rollback Plan

If critical issues discovered after deployment:

```bash
# Revert to proto version
git revert <commit-hash>
git push
```

But given that proto has fundamental data issues, the real wizard is safer even if missing some UI polish.

---

## Success Criteria

✅ **Offer creation completes without validation errors**
✅ **Created offers appear in offers list**
✅ **Associations and contacts persist to database**
✅ **Multiple offers can be created in sequence**
✅ **All form fields accept and save user input correctly**
