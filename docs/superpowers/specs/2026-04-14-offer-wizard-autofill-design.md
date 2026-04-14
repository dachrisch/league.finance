# Offer Creation Wizard: Auto-fill with Text Extraction

**Date:** 2026-04-14  
**Status:** Design Approved  
**Scope:** Integrate text extraction into offer creation workflow, consolidate wizard from 3 steps to 2

---

## Overview

Currently, the offer creation wizard has 3 steps:
1. Select/create Association + Season
2. Select/create Contact
3. Select Pricing & Leagues

This design consolidates Steps 1 & 2 into a single unified step that supports both text extraction (via AssociationContactForm) and traditional dropdown selection of existing records. This reduces friction for users creating offers while maintaining flexibility for those preferring to select from existing records.

**User journeys enabled:**
- **Quick path:** Paste organization + contact info → auto-extract → select season → pricing → done
- **Selection path:** Pick association from dropdown → pick contact from dropdown → select season → pricing → done
- **Hybrid path:** Extract association from text, but select existing contact from dropdown

---

## Architecture

### Component Structure

**OfferCreateWizard.tsx** (modified)
- Reduced from 3 steps to 2 steps
- Imports and uses new `OfferWizardStep1` component
- Handles navigation between steps
- Manages wizard-level state (association, contact, season, leagues, pricing)
- Submits final offer creation

**OfferWizardStep1.tsx** (NEW)
- Consolidates association, contact, and season selection
- Imports and renders `AssociationContactForm` for text extraction
- Also renders dropdown selectors for existing associations and contacts
- Manages local state for extraction vs. dropdown toggle
- Returns validated data to parent wizard

**AssociationContactForm.tsx** (REUSED)
- Already built from previous feature work
- Used as-is for text extraction functionality
- No modifications needed

### Data Flow

```
User Input (Step 1)
    ↓
OfferWizardStep1 Component
    ├─ AssociationContactForm (extraction path)
    │   ├─ parseContactAssociationText()
    │   └─ Returns: { association, contact }
    └─ Dropdowns (selection path)
        ├─ Association dropdown
        └─ Contact dropdown
    ↓
Validation & Duplicate Detection
    ├─ Check if extracted data matches existing records
    ├─ Reuse if match found, create if not
    └─ Return: { associationId, contactId, seasonId }
    ↓
Wizard State Update
    ↓
Step 2: Pricing & Leagues (unchanged)
    ↓
Offer Creation API Call
```

---

## Data Model & Validation

### Step 1 Input Options

**Option A: Extract via Text**
- User pastes text with organization, contact, and address info
- AssociationContactForm parses and displays extracted data
- User confirms or edits fields
- Returns: `{ association, contact }` objects with all fields

**Option B: Select from Dropdowns**
- Association dropdown shows all existing associations
- Contact dropdown shows all existing contacts
- User selects one of each
- Returns: `{ associationId, contactId }` references

**Option C: Mix Both**
- Extract association from text, select contact from dropdown
- Or vice versa
- System reconciles the two sources

### Validation Rules

**Required Fields (Step 1):**
- At least ONE valid source: extraction data OR both dropdown selections
- Season: must be selected
- Email: required (extracted or from selected contact)
- Address: all parts required (extracted or from selected contact)
- Association name: required (extracted or selected)
- Contact name: required (extracted or selected)

**Validation Sequence:**
1. Check if extraction form has valid data (confidence level matters)
2. Check if dropdowns have selections
3. Require at least one source to be valid
4. Validate season selection
5. Validate email format
6. Block submission if any required field missing

**Error Messages:**
- "Please extract organization and contact info or select from existing records"
- "Season is required"
- "Email is required"
- "Please complete all address fields"

### Duplicate Detection

When user has extracted data:
1. Search for existing association by name (exact match, case-insensitive)
2. Search for existing contact by email (exact match) or name + city (exact match)
3. If found: offer user option to "Use existing: [Name]" or "Create new"
4. If not found: create new entities

When user selects from dropdowns:
- No duplicate detection needed (user explicitly selected)

---

## UI/UX Specification

### Step 1 Layout

The unified step displays:

**Section A: Extract via Text (Primary)**
```
Paste Association & Contact Details
[Textarea - 6 rows, placeholder text]
[Auto-fill button] [Clear button]

[Success/Warning banner if applicable]

Association Details (if extracted)
- Name: [field, disabled on high confidence]
- Street: [field]
- City: [field]
- Postal Code: [field]
- Country: [field]

Contact Details (if extracted)
- Name: [field, disabled on high confidence]
- Email: [field, always editable]
- Phone: [field, optional]
```

**OR**

**Section B: Use Existing Records (Secondary)**
```
Association *
[Dropdown: -- Select Association --]
[List of existing associations]

Contact *
[Dropdown: -- Select Contact --]
[List of existing contacts]
```

**Always Present:**
```
Season *
[Dropdown: -- Select Season --]
[List of seasons]

[Cancel] [Next: Pricing & Leagues]
```

### Visual States

**Extraction Form Active:**
- Dropdowns are visible but de-emphasized (grayed out, disabled)
- User can still click to use dropdowns as fallback
- Clear visual hierarchy favoring extraction

**Dropdowns Active:**
- Extraction textarea is visible but de-emphasized
- User can still paste and extract as alternative
- Clear visual hierarchy favoring selection

**Mixed Mode:**
- Both sections equally active
- User can combine (e.g., extract + select contact)

### Error States

- Missing required field: inline error message below field, red border
- Low confidence extraction: yellow warning banner, editable fields
- Empty selection on submit: show error, don't advance

---

## Implementation Strategy

### Phase 1: Component Extraction
- Extract Step 1 logic from OfferCreateWizard into new OfferWizardStep1 component
- Keep Step 2 and Step 3 logic in place initially

### Phase 2: Add Extraction Form
- Import AssociationContactForm into Step 1
- Add layout to show both extraction and dropdowns
- Implement state toggle between modes

### Phase 3: Validation & Duplicate Detection
- Implement validation logic for mixed extraction/selection
- Add duplicate detection (reuse existing records if match found)
- Add error handling and user feedback

### Phase 4: Integration
- Update OfferCreateWizard to use new 2-step flow
- Remove old Step 2 component
- Test full wizard flow

### Phase 5: Testing & Refinement
- Unit tests for Step 1 component
- Integration tests for offer creation
- Manual testing of all user journeys

---

## Success Criteria

✅ Wizard reduces from 3 steps to 2 (consolidates association + contact selection)
✅ Users can extract both association and contact from pasted text
✅ Users can select from dropdowns as alternative to extraction
✅ Users can mix extraction and dropdown selection
✅ System detects duplicate records and offers to reuse them
✅ All required fields validated before proceeding to Step 2
✅ Existing Step 2 (pricing/leagues) works unchanged with new Step 1
✅ Form handles ambiguous extractions gracefully (warnings + editable fields)
✅ All tests pass (unit + integration)
✅ Manual testing confirms all user journeys work

---

## Not in Scope

- Modifying Step 2 (pricing & leagues) - unchanged
- Auto-detecting league preferences from extracted data
- Storing extraction history or templates
- Bulk offer creation
- Mobile responsiveness optimization (use existing patterns)

---

## Questions for Implementation

Before starting implementation:
1. Should we show a success message when offer is created?
2. Should the wizard remember selections if user navigates away and returns?
3. When duplicate is detected, should we auto-select it or ask user first?
4. Should we track which path users take (extraction vs. selection) for analytics?
