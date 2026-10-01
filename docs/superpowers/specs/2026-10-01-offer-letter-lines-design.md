# Offer Price Lines + Legacy Offer Letter PDF — Design

> Status: design approved in brainstorm 2026-10-01, spec pending review.
> Follow-up to `2026-06-30-pdfkit-offer-pdf-design.md` (pdfkit offer PDF) and the
> legacy invoice layout (PR #705).

## Goal

Generate the 2027 renewal offers (AFVBy, AFCVNRW, Spielverbund Ost, AFVD, AFVH) in
the app, in the layout of the offer letters bumbleflies sent from Google Docs in
2025/2026, with the same amounts as last year.

## Background

Last year's offers cannot be expressed by the current model, where an offer's price
is the sum of per-league `FinancialConfig`s:

| Offer (2026) | Needs |
|---|---|
| AFVBy `20260319-2`: 600 € Grundpreis + 35 Erwachsenenteams à 16 € + 35 Jugendteams à 9 € = 1.440 € | non-league fee line, flat per-team-type lines |
| AFCVNRW `20251015-2_NRW`: RL 648 €, OL 918 €, U10 78 €, U13 143 €, U16 117 € = 1.904 € | league lines (fits today) |
| Ost `20250821` + `20260128`: Oberliga package 900 € (bis 20 Spieltage à 6 Teams) + 5 youth leagues 734 € − 15 % = 1.523,90 € | package line with detail text, discount on a subset |
| AFVD `20260315_DFFL`: DFFL 864 €, DFFL2 1.080 €, DFFLF 540 € = 2.484 € (+ optional DFFLF2 486 €) | optional line excluded from total |
| AFVH `20260408-1`: 600 € Grundpreis + 9 × 18 € = 762 € | fee line |

The current PDF also differs from the letters (hex ID, "ANGEBOT AN:" block, blue
headings). Season 2027 exists in leaguesphere, but has no team assignments yet, so
`finance.leagues.listBySeason` returns nothing for it.

## Decisions (from brainstorm)

- **Hybrid price model:** league configs generate default lines; lines can then be
  edited and free lines added. Once an offer has lines, the lines are authoritative
  for total and PDF.
- **League picker shows all leagues** (not season-scoped).
- **Layout mirrors the legacy Google Docs letter**, positioned like the invoice PDF.
- **Branch from master**; ship via PR → release-please → Watchtower.
- **Data entry:** the 5 offers are created in prod as **drafts**; nothing is sent.

## Design

### 1. Data model

`Offer` (`src/server/models/Offer.ts`) gains:

```ts
lines?: Array<{
  label: string;            // "Grundpreis", "Regionalliga", "U16 Sachsen"
  detail?: string;          // "35 Teams à 16 €", "bis zu 20 Spieltage mit jeweils 6 Teams"
  amount: number;           // EUR net, 2 decimals; negative for kind 'discount'
  kind: 'league' | 'fee' | 'discount' | 'optional';
  leagueId?: number;        // set for lines generated from a league config
}>;
offerNumber?: string;       // "YYYYMMDD-N"
offerDate?: Date;           // letter date, defaults to creation
validUntil?: Date;          // "Wir binden uns an dieses Angebot bis zum …"
introNote?: string;         // extra sentence after the standard intro
closingNote?: string;       // e.g. "Weitere Ligen berechnen wir mit 10 € pro Spieltag und Team."
```

- Shared pure helper `shared/lib/offerLines.ts`:
  - `offerLinesTotal(lines)` = sum of all non-`optional` amounts, rounded to cents.
  - `linesFromConfigs(configs, leaguesMap)` → one `league` line per priced config
    (`label` = league name, `detail` = `"{n} Teams"` for SEASON or
    `"{g} Spieltage × {t} Teams"` for GAMEDAY, `amount` = `finalPrice`).
  - `percentDiscountLine(lines, indexes, percent, label)` → `discount` line with
    `amount = -round(sum(selected) * percent / 100, 2)`.
- `offerNumber` generated like invoice numbers (`generateOfferNumber(date)` in
  `src/server/lib/offerNumbering.ts`): `YYYYMMDD-N`, continuing after the highest
  suffix of that day; editable so legacy formats (`…_NRW`) stay possible.
- **Total**: `finance.offers.list` / `get` return `totalPrice` from
  `offerLinesTotal(lines)` when `lines` is non-empty, otherwise the existing config
  sum. Offers without lines behave exactly as today.

### 2. API (`src/server/routers/finance/offers.ts`)

- `create` / `update` accept the new fields (Zod schemas in `shared/schemas`).
- `setLines({ id, lines })` (admin): replace lines; validates `discount` ≤ 0,
  others ≥ 0, non-empty `label`.
- `generateLines({ id })` (admin): `linesFromConfigs` for the offer's configs; only
  replaces existing lines when called with `overwrite: true`.
- `finance.leagues.listAll()`: all leagues `{ _id, name, slug }` from
  `gamedays_league`, used by the offer league picker.

### 3. UI

- `OfferDetailPage`: "Preise" card
  - table editor: label, detail, amount, kind (select), reorder up/down, delete
  - "Aus Ligen erzeugen" (generateLines), "Zeile hinzufügen", "Rabatt % auf Auswahl"
  - live total (excluding optional lines) and optional lines listed separately
  - fields: Angebotsnummer, Datum, gültig bis, Zusatztext, Schlusstext
- Offer create/edit league picker uses `listAll`.

### 4. PDF (`PdfService.generateOfferPdf`)

Rewritten to mirror the legacy letter (reference: `Angebot_20260319-2…pdf`,
Drive `1KKaEZGG-JOPcFBFf5I2QuZIgflzVM8Ja`), using an `OFFER_LAYOUT` of absolute A4
points like `INVOICE_LAYOUT`, sharing the logo, sender line and three-column footer
with the invoice:

1. Logo top right, small sender line `bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München`.
2. Left: recipient block (association name, `z.H.`/contact name, street, PLZ Ort —
   via `buildStandardInvoiceAddress`-style builder). Right: `info@bumbleflies.de`,
   `Angebot: {offerNumber}`, `Datum: {offerDate}`.
3. Title `Angebot: {offerNumber} - Nutzung der LeagueSphere App für die Saison {season}`.
4. **Unser Angebot**: standard intro (+ `introNote`).
5. **Leistungsumfang**: the six feature bullets (unchanged text).
6. **Preise und Konditionen**: sentence `Für die Nutzung … in der Saison {season}
   berechnen wir {total}, die sich wie folgt zusammensetzen:`, then a table of
   non-optional lines (label | detail | amount right-aligned), total row
   `Gesamt (zzgl. MwSt.)`, then optional lines under `Optional:`. Rows wrap; long
   tables continue on a new page.
7. `closingNote`, `Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen
   MwSt. Wir binden uns an dieses Angebot bis zum {validUntil} und freuen uns auf die
   Zusammenarbeit.` (`validUntil` default: offerDate + 30 days).
8. `Viele Grüße` / `bumbleflies (i.V. Christian Dähn)`; footer pinned to the page
   bottom as in the invoice.

Without `lines`, the PDF renders `linesFromConfigs(configs)` so existing offers
still produce a valid letter. `offerNumber` falls back to the first 8 chars of the
id.

Filename: `Angebot_{offerNumber}-Nutzung der LeagueSphere App für die Saison {season}.pdf`.

`FileOfferJob` passes the offer's lines/number/dates through `PdfGenerationData`
(new optional fields; existing callers unaffected).

### 5. Error handling

- Invalid lines → `BAD_REQUEST` with the offending index.
- Total mismatch is impossible by construction (always derived).
- Duplicate `offerNumber` → `CONFLICT` (unique sparse index).

### 6. Testing (TDD)

- `shared/lib/__tests__/offerLines.test.ts`: totals (optional excluded, discounts),
  `linesFromConfigs`, percent discount rounding (Ost: 734 € × 15 % = 110,10 €).
- `offerNumbering` test: daily sequence, gaps, legacy suffixes ignored.
- Router tests: `setLines` validation, `generateLines`, `list`/`get` totals with and
  without lines, `listAll`.
- `PdfService` layout tests (spy on pdfkit `text`/`image`) pinning header, meta
  block, title, table rows, optional section, validity sentence, footer; snapshot of
  the five 2027 offers' rendered text lines.
- Client: `OfferDetailPage` lines editor (add/edit/delete, discount helper, total).

### 7. Rollout & data entry

1. Before merge: render the 5 offers locally (in-memory Mongo, real league names) and
   compare amounts/text to last year's PDFs.
2. PR `feat/offer-letter-lines` → CI (lint, typecheck, tests) green → merge →
   release-please release → image `dachrisch/league.finance:latest` → Watchtower.
3. After deploy, in prod (as the logged-in admin, through the app/API):
   - ensure associations + contacts exist: AFVBy (Lynn Hoffer), AFCVNRW (Fabian
     Pawlowski), AFCVBB for Spielverbund Ost, AFVD (Max Keneder), AFVH (Michael Hanke)
   - create 5 **draft** offers for season 2027 with the lines from the 2027 drafts
     (numbers `20261001-1` … `-5`, valid until 15.11.2026)
   - generate the PDFs into Drive for review; **no send**.

## Out of scope

- Sending/email changes; changes to invoices; multi-currency; per-line VAT.
- Migrating existing offers to lines (they keep working without).
