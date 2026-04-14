# Offer Stepper Redesign: Layout & UX Improvements

**Date:** 2026-04-14  
**Status:** Design Approved  
**Scope:** Complete redesign of 2-step offer creation wizard with modernized visual design and improved UX

---

## Goals

1. **Reduce dialog bloat**: Keep each step under 400px height (currently grows to 500-600px+)
2. **Simplify cognitive load**: Show only relevant options for chosen path (Paste vs Use Existing)
3. **Modernize aesthetics**: Update color palette, typography, spacing, and visual hierarchy
4. **Prevent data duplication**: Detect existing associations/contacts and reference instead of duplicating
5. **Improve league selection**: Add search, filters, categories, and collapsible groups for easier multi-selection

---

## Design Principles

- **Progressive Disclosure**: Show only what's needed for current step/path
- **Collapsible Blocks**: One primary action visible, secondary options collapsed
- **Clear Path Selection**: Explicit choice between "Paste" and "Use Existing" workflows
- **Duplicate Prevention**: Smart detection with fallback suggestions
- **Modern Aesthetic**: Clean spacing, strong typography hierarchy, purposeful color use
- **Consistent Interaction**: Same patterns across both steps

---

## Step 1: Association, Contact & Season

### Container
- **Max width**: 600px
- **Max height**: 350px (scrollable if content exceeds)
- **Padding**: 20px
- **Background**: White with subtle shadow
- **Border radius**: 8px

### Top Bar
```
┌────────────────────────────────────┐
│ Create New Offer                   │
│                                    │
│ Step 1 of 2  ›  Step 2 of 2        │
└────────────────────────────────────┘
```

Progress indicator:
- Step 1: Dark navy circle + label (active)
- Separator: `›` in soft gray
- Step 2: Light gray circle + label (inactive)
- Font: 12px, medium weight

### Block 1: Paste & Extract (Default Open)

**Header** (clickable to collapse):
- Icon: Numbered circle `[1]` (dark navy when active)
- Title: "Paste & extract" (14px, bold)
- Subtitle: "Auto-fill from contact text" (12px, gray)
- Chevron: Points down when open (rotate 180° when closed)
- Hover state: Light gray background

**Body Content**:

1. **Textarea**
   - Placeholder: "e.g. AFCV NRW e.V.\nFabian Pawlowski\nHalterner Straße 193, 45770 Marl\nf.pawlowski@afcvnrw.de"
   - Height: 80px
   - Font: 12px monospace
   - Border: 1px solid #e5e7eb
   - Focus: Border color → #1a1a2e, subtle shadow

