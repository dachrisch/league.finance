# Association & Contact Creation with Text Extraction

**Date:** 2026-04-14  
**Status:** Design Approved  
**Scope:** Replace separate AssociationForm and ContactForm with unified form supporting text extraction and duplicate detection

---

## Overview

Currently, users must manually enter association and contact information in separate forms with many individual fields. This design introduces a unified form with intelligent text extraction from pasted text blocks and automatic duplicate detection to prevent creating duplicate contacts and associations.

**Example input text:**
```
American Football und Cheerleading Verband Nordrhein-Westfalen e.V.
Fabian Pawlowski
Halterner Straße 193
45770 Marl
```

**Expected extraction:**
- Association: "American Football und Cheerleading Verband Nordrhein-Westfalen e.V."
- Contact: "Fabian Pawlowski"
- Address: "Halterner Straße 193", "Marl", "45770", "Germany"

---

## Data Model Changes

### Association Entity

**Current fields:**
- name (required)
- description
- email (required)
- phone (required)

**New fields:**
- name (required)
- address (required):
  - street (required)
  - city (required)
  - postalCode (required)
  - country (required)

**Removed:**
- description
- email
- phone

### Contact Entity

**Current fields:**
- name (required)
- address (required):
  - street (required)
  - city (required)
  - postalCode (required)
  - country (required)

**New fields:**
- email (required)
- phone (optional)

No structural changes needed, just field additions.

### Relationship

- Contacts are shared across multiple associations
- Offers link to Association
- No direct link between Contact and Association (can be created independently)
- When creating together, both are saved and the user can link them in subsequent workflows

---

## Component Design

### AssociationContactForm Component

**Location:** `src/client/components/AssociationContactForm.tsx`

**Props:**
```typescript
interface AssociationContactFormProps {
  onSubmit: (data: {
    association: {
      name: string;
      address: { street: string; city: string; postalCode: string; country: string };
    };
    contact: {
      name: string;
      email: string;
      phone?: string;
    };
    // Track what was created vs. reused
    createdEntities: {
      associationId?: string; // populated if created
      contactId?: string;      // populated if created
    };
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  // Optional: pre-fill if editing existing entities
  initialAssociationId?: string;
  initialContactId?: string;
}
```

**States:**
1. **Empty** - Textarea only, "Auto-fill" button
2. **Extracting** - Loading state with spinner
3. **Success** - High confidence: disabled extracted fields + preview
4. **Ambiguous** - Low confidence: enabled extracted fields + yellow warnings
5. **Confirmation** - Show matches found + what will be created/reused

---

## Text Extraction Algorithm

### Phase 1: Parse Text

Input: Raw text block  
Output: Extracted fields with confidence scores

**Parsing strategy:**
1. Split text by newlines
2. First line(s) = Organization name (until person name detected)
3. Next standalone name = Contact name
4. Remaining lines = Address components + contact info (email, phone)

**Address parsing:**
- Look for patterns: "Street Number, PostalCode City" or similar
- German format: "Straße 123, 12345 Stadt"
- Try to extract: street, postal code (5 digits), city, country

**Contact info:**
- Regex for email: standard email pattern
- Regex for phone: +country code or leading zeros

### Phase 2: Confidence Scoring

**High confidence (disable extracted fields):**
- All 4 address parts found
- Organization name found
- Contact name found
- Email found (non-generic)

**Medium confidence (enable & highlight):**
- 3 of 4 address parts found
- Generic email (contact@, info@, etc.)
- Unclear organization vs person name boundary

**Low confidence (show warning):**
- Address incomplete or unparseable
- No email found
- Ambiguous text structure

### Phase 3: Search for Existing Entities

**Contact search:**
- Primary: exact email match (case-insensitive)
- Secondary: exact name match + same city/postal code
- Return: matching contact or null

**Association search:**
- Primary: exact name match (case-insensitive)
- Secondary: fuzzy match (similarity > 80%) + same address
- Return: matching association or null

**Result states:**
- Both exist → "Reuse both"
- Association exists, contact doesn't → "Create contact, use existing association"
- Contact exists, association doesn't → "Create association, use existing contact"
- Neither exists → "Create both"

---

## UI/UX Flow

### Initial State

```
┌─────────────────────────────────────┐
│ Paste text:                         │
│ [Textarea with placeholder]         │
│ [Auto-fill button] [Clear button]   │
└─────────────────────────────────────┘
```

### After "Auto-fill" (Success Case)

```
┌──────────────────────────────────────────┐
│ ✓ Successfully extracted data             │
├──────────────────────────────────────────┤
│ Association Details (disabled fields)     │
│ ├─ Name: [extracted - read-only]          │
│ ├─ Street: [extracted - read-only]        │
│ ├─ City: [extracted - read-only]          │
│ └─ Postal Code, Country: [read-only]      │
├──────────────────────────────────────────┤
│ Contact Details                          │
│ ├─ Name: [extracted - read-only]          │
│ ├─ Email: [empty - editable, required]    │
│ └─ Phone: [empty - editable, optional]    │
├──────────────────────────────────────────┤
│ Preview:                                  │
│ "Will create: Association XYZ"            │
│ "Will use existing: Contact John (j@e)"   │
├──────────────────────────────────────────┤
│ [Cancel] [Create]                        │
└──────────────────────────────────────────┘
```

