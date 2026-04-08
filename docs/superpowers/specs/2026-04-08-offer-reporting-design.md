# Offer & Reporting Tool Design Spec

**Date:** 2026-04-08
**Status:** Draft
**Owner:** Feature Development

## Overview

Extend leagues.finance to create a comprehensive offer and reporting system. Offers are the source of truth for pricing proposals sent to associations. The system generates PDF offers, stores them in Google Drive, tracks offer lifecycle (Draft → Sent → Viewed → Negotiating → Accepted/Rejected), and provides basic reporting on offer status and revenue.

## Key Concept Change

**Offers become the parent entity.** FinancialConfig and OfferLineItem are children of Offer. This represents a fundamental shift from "configs define pricing" to "offers propose pricing using configs as inputs."

## Data Models

### Association (New - MongoDB)

```typescript
interface IAssociation extends Document {
  name: string;
  description: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Purpose:** Represents a league grouping entity (e.g., "Northern Region Leagues"). Contact info is used as default recipient for offer emails.

### Offer (New - MongoDB)

```typescript
interface IOffer extends Document {
  associationId: ObjectId;
  seasonId: number; // from MySQL gamedays_season
  selectedLeagueIds: number[]; // array of league IDs included in offer
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED';
  driveFileId: string | null; // Google Drive PDF ID
  sentTo: Array<{ email: string; sentAt: Date }>;
  notes: string; // internal negotiation notes
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  completedAt: Date | null; // when accepted or rejected
}
```

**Purpose:** Top-level offer entity. Tracks offer lifecycle and Drive storage.

### OfferLineItem (New - MongoDB)

```typescript
interface IOfferLineItem extends Document {
  offerId: ObjectId;
  leagueId: number;
  leagueName: string; // cached for reporting
  basePrice: number; // calculated from financeCalculator
  customPrice: number | null; // user override
  finalPrice: number; // coalesce(customPrice, basePrice)
  createdAt: Date;
  updatedAt: Date;
}
```

**Purpose:** Individual league pricing within an offer. Allows per-league customization while tracking base vs. custom prices.

### FinancialConfig (Modified)

Add to existing model:
```typescript
offerId?: ObjectId; // optional reference to parent offer
```

This allows configs to be associated with specific offers while maintaining backward compatibility.

## Workflows

### 1. Create Offer

**Trigger:** User initiates offer creation
**Steps:**
1. User selects Association + Season
2. System creates Offer in `DRAFT` status
3. Offer is ready for league selection

**Outcome:** Empty Offer document created

---

### 2. Add Leagues to Offer

**Trigger:** User selects leagues from the chosen association
**Steps:**
1. User selects N leagues to include
2. For each league:
   - Fetch existing FinancialConfig (or create default if none exists)
   - Call financeCalculator with config
   - Create OfferLineItem with basePrice = calculated price
3. Generate PDF (see PDF Generation below)
4. Store PDF to Google Drive, save driveFileId to Offer
5. Offer remains in `DRAFT` status

**Outcome:** OfferLineItems created, PDF generated and stored

---

### 3. Customize Pricing (Optional)

**Trigger:** User modifies league prices before sending (only while offer is in `DRAFT` status)
**Steps:**
1. User can override individual league prices in the offer
2. Update OfferLineItem.customPrice
3. Recalculate OfferLineItem.finalPrice
4. Regenerate PDF with new pricing
5. Update Drive file (replace existing PDF)
6. Offer remains in `DRAFT` status

**Outcome:** Pricing customized, PDF updated on Drive

**Constraint:** Once an offer is transitioned to `SENT` or beyond, editing is disabled. To make changes after sending, user must either reopen as DRAFT (if business allows) or create a new offer.

---

### 4. Send Offer

**Trigger:** User marks offer as ready to send
**Steps:**
1. Confirm action: status transitions DRAFT → SENT
2. Display form with:
   - Pre-filled email from Association contact
   - Option to add/modify cc, bcc recipients
3. User confirms recipients and submits
4. System:
   - Sends email with Drive link + summary table
   - Records sentTo entry with {email, sentAt: now()}
   - Updates offer.sentAt to now()
5. Status: SENT (offer may still be in DRAFT for edits, or locked depending on business logic)

**Outcome:** Email sent, sentTo log updated, status changed

---

### 5. Track Offer Lifecycle

**Via API/Dashboard:**
- Status updates to VIEWED, NEGOTIATING, ACCEPTED, or REJECTED (manually by user or via admin interface)
- Timestamps recorded: viewedAt, completedAt
- Notes field updated for negotiation tracking

**Outcome:** Audit trail of offer progression

---

## API Endpoints

### Associations
- `POST /trpc/finance.associations.create` - Create association
- `GET /trpc/finance.associations.list` - List all associations
- `GET /trpc/finance.associations.getById` - Fetch single association
- `PUT /trpc/finance.associations.update` - Update association details

### Offers
- `POST /trpc/finance.offers.create` - Create new offer (association + season, DRAFT status)
- `GET /trpc/finance.offers.list` - List offers (with filtering by status, association, season)
- `GET /trpc/finance.offers.getById` - Get offer details with all line items
- `POST /trpc/finance.offers.addLeagues` - Add leagues to offer (generates PDF, stores to Drive)
- `PUT /trpc/finance.offers.customizePrice` - Override price for a single league (triggers PDF regen)
- `PUT /trpc/finance.offers.updateStatus` - Transition status (DRAFT → SENT → VIEWED, etc.)
- `POST /trpc/finance.offers.send` - Send offer via email (captures recipients, emails, updates sentTo log)
- `GET /trpc/finance.offers.summary` - Dashboard summary (count by status, total revenue)

## PDF Generation & Storage

### PDF Template

Use the structure from the reference Google Doc:
- Association name / logo area
- Season info
- Table with league details: league name, basePrice, customPrice (if applicable), finalPrice
- Subtotals, terms, contact info
- Generated timestamp

### Generation Process

1. **On client:** Collect offer data (leagues, prices)
2. **On server:**
   - Render template as HTML
   - Convert HTML → PDF (using `puppeteer`, `html2pdf`, or similar)
   - Upload PDF to Google Drive using OAuth access token
   - Store driveFileId in Offer document
3. **Retry logic:** If Drive upload fails, log error and alert user

### Google Drive Integration

- Use existing OAuth connection (assumption: already available from auth system)
- Create folder structure: `/leagues.finance/offers/{associationId}/`
- File naming: `{associationName}_{season}_{createdAt}.pdf`
- Share settings: Offer email recipients get view-only link

## UI/UX Structure

### New Pages

1. **Associations Management** (`/associations`)
   - List associations with basic info
   - Create/edit/delete associations
   - View associated active offers

2. **Offers Dashboard** (`/offers`)
   - List all offers with columns: association, season, league count, total price, status
   - Filter by status, association
   - Create new offer button
   - Reporting summary: count by status, total revenue

3. **Offer Detail/Create Wizard** (`/offers/:id` or `/offers/create`)
   - Step 1: Select association + season
   - Step 2: Select leagues to include (multi-select from list)
   - Step 3: Review & customize prices (optional override per league)
   - Step 4: Preview PDF (embedded or link to Drive)
   - Step 5: Send form (email recipients, confirm)

### Integration Points

- Link Associations section into Finance sidebar menu
- Link Offers section into Finance sidebar menu
- Dashboard summary card showing recent/pending offers

## Constraints & Assumptions

1. **OAuth Token Availability:** Google OAuth token is already available in the authentication context and can be used for Drive uploads
2. **PDF Library:** A PDF generation library (puppeteer, html2pdf, or similar) will be added to dependencies
3. **Email Service:** Existing email infrastructure can send templated emails with Drive links
4. **MySQL Queries:** Existing teamsRouter queries can fetch leagues, seasons, and team data
5. **Backward Compatibility:** Adding offerId to FinancialConfig is optional; existing configs without offerId are still valid
6. **Single Offer per Association-Season:** While multiple offers can exist for the same association-season, the typical workflow is one active offer at a time (others are archived/completed)

## Success Criteria

1. ✅ User can create associations with name, description, email, phone
2. ✅ User can create offers for an association-season pair
3. ✅ User can select multiple leagues to include in an offer
4. ✅ System calculates and displays pricing for selected leagues
5. ✅ User can customize individual league prices
6. ✅ PDF is generated and stored to Google Drive
7. ✅ User can send offer via email to configurable recipients
8. ✅ Offer status transitions are tracked (Draft → Sent → Viewed → Negotiating → Accepted/Rejected)
9. ✅ Dashboard shows basic reporting: count by status, total revenue, list of all offers
10. ✅ Offer details page shows all line items and historical status changes

## Future Enhancements

- Advanced reporting: revenue by association, accepted/rejected ratios, average response time
- Email templates customization
- Bulk offer generation for multiple associations
- Offer versioning/comparison (compare old vs. new proposals)
- Acceptance/rejection workflow (e.g., accept buttons in email)
- Integration with external invoicing systems

## Technical Notes

- **Database:** MongoDB for Associations, Offers, OfferLineItems (flexible schema for customization); MySQL for season/league/team reference data (read-only)
- **File Storage:** Google Drive as primary storage; local caching optional for performance
- **Email:** Templated emails with Drive link and embedded summary table
- **PDF Library:** Recommend `puppeteer` for robust HTML → PDF conversion; fallback to `html2pdf` if server resource constraints exist
