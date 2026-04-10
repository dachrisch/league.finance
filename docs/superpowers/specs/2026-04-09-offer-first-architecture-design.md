# Offer-First Architecture Redesign

**Date:** 2026-04-09  
**Status:** Design Approved  
**Scope:** Complete restructuring of feature hierarchy to prioritize Offer as root entity

---

## Executive Summary

Current system is config-first (users create configs, then manage associations separately). This redesign inverts the workflow to be **offer-first**: users create quotations (Offers) that automatically generate configs, with associations linked to offers and contacts as reusable entities.

**Key changes:**
- Offer becomes the primary entry point (was Config)
- Contact becomes a separate reusable entity with address fields
- Association created before offer, linked at offer creation
- FinancialConfig auto-generated on offer draft
- One offer per association-season pair; multiple leagues per offer
- Dashboard navigates: Offers → Offer Detail → Config (embedded context)
- Associations view exists separately but linked to offers

---

## Data Model

### Offer (New Root Entity)

```typescript
interface IOffer {
  _id: ObjectId;
  status: 'draft' | 'sent' | 'accepted';
  associationId: number;          // One association per offer
  seasonId: number;                // One season per offer
  leagueIds: number[];             // Multiple leagues
  contactId: ObjectId;             // Reusable contact
  financialConfigId: ObjectId;     // Auto-created on draft (one config applies to all leagues)
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}
```

**Behavior:**
- On offer creation (draft): automatically create one FinancialConfig
- Config inherits pricing from offer's selection (cost model, base rate, expected teams count)
- When offer has 3 leagues (A, B, C): create 3 FinancialConfig records (one per league-season pair)
- FinancialConfig retains `leagueId` field for multi-league support
- Editing offer's pricing updates all associated configs

### Contact (New Reusable Entity)

```typescript
interface IContact {
  _id: ObjectId;
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
```

**Behavior:**
- Created once, reused across multiple offers
- Displayed on generated offer PDFs
- Can be selected from existing contacts or created inline during offer creation

### FinancialConfig (Modified)

```typescript
interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount?: number;
  expectedTeamsPerGameday?: number;
  offerId: ObjectId;               // NEW: Link back to offer
  createdAt: Date;
  updatedAt: Date;
}
```

**Changes:**
- Add `offerId` field to link config back to its parent offer
- When offer is drafted, create one config per assigned league
- Configs are always created in draft state with offer
- Update/delete cascades from offer

### Association (No Schema Change)

Association remains unchanged. One association per offer (not multiple).

---

## Workflow: Create Offer

**Step 1: Select Association & Season**
- Dropdown: "Select Association" (one only)
- Dropdown: "Select Season" (one only)
- Proceed to Step 2

**Step 2: Select or Create Contact**
- Show list of existing contacts (clickable cards)
- Or inline form to create new contact (name, street, city, postal code, country)
- Proceed to Step 3

**Step 3: Set Pricing & Assign Leagues**
- Select cost model (Flat Fee / Usage-Based)
- Enter base rate override (€)
- Enter expected teams count
- Checkboxes: select which leagues this offer covers (multi-select)
- Button: "Create Offer (Draft)"

**On Creation:**
- Create Offer document with status: `draft`
- For each selected league: create FinancialConfig(leagueId, seasonId, offerId, ...)
- Redirect to Offer Detail page

---

## Workflow: Edit Offer (Draft Only)

**Allowed changes (while draft):**
- Change contact
- Edit config (cost model, base rate, expected teams)
- Add/remove leagues (creates/deletes associated configs)
- Edit association? (probably not - should not allow re-linking to different association)
- Edit season? (probably not - cascades to all configs)

**Not allowed:**
- Cannot edit association or season once created (too many cascading changes)

---

## Workflow: Offer Lifecycle

**Draft → Sent:**
- Button: "Send Offer"
- Set `sentAt` timestamp
- No config changes on send

**Sent → Accepted:**
- Button: "Mark Accepted" (from detail page)
- Set `acceptedAt` timestamp
- Set status to `accepted`
- Configs remain active and usable (for financial calculations)

**Delete:**
- Only allowed in `draft` status
- Cascade: delete all associated FinancialConfigs
- Cannot delete sent/accepted offers

---

## Dashboard Navigation

