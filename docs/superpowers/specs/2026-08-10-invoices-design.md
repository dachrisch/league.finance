# Invoices — Design

> Status: approved design (brainstorm 2026-08-10).

## Goal

Add an **Invoice** feature to leagues.finance. An invoice is created from an
accepted `Offer`, covering a subset of its league line items. For each league,
the operator sees the offer's locked-in price side by side with a **live**
recalculation (actual current teams / played gamedays, pulled from
LeagueSphere's prod MySQL) and picks which number to bill, or types a manual
override. Invoices generate a PDF and file to Google Drive, mirroring the
existing offer PDF/Drive pipeline, and (best-effort) mirror customer and
invoice data into the existing Google Sheets ledger the business runs today.

## Background

Offers already carry per-league pricing via `FinancialConfig` (locked-in
"expected" numbers set at offer time, `computeConfigPrices()`) and a separate
**live** recalculation pipeline already exists and is wired into
`ConfigDetailPage` — `finance.calculate.forConfig` runs
`resolveBaseRate()` + `fetchMysqlData()` + `calculateCosts()` to get the
actual current gross/net from LeagueSphere's read-only prod MySQL (actual
registered teams for `SEASON` cost-model leagues, actual played-gameday
participation for `GAMEDAY` leagues). Invoices reuse this pipeline rather than
inventing a new one.

The business has been invoicing manually via a Google Sheet
(`1yLKEp-dQw7Etz6n-XVoRi8nPXGhLqFcDVcTN6nVrLlk`) with three tabs: **Clients**
(`clientId, clientName, standardInvoiceAddress, clientDomain`), invoice
**line items** (`invoiceId, position, description, quantity, net, vat,
netSum, vatAmount, grossSum, jobPeriod`), and **Invoices**
(`invoiceId, clientId, invoiceAddress, invoiceName, invoiceDate, jobPeriod,
invoiceCurrency, paymentTerm, state, ..., netSum, grossSum, vatSum, ...`).
A real sample invoice PDF (`20260529-01`, AFCV NRW) fixes the exact layout and
field set this feature must reproduce. Five 2026-season invoices are
currently queued (empty) in that sheet — this feature is meant to replace
that manual process going forward, not just supplement it.

## Decisions (from brainstorm)

- Invoices can only be created from **accepted** offers.
- Multiple invoices per offer are allowed; an invoice always covers **whole**
  league line items (never a split/partial amount within one league — that's
  a future v2). The operator picks which of the offer's leagues to include
  each time.
- Per included league, the operator chooses **offer price**, **live price**,
  or a **manual override** — binary-plus-override, same shape as
  `FinancialConfig.customPrice` today.
- Invoice status: `draft → sent → paid` (simpler than the legacy sheet's
  5-state `draft/open/paid/overdue/canceled` — deliberately narrower for v1).
- VAT: fixed 19%, always charged (not the §19 UStG small-business exemption).
- Invoice numbering: `YYYYMMDD-NN`, sequence resets daily, zero-padded to 2
  digits (e.g. `20260810-01`, `20260810-02`, ...).
- Payment term: fixed 30 days (`dueDate = invoiceDate + 30 days`).
- A `customerNumber` field is added to `Association` (e.g. `10010` for AFCV
  NRW) — a manually-assigned business ID, **not** derived from
  `leaguesphereAssociationId`. It must be set before an invoice can be
  created for that association.