2. **Auto-fill Button** + Status Tag
   ```
   [↯ Auto-fill]  [Tag: status message]
   ```
   - Primary button: Dark navy background, white text, 12px
   - Status tag: Green background (#ecfdf5) + green text (#065f46) when success
   - Status tag: Blue background when processing
   - Appears inline after clicking

3. **Extracted Fields** (appears after successful extraction)
   ```
   ✓ High-confidence extraction
   Fields are read-only except email and phone
   
   Organization *
   [American Football...] (read-only, gray background)
   
   Address
   Street * [read-only]
   City * [read-only]
   Postal Code * [read-only]
   Country * [read-only]
   
   Contact Information
   Contact Name * [read-only]
   Email * [editable]
   Phone [editable, optional]
   ```

4. **Duplicate Detection** (appears after extraction)
   
   **Case A: Exact match found**
   ```
   ⚠️ Association "AFCV NRW e.V." already exists
      [Use existing]  [Create new anyway]
   
   ✓ Contact "Fabian Pawlowski" (f.pawlowski@...) - no duplicate
      Will create new contact
   ```
   
   **Case B: Fuzzy match found**
   ```
   ⚠️ "AFCV NRW e.V." not found, but similar:
      • AFCV Bayern e.V.
      • AFCV Berlin-Brandenburg e.V.
      [Use one of these]  [Create new]
   
   ⚠️ Contact email "f.pawlowski@..." - no match
      Will create new contact
   ```
   
   **Case C: No duplicates**
   ```
   ✓ Organization will be created: AFCV NRW e.V.
   ✓ Contact will be created: Fabian Pawlowski
   ```

---

### Block 2: Use Existing Records (Collapsed by default)

**Header**:
- Icon: Badge with "OR" text (light gray)
- Title: "Use existing records"
- Subtitle: "Pick association, contact & season"
- Chevron: Points down

**Body Content** (hidden by default, expands on click):
```
Association *
[Dropdown: -- Select association --]

Contact *
[Dropdown: -- Select contact --]

Season *
[Dropdown: -- Select season --]
```

**Behavior**:
- When user clicks this block header, Block 1 collapses automatically
- Only one block open at a time
- Dropdowns populated from existing data

---

### Block 3: Season (Appears based on path)

**Visibility logic**:
- If Block 1 path (Paste): Season block shows and becomes active (icon `[2]`)
- If Block 2 path (Use Existing): Season already in Block 2, Block 3 hidden
- After Block 2 dropdown selection: Block 3 hidden

**Header**:
- Icon: Numbered circle `[2]` (dark navy when active)
- Title: "Season"
- Subtitle: "Required to complete the offer"
- Chevron: Points down

**Body Content**:
```
Season *
[Dropdown: -- Select season --]

Note: Selected season determines available leagues in Step 2
```

---

### Footer

```
┌────────────────────────────────────┐
│ Step 1 of 2                        │
│               [Cancel]  [Next →]   │
└────────────────────────────────────┘
```

- Left: Step indicator text (11px, gray)
- Right: Two buttons
  - Cancel: Ghost style (border, transparent background)
  - Next: Primary style (dark navy, white text, disabled if required fields empty)

---

## Step 2: Pricing & Leagues

### Summary Section (Top, Sticky)

```
┌────────────────────────────────────┐
│ Summary                            │
├────────────────────────────────────┤
│ Association: AFCV NRW e.V. [Edit]  │
│ Contact: Fabian Pawlowski  [Edit]  │
│ Season: 2026               [Edit]  │
└────────────────────────────────────┘
```

- Background: Light gray (#f9fafb)
- Padding: 16px
- Each line: 13px text + [Edit] link (12px, blue, cursor pointer)
- [Edit] links are interactive — clicking jumps back to Step 1 and returns to Step 2 after changes

---

### Pricing Section

**Header**:
- Title: "Cost Model *" (14px, bold)
- No collapse — always visible

**Body Content**:
```
Radio button group:
◉ Season Flat Fee
◯ Per Game Day

Base Rate Override (€)
[Input field, placeholder: "Leave empty for default (€50)"]

Expected Teams Count
[Input field, type: number]
ℹ️ Used to estimate total cost for the association
```

- Radio buttons: 14px, dark navy when selected
- Input fields: Border 1px #e5e7eb, padding 8px, font 12px
- Info icon with helper text: 11px, gray, italic

---

### League Selector Section (Main Content, Scrollable)

**Search Bar**:
```
┌──────────────────────────────────┐
│ 🔍 Search by league name...      │
└──────────────────────────────────┘
```
- Icon: Search icon (subtle gray)
- Placeholder: "Search by league name..."
- Real-time filtering as user types
- Font: 12px
- Clears selected leagues if user types? **NO** — search is non-destructive filtering

**Category Filters**:
```
Filter by Type:
[All] [Youth] [Regional] [Division] [Other]
```
- Toggle buttons: Gray border, light background when inactive
- Active: Dark navy background, white text
- Font: 11px, bold
- Clicking a category shows/hides those leagues only

**Selection Summary**:
```
Selected (3 of 26) | [Select All] [Clear All]
```
- Counter: 12px, bold
- Bulk actions: Links (11px, blue, underline on hover)
- Updates in real-time as user clicks checkboxes

**Collapsible Category Groups**:

Each category shows as a collapsible section:
```
▼ Youth Leagues (3 available, 2 selected)
  ☑ AFVBY_U13  ✓
  ☑ AFVBY_U16  ✓
  ☐ AFVH_U13
  
▶ Regional Leagues (8 available, 1 selected)
  [Click to expand]
  
▶ Division Leagues (15 available, 0 selected)
  [Click to expand]
```

**Checkbox list behavior**:
- Show first 5 items in each category by default
- [+ Show X more] link if more items exist
- Each checkbox: 14px, checkbox icon, league name (12px), checkmark when selected (green ✓)
- Hover state: Light gray background
- Click to toggle checked state
- Changes reflected immediately in selection counter

---

### Footer

```
┌────────────────────────────────────┐
│ Step 2 of 2                        │
│      [← Back]  [Create Offer (Draft)]│
└────────────────────────────────────┘
```

- Left: Back button (secondary style)
- Right: Create Offer button (primary style, disabled until at least 1 league selected)

---

## Visual Design System

### Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Primary active | `#1a1a2e` | Block headers when active, buttons, selected checkboxes |
| Primary hover | `#0f0f1a` | Darker shade on hover |
| Secondary | `#6b7280` | Labels, help text, inactive icons |
| Success | `#10b981` | Checkmarks, success tags, confirmation states |
| Success bg | `#ecfdf5` | Success tag background |
| Border | `#e5e7eb` | Form borders, dividers |
| Background | `#ffffff` | Cards, form backgrounds |
| Background hover | `#f9fafb` | Hover state for clickable areas |
| Text primary | `#1f2937` | Body text, field values |
| Text secondary | `#6b7280` | Labels, helper text |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|------------|
| Page title | Sans | 15px | 500 | 1.4 |
| Block header | Sans | 14px | 600 | 1.4 |
| Block subtitle | Sans | 12px | 400 | 1.4 |
| Form label | Sans | 11px | 500 | 1.4 |
| Form input | Sans | 13px | 400 | 1.5 |
| Help text | Sans | 11px | 400 | 1.5 |
| Button | Sans | 12px | 500 | 1.4 |

### Spacing

- **Gutters**: 20px (card padding)
- **Vertical gaps**: 12px (between form fields), 16px (between sections)
- **Horizontal gaps**: 8px (between inline elements)
- **Border radius**: 8px (cards), 6px (buttons/inputs), 4px (small elements)

### Interactions

- **Transition time**: 150ms (smooth)
- **Button hover**: Opacity 0.9, no scale
- **Block collapse**: Max-height transition, opacity fade
- **Checkbox click**: Immediate visual feedback (checkmark appears)
- **Search input**: Real-time filtering (debounce 200ms)

---

## Duplicate Detection Logic

### Data Model
```typescript
// Association
{
  _id: ObjectId
  name: string        // "AFCV NRW e.V."
  email?: string
  phone?: string
}

// Contact
{
  _id: ObjectId
  name: string        // "Fabian Pawlowski"
  email: string       // primary unique key for duplicate detection
  street: string
  city: string
  postalCode: string
  country: string
}
```

### Extraction + Duplicate Check Flow

**Step 1: Extract fields from text**
```
Input: "AFCV NRW e.V.\nFabian Pawlowski\nf.pawlowski@afcvnrw.de\n..."
Output: {
  orgName: "AFCV NRW e.V.",
  contactName: "Fabian Pawlowski",
  email: "f.pawlowski@afcvnrw.de",
  ...
}
```

**Step 2: Check for exact association match**
```
Query: Association.findOne({ name: "AFCV NRW e.V." })
If found:
  Show: "Association already exists - [Use existing] [Create new anyway]"
Else:
  Check for fuzzy match (levenshtein distance < 3)
  If fuzzy match found:
    Show: "Did you mean: <suggestion list> - [Use one] [Create new]"
  Else:
    Show: "✓ Organization will be created"
```

**Step 3: Check for exact contact match**
```
Query: Contact.findOne({ email: "f.pawlowski@afcvnrw.de" })
If found:
  Show: "Contact already exists"
  Pre-fill contact name from existing record
  Warn if contact details differ
Else:
  Show: "✓ Contact will be created"
```

### User Actions
- **[Use existing]**: Reference existing association/contact, don't create
- **[Create new anyway]**: Ignore duplicates, create new records (for intentional duplicates)
- **[Use one of these]**: Select from fuzzy matches

---

## Component Architecture

```
OfferCreateWizard.tsx (parent container)
├── Step1.tsx (Association, Contact & Season)
│   ├── PasteExtractBlock.tsx
│   │   ├── TextareaInput
│   │   ├── AutoFillButton
│   │   ├── ExtractedFieldsDisplay
│   │   └── DuplicateDetectionUI
│   ├── UseExistingBlock.tsx
│   │   ├── AssociationDropdown
│   │   ├── ContactDropdown
│   │   └── SeasonDropdown
│   └── SeasonBlock.tsx
│
├── Step2.tsx (Pricing & Leagues)
│   ├── SummarySection.tsx
│   ├── PricingSection.tsx
│   └── LeagueSelectorSection.tsx
│       ├── SearchBar
│       ├── CategoryFilters
│       ├── SelectionSummary
│       └── CategoryGroup.tsx (repeating)
│           ├── GroupHeader (collapsible)
│           └── CheckboxList
│
└── WizardFooter.tsx
```

---

## Data Flow

```
User Input
  ↓
Step 1: Extract/Select Association, Contact, Season
  ├─ API: POST /api/extract (text → fields)
  ├─ API: GET /api/associations?search=... (duplicate check)
  ├─ API: GET /api/contacts?email=... (duplicate check)
  └─ API: GET /api/seasons
  ↓
Step 2: Configure Pricing & Select Leagues
  ├─ API: GET /api/leagues?season=... (load leagues)
  ├─ Form: Cost model, base rate, team count
  ├─ Selection: Multiple leagues from categories
  └─ API: POST /api/offers/create (create offer with all selections)
  ↓
Redirect to /offers/{offerId}
```

---

## Accessibility Considerations

- **Focus management**: Tab order follows logical flow (top to bottom, fields → buttons)
- **Keyboard navigation**: 
  - `Tab` to move between fields/buttons
  - `Enter` to toggle blocks, activate buttons
  - `Space` to check/uncheck checkboxes
  - `Escape` to close any popups (if used)
- **ARIA labels**: 
  - `aria-expanded="true|false"` on collapsible blocks
  - `aria-label` on icon-only buttons
  - `aria-describedby` linking form fields to help text
- **Color + text**: Never rely on color alone (use icons, text labels)
- **Contrast**: All text meets WCAG AA (4.5:1 for small text)
- **Error messages**: Clear, specific text (not just red highlighting)
- **Touch targets**: Minimum 44px height for mobile

---

## Mobile Responsiveness

- **Breakpoints**: 768px (tablet), 480px (mobile)
- **Max width**: Adjust to 90vw on mobile (some padding)
- **League selector**: On mobile, categories show 3 items by default, [+ Show more] expanded
- **Summary section**: Stack vertically on mobile (full width)
- **Buttons**: Full width on mobile, stacked vertically

---

## Testing Considerations

### Unit Tests
- Extraction regex correctly parses various text formats
- Duplicate detection queries return correct results
- Form validation prevents empty required fields

### Integration Tests
- Paste → Extract → Detect duplicates → Submit
- Use Existing path → Select from dropdowns → Next
- Season selection required before proceeding
- Pricing inputs validate (positive numbers, etc.)
- League selection: filter, search, select all/clear all work

### E2E Tests
- Complete flow: Paste text → Step 2 → Select leagues → Create offer
- Alternate flow: Use Existing → Step 2 → Create offer
- [Edit] links in Step 2 summary jump back to Step 1 correctly
- Mobile responsiveness on league selector

---

## Success Metrics

After implementation, measure:
1. **Dialog height**: Stays under 400px (Step 1), under 500px (Step 2)
2. **Time to complete**: 40-50% faster for multi-league offers (step 4 removed, search added)
3. **Error rate**: Fewer duplicate creates, clearer validation messages
4. **User feedback**: Net Promoter Score on offer creation flow

---

## Out of Scope (Next Phase)

- Mobile-specific modals for league selection
- Advanced filtering (by season, team count, etc.)
- Bulk offer creation
- Offer templates
- Analytics on which paths users prefer
