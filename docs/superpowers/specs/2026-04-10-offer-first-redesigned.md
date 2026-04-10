# Offer-First Architecture: Redesigned Specification

**Date:** 2026-04-10  
**Status:** Design Approved  
**Scope:** Complete offer-first system with Offer as primary entity, Association & Contact as reusable, unified dashboard with offers as primary cards and league configs as expandable details

---

## Executive Summary

**Previous assumption (incorrect):** Association was a reference number. Contact was separate.

**Corrected design:**
- **Offer** becomes the root, primary entity
- **Association** becomes a MongoDB model (like Contact) — created inline during offer wizard, reusable across offers
- **Contact** remains reusable MongoDB model — created inline or selected during offer wizard
- **FinancialConfig** is auto-generated from Offer — one config per league-season pair, derived from offer's pricing choices
- **Dashboard unifies** all workflows: Offers as primary cards, league configs as expandable secondary details

---

## Data Models

### Offer (Primary Entity)

\`\`\`typescript
interface IOffer extends Document {
  status: 'draft' | 'sent' | 'accepted';
  associationId: Types.ObjectId;      // Reference to reusable Association
  seasonId: number;
  leagueIds: number[];                // Multiple leagues per offer
  contactId: Types.ObjectId;          // Reference to reusable Contact
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}
\`\`\`

**Behavior:**
- One offer per (association, season) pair while draft/sent (unique partial index)
- Multiple leagues per offer
- On creation (draft): auto-generate one FinancialConfig per league
- Cascade delete: if offer deleted, all associated configs deleted

### Association (New Reusable Model)

\`\`\`typescript
interface IAssociation extends Document {
  name: string;
  description?: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

**Behavior:**
- Created once, reused across multiple offers
- Can be created standalone OR inline during offer wizard
- Cannot delete if active offers exist (draft/sent)
- Can be deleted if only accepted/completed offers reference it

### Contact (Reusable Model)

\`\`\`typescript
interface IContact extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

**Behavior:**
- Created once, reused across multiple offers
- Can be created inline during offer wizard
- Used for PDF generation (quote recipient)

### FinancialConfig (Derived)

\`\`\`typescript
interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount?: number;
  expectedTeamsPerGameday?: number;
  offerId: Types.ObjectId;            // Link to parent Offer
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

**Behavior:**
- Auto-created when offer drafted (one per league)
- Inherits pricing from offer's choices
- Cascade deletes with offer (if draft only)
- Remains active after offer accepted (for financial calculations)

---

## Offer Creation Wizard (3 Steps)

### Step 1: Select or Create Association & Select Season

**UI:**
- Dropdown: "Select Association" — shows list of existing associations
- Inline toggle: "+ Create New Association"
  - If clicked: show form (name, description, email, phone)
  - Create association, auto-select it
- Dropdown: "Select Season" (one only)
- Button: "Next: Select Contact"

**Validation:**
- Association required
- Season required

### Step 2: Select or Create Contact

**UI:**
- Grid of existing contacts (cards with: name, address snippet)
- Each card: clickable to select
- Button: "+ Create New Contact"
  - If clicked: show form (name, street, city, postal code, country)
  - Create contact, auto-select it
- Button: "Back" / "Next: Set Pricing & Leagues"

**Validation:**
- Contact required

### Step 3: Set Pricing & Select Leagues

**UI:**
- Dropdown: Cost Model (Flat Fee / Usage-Based)
- Input: Base Rate Override (€, optional)
- Input: Expected Teams Count (≥0)
- Fieldset: Select Leagues (checkboxes, multi-select)
- Button: "Back" / "Create Offer (Draft)"

**Validation:**
- At least 1 league selected
- If base rate provided: must be > 0
- Expected teams ≥ 0

**On Creation:**
- Create Offer { associationId, seasonId, contactId, status: 'draft', leagueIds[] }
- For each leagueId: create FinancialConfig { leagueId, seasonId, costModel, baseRateOverride, expectedTeamsCount, offerId }
- Redirect to Offer Detail page

---

## Unified Dashboard

### Layout

**Header:**
- Title: "Offers"
- Filter bar: Status (All/Draft/Sent/Accepted), Association (dropdown)
- Button: "+ New Offer"
- Tab link: "Associations"

**Main Content:**
- Responsive grid (auto-fill, minmax 320px, 1fr)
- Collapsed offer cards (default state)
- Click chevron → expand card to show league configs

### Collapsed Offer Card

\`\`\`
┌────────────────────────────────────┐
│ ▼ Association Name         [DRAFT]  │
├────────────────────────────────────┤
│ Season 2024                         │
│ Contact: John Doe                   │
│ Leagues: 3 selected (A, B, C...)    │
│                                     │
│ Created 2 days ago                  │
├────────────────────────────────────┤
│ [View] [Delete] [Send]              │
└────────────────────────────────────┘
\`\`\`

**Features:**
- Status badge (top-right): color-coded by status
- Left border: colored by status (yellow=draft, blue=sent, green=accepted)
- Chevron icon: expandable indicator
- Hover effect: shadow lift

### Expanded Offer Card

When chevron clicked:

\`\`\`
┌────────────────────────────────────┐
│ ▼ Association Name         [DRAFT]  │
├────────────────────────────────────┤
│ Season 2024                         │
│ Contact: John Doe                   │
│ Leagues: 3 selected                 │
│ Created 2 days ago                  │
├────────────────────────────────────┤
│ LEAGUE CONFIGURATIONS               │
├────────────────────────────────────┤
│ League A │ SEASON  │ €50.00 │ 10    │
│ League B │ GAMEDAY │ €25.00 │ 5     │
│ League C │ SEASON  │ €50.00 │ 10    │
├────────────────────────────────────┤
│ Total Expected Revenue: €1,250      │
├────────────────────────────────────┤
│ [View Details] [Edit] [Delete]      │
└────────────────────────────────────┘
\`\`\`

**Expanded Details:**
- Table: League | Cost Model | Base Rate | Expected Teams
- Total expected revenue (sum across all leagues)
- Actions: "View Details" → \`/offers/:id\`, "Edit" (if draft), "Delete" (if draft)

### Responsive

- Desktop (1200px+): 4-column grid
- Tablet (768-1199px): 2-column grid
- Mobile (<768px): 1-column stack, expandable panel for configs

### Empty State

- Illustration
- "No offers yet"
- Button: "+ Create Your First Offer"

---

## Associations Management Page

**Separate Page: \`/associations\`**

**UI:**
- Title: "Associations"
- Button: "+ New Association"
- List/cards: all associations
  - Name, email, phone, description
  - Count of active offers (draft/sent)
  - Link: "View Offers" → filter offers list by this association

**Actions:**
- Edit (name, description, email, phone)
- Delete (only if no active offers)
- View offers linked to this association

---

## Success Criteria

✅ Offer is the visible, primary entity  
✅ League configs are auto-generated, shown as secondary detail  
✅ Association & Contact both creatable inline or reused  
✅ Dashboard unifies offer view with config details (expandable)  
✅ All CRUD operations working (associations, contacts, offers, configs)  
✅ Cascade deletes working correctly  
✅ Unique partial index prevents duplicate draft/sent offers  
✅ Tests passing (unit + integration + UI)  
✅ TypeScript clean  

---