**Level 1: Offers List (New Primary Entry Point)**
- Card-based layout
- Show: status (badge + left border color), association name, season, leagues (tags), contact name
- Actions: View, Delete (if draft)
- Sort: by status (draft → sent → accepted), then by created date descending

**Level 2: Offer Detail (Drill-Down)**
- Show offer metadata (association, season, status, contact info)
- Show auto-created FinancialConfig details
- Show leagues with config breakdown (league name, expected revenue)
- Actions: PDF Preview, Send Offer, Mark Accepted, Delete (draft only), Edit Config

**Level 3: Edit Contact or Config**
- Modify contact (if needed)
- Edit config pricing (cost model, base rate, expected teams)
- Changes persist to offer

**Separate Tab: Associations View**
- Card-based layout
- Show: association name, count of active offers
- Click "View Offers" → filter offers list by association
- Maintain visibility but link to offers (not primary entry point)

---

## PDF Generation

**Trigger:** "PDF Preview" button on offer detail page

**Content:**
- Letterhead with contact name/address (quote recipient)
- Offer summary: association, season, dates
- Table: leagues, cost models, rates, expected revenue per league
- Total gross revenue across all leagues
- Footer with offer status/dates

---

## CRUD Operations

### Create
- POST `/offers` with { associationId, seasonId, leagueIds[], contactId, costModel, baseRateOverride, expectedTeamsCount }
- Auto-create FinancialConfig(s)
- Return offer detail with embedded configs

### Read
- GET `/offers` - list all with filters (status, association)
- GET `/offers/:id` - single offer with embedded contact + configs

### Update
- PUT `/offers/:id` with { status, contactId, config changes, leagueIds }
- Recalculate configs if pricing changes
- Cascade config updates

### Delete
- DELETE `/offers/:id` - only if draft status
- Delete all associated FinancialConfigs
- Return 403 if not draft

---

## Data Flow: Create Offer Sequence

```
User: Click "+ New Offer"
  ↓
Screen: Step 1 (Association & Season)
  ↓
User: Select association, season, click Next
  ↓
Screen: Step 2 (Contact)
  ↓
User: Select/create contact, click Next
  ↓
Screen: Step 3 (Pricing & Leagues)
  ↓
User: Select cost model, rate, teams, leagues, click "Create Offer (Draft)"
  ↓
API: POST /offers
  ├─ Create Offer { associationId, seasonId, contactId, status: 'draft' }
  └─ For each leagueId: Create FinancialConfig { leagueId, seasonId, offerId, ... }
  ↓
Return: Offer + embedded Contacts + Configs
  ↓
Redirect: /offers/:offerId (detail page)
```

---

## Error Handling

**Duplicate Prevention:**
- Offer (association, season) pair should be unique while draft/sent
- If user tries to create offer for same (association, season), check if draft/sent exists
- Allow if previous offer was accepted/deleted

**Contact Required:**
- Cannot create offer without contact
- Allow inline creation if no suitable contact exists

**Config Auto-Creation Failure:**
- If config creation fails for any league, rollback offer creation
- Return error: "Failed to create configs for league X"

**Validation:**
- At least 1 league must be selected
- Base rate must be > 0 (if override provided)
- Expected teams > 0
- Association/season must exist

---

## Testing Strategy

**Unit Tests:**
- Offer creation with config auto-generation
- Config cascade on offer update/delete
- Contact reusability across offers
- Offer state transitions (draft → sent → accepted)

**Integration Tests:**
- End-to-end offer creation workflow
- PDF generation with contact info
- CRUD operations with proper cascading
- Duplicate offer prevention

**UI Tests:**
- Offer card rendering on dashboard
- Multi-step form validation
- Contact selection/creation flows
- Association view linking

---

## Migration Path (If Existing Data)

If there's existing Config data without Offers:
- Create "placeholder" offers per config (one offer per config)
- Link configs to placeholder offers via `offerId`
- Mark all placeholder offers as `accepted`
- Preserve all financial data

---

## Open Questions / TBD

- Should editing season/association be allowed post-creation? (Currently: no)
- Should offer be archived instead of deleted? (Currently: delete only for draft)
- Should there be offer templates/bulk creation? (Out of scope for v1)
- PDF branding/footer customization? (Out of scope for v1)
