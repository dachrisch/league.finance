# Browserless Offer PDF (pdfkit) — Design

> Status: approved design (brainstorm 2026-06-30). Follow-up to
> `2026-06-30-file-offer-in-drive-design.md` — the Drive-filing flow works, but
> PDF generation failed in prod because Puppeteer has no Chromium in the
> `node:24-alpine` image.

## Goal

Replace the Puppeteer (headless Chrome) PDF renderer with a **browserless**
generator using **pdfkit**, removing the Chrome dependency entirely. The offer
document keeps the same content and structure (with light typographic polish).
`PdfService`'s public interface is unchanged, so nothing downstream changes.

## Background

`PdfService.generateOfferPdf()` currently builds an HTML string and renders it to
PDF with `puppeteer.launch()` → `page.setContent(html)` → `page.pdf()`. The
`node:24-alpine` image ships no Chromium and puppeteer's bundled browser isn't
installed, so `puppeteer.launch()` throws `Could not find Chrome` at runtime
(verified in the prod E2E on 2026-06-30). The fix is to stop using a browser.

## Decisions (from brainstorm)

- **Library:** `pdfkit` (pure JS; flowing text/lists; built-in Helvetica renders
  `ä ö ü ß` and `€` via WinAnsi; no native deps).
- **Fidelity:** reproduce the current offer-letter content + structure, with
  light polish (tidy spacing/typography, German currency formatting). Not
  pixel-identical to the old Chrome render.
- **Interface:** unchanged — `FileOfferJob` and all callers untouched.

## Design

### Unchanged public interface (`src/server/services/PdfService.ts`)
- `static generateOfferPdf(data: PdfGenerationData): Promise<Buffer>`
- `static generateFilename(offerId: string, associationName: string): string`
- `PdfGenerationData` shape unchanged: `{ offer, contact, configs, leaguesMap,
  associationName, seasonName }`.

### New internals (pdfkit)
- `generateOfferPdf` creates `new PDFDocument({ size: 'A4', margin: 50 })`,
  collects the stream into a buffer, and resolves a `Promise<Buffer>`:
  ```ts
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((res, rej) => {
    doc.on('end', () => res(Buffer.concat(chunks)));
    doc.on('error', rej);
  });
  // ... draw sections ...
  doc.end();
  return done;
  ```
- Fonts: built-in `Helvetica` / `Helvetica-Bold` (no embedding). These cover the
  German characters and `€` used here.
- Money helper: `new Intl.NumberFormat('de-DE', { style: 'currency', currency:
  'EUR' }).format(n)` → `1.440,00 €`. Dates: `toLocaleDateString('de-DE')`.
- Remove `generateHtml` and `launchBrowser`.

### Document sections (drawn top→bottom)
1. **Header:** "bumbleflies" wordmark (Helvetica-Bold, large) + company line
   (`bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München`),
   horizontal rule.
2. **Recipient:** label "ANGEBOT AN:", then `contact.name` (bold),
   `contact.street`, `contact.postalCode contact.city`, `contact.country`,
   `contact.email`.
3. **Title + meta:** `Angebot: <offerId[0..8]> – Nutzung der LeagueSphere App für
   die Saison <seasonName>`; meta lines: Offer ID, Datum (today, de-DE),
   Organisation (`associationName`).
4. **Unser Angebot:** the existing intro paragraph (season interpolated).
5. **Leistungsumfang:** the existing 6 feature bullet points (pdfkit list).
6. **Preise und Konditionen:** a table with columns **Liga/League · Teams ·
   Preis**, one row per `config` (`leaguesMap[leagueId] || 'Unknown'`,
   `expectedTeamsCount`, `finalPrice` formatted), then a bold **Gesamt (zzgl.
   MwSt.)** total row = sum of `finalPrice`. Drawn with fixed column x-positions
   and a header underline + per-row baseline spacing.
7. **Note:** "Alle Preise zzgl. der gesetzlichen MwSt." + binding-until date
   (today + 30 days, de-DE).
8. **Sign-off:** "Viele Grüße" / "bumbleflies (i.V. Christian Dähn)".
9. **Footer:** company + Geschäftsführer + address; GLS Bank / IBAN
   DE96430609671106170600 / info@bumbleflies.de / bumbleflies.de.

### Error handling
- pdfkit is synchronous to drive; the only async is stream collection. A draw
  error rejects via `doc.on('error')`. `FileOfferJob` already wraps PDF
  generation in try/catch and records `driveMetadata.failureReason` — unchanged.

### Cleanup
- Remove `"puppeteer"` from `package.json` dependencies; add `"pdfkit"` (+
  `@types/pdfkit` dev). Run `npm install` to update the lockfile.
- No Dockerfile change needed (and no Chromium) — removing puppeteer removes the
  failed browser download/launch.

## Testing
- Keep the two `generateFilename` tests unchanged.
- Replace the buffer test (drop the 10s timeout — pdfkit is fast):
  - returns a Buffer whose first 5 bytes are `%PDF-` and `length > 1000`, for
    single-config data.
  - same for multi-config data (e.g. two leagues).
  - does not throw on umlaut/`€` content (contact name "Dähn", league "Bayern
    U16", finalPrice 1440) — asserts a valid `%PDF` buffer is returned.
  (pdfkit deflates text streams, so assert structural validity + no-throw rather
  than grepping rendered strings.)

## Acceptance criteria
1. `generateOfferPdf` returns a valid PDF `Buffer` with **no** Puppeteer/Chrome
   dependency; `puppeteer` is gone from `package.json`.
2. The PDF contains the offer letter's sections (header, recipient, title/meta,
   Angebot intro, Leistungsumfang list, pricing table + net total, MwSt/validity
   note, sign-off, footer) with German currency/date formatting.
3. `FileOfferJob` is unchanged and the prod E2E (file the AFVB draft offer)
   produces a PDF in the chosen Drive folder.
4. `npm test`, `npm run typecheck`, `npm run typecheck:server` all pass.
