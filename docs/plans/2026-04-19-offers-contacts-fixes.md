# Fixes for Offers and Contacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix season display bug, add email field to contact form, and fix contact pre-selection during offer edit.

**Architecture:**
- Update `OffersPage.tsx` to use `season.name` instead of `season.year`.
- Update `ContactForm.tsx` to include `email` field.
- Update `useOfferCreation.ts` to correctly map `contactId` from existing offer.

**Tech Stack:** React (TypeScript), TRPC.

---

### Task 1: Fix Season Display in Offers Page

**Files:**
- Modify: `src/client/pages/OffersPage.tsx`

**Step 1: Fix the seasonYears mapping**
Change `s.year` to `s.name`.

**Step 2: Verify in code**
The table in `OfferTable.tsx` uses `seasonYears[offer.seasonId]`. Since `season.name` is "2026", it will now show "Season 2026".

### Task 2: Add Email Field to Contact Form

**Files:**
- Modify: `src/client/components/ContactForm.tsx`

**Step 1: Update form state and initialization**
Add `email` to `formData` state and `useEffect`.

**Step 2: Update JSX to include email input**
Add a new input field for Email.

**Step 3: Update onSubmit to include email**
Ensure `email` is passed to the `onSubmit` callback.

### Task 3: Fix Contact Pre-selection in Offer Wizard

**Files:**
- Modify: `src/client/hooks/useOfferCreation.ts`

**Step 1: Update resetWithData**
Change `selectedContactId: offer.contact?._id` to `selectedContactId: offer.contactId`.

### Task 4: Final Verification

**Step 1: Verify all changes**
Check that the seasonal display is correct, email can be edited, and contact is pre-selected.