- One optional **discount** per invoice (type `FIXED`/`PERCENT` + a
  description), reducing the net subtotal before VAT — rendered as an extra
  negative row in the line-items table, matching how the legacy sheet
  represents discounts (e.g. "LeagueSphere App Einstiegsrabatt Saison 2025 |
  -630,00 €").
- No edit wizard for draft invoices in v1 — corrections happen by deleting a
  draft invoice and re-running the creation flow (mirrors how offers only got
  a full edit wizard as a separate, later feature).
- Best-effort two-way-adjacent sync to the Google Sheet: writing app → sheet
  only (the app's MongoDB is the source of truth). Sync failures never block
  or fail the underlying app operation — they're logged as warnings.

## Data model

### `Association` (extend)

```ts
customerNumber: number | null; // manually set; unique+sparse index
```

Existing associations start with `customerNumber: null`. Invoice creation is
blocked (`BAD_REQUEST`) until the operator sets it via the association edit
form.

### `Invoice` (new)

```ts
offerId: ObjectId;          // ref Offer
associationId: string;      // copied from offer at creation
contactId: ObjectId;        // ref Contact, snapshotted from offer
customerNumber: number;     // snapshotted from Association.customerNumber
seasonId: number;           // copied from offer
invoiceNumber: string;      // "YYYYMMDD-NN", unique
invoiceDate: Date;
servicePeriod: string;      // "M.YYYY", derived from invoiceDate
dueDate: Date;               // invoiceDate + 30 days
status: 'draft' | 'sent' | 'paid';
paidAt?: Date;
discount?: {
  type: 'FIXED' | 'PERCENT';
  value: number;
  description: string;
} | null;
driveMetadata?: {
  driveFileId?: string;
  driveFolderId?: string;
  driveLink?: string;
  filedAt?: Date;
  lastAttempt?: Date;
  failureReason?: string;
};
sendJobId?: string;
sendJobAttempts?: number;
sheetSync?: {
  clientRowSyncedAt?: Date;
  invoiceRowSyncedAt?: Date;
  lastError?: string;
};
```

Same timestamps/index conventions as `Offer`. `financialConfigId` is not
stored on `Invoice` directly — it lives per line item.

### `InvoiceLineItem` (new)

```ts
invoiceId: ObjectId;          // ref Invoice
leagueId: number;
financialConfigId: ObjectId;  // ref FinancialConfig, for traceability
offerPrice: number;           // snapshot: computeConfigPrices(config).finalPrice
livePrice: number;            // snapshot: calculateCosts(...).net at creation time
liveBasis: number;            // liveParticipationCount at creation time (teams or gameday participants)
chosenSource: 'offer' | 'live' | 'custom';
customPrice: number | null;
amount: number;                // resolved, billed net amount — permanent, never recomputed
```

`offerPrice`, `livePrice`, `liveBasis`, and `amount` are all **stored
snapshots**, unlike `FinancialConfig`'s derive-on-read pricing — once a line
item exists it must not silently change if MySQL data or the offer changes
later. VAT/gross are computed on read (fixed 19% rate), not stored.

Unique index: `{ invoiceId: 1, leagueId: 1 }`.

## Pricing, numbering, VAT

`finance.invoices.create` input: `{ offerId, leagueIds: number[] }`.

1. `offer.status !== 'accepted'` → `BAD_REQUEST`.
2. Look up the `Association`; `customerNumber == null` → `BAD_REQUEST` with a
   message pointing at editing the association.
3. For each `leagueId`, load its `FinancialConfig` (must belong to
   `offerId`):
   - `offerPrice = computeConfigPrices(config).finalPrice`
   - Fetch live data the same way `calculate.forConfig` does:
     `resolveBaseRate(config, settings)` → `fetchMysqlData(pool, config)` →
     `calculateCosts({...})` → `livePrice = result.net`,
     `liveBasis = result.liveParticipationCount`
   - `chosenSource` defaults to `'offer'`; `amount` defaults to `offerPrice`.
     (The create-invoice UI lets the operator change the per-line selection
     before submitting — see UI section — so the mutation input actually
     carries `{ leagueId, chosenSource, customPrice? }` per line, and the
     server resolves `amount` from whichever source was chosen, validating
     `customPrice` is present when `chosenSource === 'custom'`.)
4. Generate `invoiceNumber`: `datePart = YYYYMMDD` (today, server TZ);
   `count = Invoice.countDocuments({ invoiceNumber: /^datePart-/ })`;
   `seq = String(count + 1).padStart(2, '0')`. Unique index on
   `invoiceNumber` catches races; a duplicate-key error surfaces as
   `CONFLICT` (same handling as `Offer.create`'s season/association
   uniqueness today).
5. `invoiceDate = now`; `servicePeriod = `${invoiceDate.getMonth()+1}.${invoiceDate.getFullYear()}`` (no zero-padding, matching the sample: `"5.2026"`); `dueDate = invoiceDate + 30 days`.
6. Persist `Invoice` (`status: 'draft'`) + one `InvoiceLineItem` per league in
   a transaction (same `supportsTransactions()` pattern as `Offer.create`).
7. Best-effort: upsert the association's row in the Sheets **Clients** tab if
   not already synced (see Sheets sync section) — failure is logged, not
   thrown.

**VAT**: `VAT_RATE = 0.19` constant in a new `src/server/lib/invoicePricing.ts`
(mirrors `configPricing.ts`). Per line: `vat = round2(amount * 0.19)`,
`gross = round2(amount + vat)`. Invoice totals:
`netTotal = round2(Σ line.amount − discountAmount)`,
`vatTotal = round2(netTotal * 0.19)`, `grossTotal = round2(netTotal + vatTotal)`,
where `discountAmount` is computed from `invoice.discount` the same way
`applyDiscounts()` in `financeCalculator.ts` works today (FIXED = flat
subtraction, PERCENT = percentage of the pre-discount subtotal).

**Line item description** (PDF/table only, not stored): first line renders as
`"LeagueSphere App Saison <seasonName> - <firstLeagueName>"`; every
subsequent line renders as just `<leagueName>`. Quantity is always `1`.

## PDF generation

`PdfService.generateInvoicePdf(data: InvoicePdfGenerationData): Promise<Buffer>`
— new method, same pdfkit machinery as `generateOfferPdf` (A4, 50pt margins,
`Helvetica`/`Helvetica-Bold`, `euro()`/`deDate()` helpers). Sections,
top→bottom:

1. **Header** — identical to the offer PDF: "bumbleflies" wordmark + company
   line + rule.
2. **Recipient** — `association.name` (bold) → `"z.H. " + contact.name` →
   `contact.address.street` → `${contact.address.postalCode} ${contact.address.city}`.
   No country or email line (differs from the offer PDF's recipient block).
3. **Meta block** (right-aligned labels): Kundennummer, Rechnungsnummer,
   Rechnungsdatum, Leistungszeitraum.
4. **Title**: "Rechnung".
5. **Table** — columns **Pos · Beschreibung · Anzahl · Preis · Netto ·
   MwSt. · Brutto**, one row per line item ordered by league position in the
   offer's `leagueIds` array (stable regardless of selection order), plus a
   final negative discount row (Beschreibung = `invoice.discount.description`
   or "Rabatt") when a discount is set.
6. **Totals** — Nettobetrag / `MwSt. 19 %` / **Gesamtbetrag** (bold).
7. **Payment note** — "Bitte bezahlen Sie die Rechnung innerhalb von 30 Tagen
   nach Erhalt auf unten aufgeführtes Konto." + bold
   `Verwendungszweck: <customerNumber>-<invoiceNumber>` + "Bei Fragen wenden
   Sie sich bitte an info@bumbleflies.de".
8. **Footer** — three columns: (1) company name/address/email/phone/website,
   (2) "Bankverbindung": GLS Gemeinschaftsbank eG Bochum, IBAN
   `DE96430609671106170600`, Kontonummer `1106170600`, BIC `GENODEM1GLS`,
   (3) "Geschäftsführer:" Christoph Kämpfe / Christian Dähn / Sebastian
   Keller, HRB `260473 München`, Steuernummer `143/122/61929`. All constants,
   taken verbatim from the sample invoice.

`PdfService.generateInvoiceFilename(invoiceNumber, associationName,
customerNumber, seasonName, invoiceDate)` →
`"<YYYY-MM>.<invoiceNumber> - <first word of associationName> <customerNumber> - Nutzung der LeagueSphere App für die Saison <seasonName>.pdf"`
— reproduces the sample filename exactly.

## Drive filing

New `FileInvoiceJob` (`src/server/jobs/FileInvoiceJob.ts`) + `invoiceDriveQueue`
(Bull, mirrors `offerDriveQueue`) + `invoicesDriveRouter`
(`fileInvoiceInDrive`, `getInvoiceDriveStatus`, `retryInvoiceFiling`) — same
shape as `offers-drive.ts` and `FileOfferJob.ts`:

- `fileInvoiceInDrive({ invoiceId, driveFolderId })`: only from `status ===
  'draft'`; builds priced line items (already resolved — no recompute),
  enqueues the job, sets `status: 'draft'` → stays `'draft'` with
  `sendJobId` set while the job runs (mirrors the offer's `'sending'`
  interstitial, but since invoices don't have a `'sending'` status in this
  simpler 3-state model, the UI shows a progress dialog driven by job state
  instead of a status value).
- Job: generate PDF → validate/upload to Drive folder → on success, set
  `status: 'sent'`, `driveMetadata`, clear `sendJobId`/`sendJobAttempts`;
  best-effort append to the Sheets **Invoices** + line-item tabs (see below).
  On failure: record `driveMetadata.failureReason`, leave `status: 'draft'`,
  increment `sendJobAttempts` (same recovery shape as `FileOfferJob`).
- `FileInvoiceDialog.tsx` (client) mirrors `FileOfferDialog.tsx` — folder
  picker, mutation call, polling loop, progress UI.

## Google Sheets sync

New `SheetsService` (`src/server/services/SheetsService.ts`), same
`google.auth.OAuth2()` + `setCredentials({ access_token })` construction as
`DriveService`, using `google.sheets({ version: 'v4', auth })` against
spreadsheet `1yLKEp-dQw7Etz6n-XVoRi8nPXGhLqFcDVcTN6nVrLlk`.

- Add `https://www.googleapis.com/auth/spreadsheets` to the OAuth scope list
  in `app.ts` (alongside the existing `drive.file`/`drive.readonly`/
  `gmail.send`). **Requires one re-login** per user after this ships —
  existing stored refresh tokens don't carry the new scope until then.
- **On `customerNumber` set/changed** (in `associations.update`): best-effort
  upsert the association's row in the **Clients** tab, matched by
  `clientId` — write `clientId, clientName, standardInvoiceAddress`
  (composed as `"<name>\nz.H. <primary contact name>\n<street>\n<postalCode> <city>"`
  from the association + its most recently linked contact, if any);
  `clientDomain` is left untouched if the row already exists (the app has no
  source for it).
- **On invoice creation**: best-effort append one row per `InvoiceLineItem`
  to the line-items tab (`invoiceId, position, description, quantity, net,
  vat, netSum, vatAmount, grossSum, jobPeriod`) and one row to the
  **Invoices** tab (`invoiceId, clientId, invoiceAddress, invoiceName,
  invoiceDate, jobPeriod, invoiceCurrency, paymentTerm, state, netSum,
  grossSum, vatSum`) — `invoiceName` fixed to `"Nutzung der LeagueSphere App
  für die Saison <seasonName>"`. Legacy Apps-Script-only columns
  (`finalInvoiceUrl`, `invoicePdfGenerationUrl`, `nameTemplate`) are left
  blank.
- **On status change** (`sent`/`paid`): best-effort update the `state` cell
  in the matching Invoices-tab row (matched by `invoiceId`).
- All sync calls are wrapped in try/catch; failures set
  `invoice.sheetSync.lastError` and log a warning — they never fail the
  triggering app operation (association update, invoice creation, or Drive
  filing).

## UI/UX flow

- **`OfferDetailPage`**: when `offer.status === 'accepted'`, show a "Create
  Invoice" button plus a list of invoices already created from this offer
  (number, date, status badge, total, link to detail). Leagues already
  covered by an existing invoice show an "Already invoiced" badge in the
  create flow but remain selectable (no hard block).
- **`InvoiceNewPage`** (`/offers/:offerId/invoices/new`): checkbox per
  offer league to include; for each selected league, a row with **Offer
  Price** / **Live Price** (showing the live basis, e.g. "14 teams" or "3
  gamedays played") / **Custom** as radio + amount input. An optional
  discount section (type, value, description) below the table. "Create Draft
  Invoice" submits.
- **`InvoiceDetailPage`** (`/invoices/:id`): header (customer number, invoice
  number, invoice/due dates, status badge), line-items table (mirrors the
  PDF's net/VAT/gross columns), totals, discount row if present. Actions:
  "File in Drive" (draft only, opens `FileInvoiceDialog`) → `sent`; "Mark as
  Paid" (sent only) → `paid`, sets `paidAt`; "Delete" (draft only, mirrors
  offer delete: blocked once non-draft).
- **`InvoicesPage`** (`/invoices`): list mirroring `OffersPage` — status
  filter, association/season columns, total, links to detail.
- `Association` edit form (`AssociationForm.tsx`) gets a `customerNumber`
  number input.
- New routes added to `App.tsx`; a nav link added alongside "Offers".

## Testing

- `invoicePricing.ts`: unit tests for VAT/gross computation and discount
  application (FIXED/PERCENT), mirroring `configPricing`/`financeCalculator`
  test patterns.
- `finance.invoices.create`: integration tests covering — offer not
  accepted → `BAD_REQUEST`; missing `customerNumber` → `BAD_REQUEST`;
  successful creation with a mix of `offer`/`live`/`custom` line sources;
  invoice-number collision handling.
- `PdfService.generateInvoicePdf`: buffer validity tests (`%PDF-` header,
  `length > 1000`, umlaut/€ content), same style as the existing
  `generateOfferPdf` tests.
- `SheetsService`: unit tests with a mocked `googleapis` client, asserting
  correct row shape for client-upsert and invoice-append calls; a test
  confirming a thrown Sheets error does not propagate out of the calling
  mutation/job.
- `FileInvoiceJob`: mirrors `FileOfferJob.test.ts` — success path (PDF +
  upload + status transition) and failure path (`driveMetadata.failureReason`
  recorded, `status` stays `draft`).
- Client: `InvoiceNewPage` line-selection/radio-source behavior;
  `InvoiceDetailPage` action visibility per status — following existing
  component test patterns (`OfferCard.test.tsx`, `OfferTable.test.tsx`).

## Acceptance criteria

1. An admin can create a draft invoice from an accepted offer, selecting a
   subset of its leagues, choosing offer/live/custom price per league, and
   optionally applying one invoice-level discount.
2. The invoice PDF matches the sample (`20260529-01`) layout, fields, and
   footer content, with correct VAT/totals math.
3. Filing an invoice in Drive produces a PDF in the chosen folder and
   transitions the invoice to `sent`; marking it paid transitions to `paid`.
4. Setting an association's `customerNumber` and creating/filing an invoice
   best-effort mirrors data into the Google Sheet without ever failing the
   underlying app operation if the Sheets call fails.
5. `npm test`, `npm run typecheck`, `npm run typecheck:server` all pass.