### After "Auto-fill" (Ambiguous Case)

Same layout but:
- Extracted fields are **enabled** (editable)
- Yellow highlight on uncertain fields
- Warning text: "⚠ Please verify this is correct"
- Generic email gets special warning: "Generic email found - verify contact details"

### Validation Rules

**Before submission, validate:**
1. Association name: required, min 2 characters
2. Association address: all 4 parts required and non-empty
3. Contact name: required, min 2 characters
4. Contact email: required, valid email format
5. Contact phone: optional, but if provided must be valid phone format
6. No whitespace-only fields

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Text extraction fails completely | Show warning: "Could not extract data. Please enter manually." Show manual entry fields. |
| Email validation fails | Show inline error: "Invalid email format" |
| Name too short | Show inline error: "Name must be at least 2 characters" |
| Missing required address parts | Highlight missing fields, block submission |
| Duplicate search errors | Log error, proceed with creation (warn user: "Could not check for existing records") |
| Email already exists with different contact | Show warning: "Email matches existing contact (John Smith). Use existing?" |
| Association name matches but different city | Show option: "Found similar association. Use it or create new?" |

---

## Implementation Phases

### Phase 1: Data Model & Schema Updates
- Update Association schema: remove email/phone/description, add address
- Update Contact schema: add email and phone fields
- Update validation schemas in `src/client/lib/schemas.ts` and `shared/schemas/contact.ts`

### Phase 2: Backend Search & Duplicate Detection
- Add endpoints or trpc queries to:
  - Search contact by email or name+address
  - Search association by name or fuzzy name
- Return match confidence and matched entities

### Phase 3: Text Extraction Logic
- Create utility: `parseContactAssociationText(text: string) → { association, contact, confidence }`
- Implement confidence scoring
- Add tests for various text formats (German, international, ambiguous)

### Phase 4: UI Component
- Create `AssociationContactForm.tsx` component
- Implement state machine for: empty → extracting → success/ambiguous → confirmation
- Add visual feedback for high/low confidence fields
- Implement field enable/disable based on confidence

### Phase 5: Integration & Testing
- Replace existing AssociationForm and ContactForm usage
- Update AssociationsPage and OfferCreateWizard
- Add end-to-end tests for extraction + duplicate detection

---

## Edge Cases & Considerations

### Text Parsing Edge Cases
- **Multiple people mentioned**: Use first standalone name
- **No clear address**: Ask user to enter manually
- **Address format variations**: Support common formats (street #, city, postal code)
- **German umlauts/special chars**: Preserve during parsing
- **Mixed languages**: Extract as-is, no translation

### Duplicate Detection Edge Cases
- **Email typos**: Use exact match only (no fuzzy email matching)
- **Name variations**: Exact match preferred, fuzzy only as secondary
- **Same person, different associations**: Create new contact if different email/address
- **Archived/inactive records**: Should we exclude? (TBD with user)

### Phone Number Handling
- Optional field
- Store as provided (no formatting enforcement)
- Support international format (+49, 0049) and local format (02365 12345)

---

## Success Criteria

- ✓ Users can paste unstructured text and auto-extract association + contact data
- ✓ System prevents duplicate associations and contacts
- ✓ Confidence scoring gives users appropriate feedback (disabled vs. editable fields)
- ✓ Phone moved from Association to Contact
- ✓ Address moved from Contact to Association
- ✓ Form validates all required fields before submission
- ✓ Users can still manually enter data if extraction fails
- ✓ Existing associations and contacts are reused when creating new offers

---

## Testing Strategy

### Unit Tests
- Text extraction: various input formats (German, international, ambiguous)
- Confidence scoring: high/medium/low confidence detection
- Address parsing: extract street, city, postal code, country
- Email extraction: find valid emails, ignore generic placeholders
- Phone extraction: international and local formats

### Integration Tests
- Extract text → search for duplicates → show correct UI state
- Create new association + contact together
- Reuse existing association, create new contact
- Reuse both existing entities
- Validation errors block submission

### UI Tests
- Fields disabled/enabled based on confidence
- Yellow highlights appear for low confidence
- Preview text shows correct create/reuse messages
- Cancel button works
- Submit triggers correct API calls

---

## Not in Scope (Future Enhancements)

- Automatic email lookup (e.g., from association website)
- Bulk import of multiple associations from CSV/Excel
- Fuzzy email matching (too risky for duplicates)
- Translation of organization names
- Country detection from address formatting
- Photo/attachment upload for association

---

## Questions for User Review

Before implementation, confirm:
1. Should archived/inactive contacts be excluded from duplicate search?
2. Should we log all extraction attempts (for debugging/analytics)?
3. Phone number format requirements (any validation)?
4. Should contacts created this way have a default "created_via_text_extraction" flag for tracking?

