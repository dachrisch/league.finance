# Browserless Offer PDF (pdfkit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Puppeteer/headless-Chrome PDF rendering in `PdfService` with browserless `pdfkit`, removing the Chrome dependency that fails in the alpine image.

**Architecture:** Rewrite `PdfService.generateOfferPdf` to build the same offer-letter document with pdfkit (stream → Buffer). Public interface and `generateFilename` unchanged, so `FileOfferJob` and callers are untouched. Remove the `puppeteer` dependency.

**Tech Stack:** TypeScript, Node, pdfkit, Vitest.

## Global Constraints

- Public interface unchanged: `static generateOfferPdf(data: PdfGenerationData): Promise<Buffer>` and `static generateFilename(offerId: string, associationName: string): string`. `PdfGenerationData` shape unchanged: `{ offer, contact, configs, leaguesMap, associationName, seasonName }`.
- Library is **pdfkit**; built-in Helvetica/Helvetica-Bold only (no embedded font files). German chars `ä ö ü ß` and `€` must render.
- Currency formatted German: `Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' })` → `1.440,00 €`. Dates `toLocaleDateString('de-DE')`.
- Reproduce the existing offer-letter sections (header, recipient, title+meta, Unser Angebot, Leistungsumfang list, pricing table + net total, MwSt/validity note, sign-off, footer) with light polish.
- Remove `puppeteer` from `package.json`; add `pdfkit` + `@types/pdfkit`.
- No Dockerfile change (removing the browser is the fix).
- Verification: `npm test`, `npm run typecheck`, `npm run typecheck:server` all pass. Single test file: `npx vitest run src/server/services/__tests__/PdfService.test.ts`.
- Branch: `claude/pdfkit-offer-pdf`. Commit per task.

---

## File Structure

- `src/server/services/PdfService.ts` — rewrite internals (pdfkit); keep both static methods + the `PdfGenerationData` interface.
- `src/server/services/__tests__/PdfService.test.ts` — keep filename tests; replace the buffer test.
- `package.json` — remove `puppeteer`, add `pdfkit` (dep) + `@types/pdfkit` (devDep); lockfile updated by `npm install`.

---

## Task 1: Replace Puppeteer with pdfkit in PdfService

**Files:**
- Modify: `src/server/services/PdfService.ts` (full rewrite of the class body)
- Modify: `src/server/services/__tests__/PdfService.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces (unchanged): `PdfService.generateOfferPdf(data: PdfGenerationData): Promise<Buffer>`; `PdfService.generateFilename(offerId: string, associationName: string): string`; exported `interface PdfGenerationData { offer: any; contact: any; configs: any[]; leaguesMap: Record<number,string>; associationName: string; seasonName: string }`.

- [ ] **Step 1: Swap dependencies**

```bash
npm uninstall puppeteer
npm install pdfkit
npm install -D @types/pdfkit
```
Expected: `package.json` no longer lists `puppeteer`; lists `pdfkit` (dependencies) and `@types/pdfkit` (devDependencies); lockfile updated.

- [ ] **Step 2: Rewrite the test file (TDD red)**

Replace the entire contents of `src/server/services/__tests__/PdfService.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { PdfService } from '../PdfService';

const baseData = {
  offer: { _id: '507f1f77bcf86cd799439011' },
  contact: {
    name: 'Lynn Hoffer',
    address: { street: 'Georg Brauchle Ring 93', city: 'München', postalCode: '80992', country: 'Germany' },
    email: 'lynn@example.com',
  },
  configs: [{ leagueId: 16, finalPrice: 560, expectedTeamsCount: 1 }],
  leaguesMap: { 16: 'RL Bayern' },
  associationName: 'American Football Verband Bayern e.V.',
  seasonName: '2026',
};

const isPdf = (buf: Buffer) => Buffer.isBuffer(buf) && buf.toString('ascii', 0, 5) === '%PDF-';

describe('PdfService.generateFilename', () => {
  it('generates filename correctly', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test Association');
    expect(filename).toMatch(/^Angebot_\d{8}-507f1f77_Test-Association\.pdf$/);
  });

  it('sanitizes special characters', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test & Association @ 2026');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain('@');
    expect(filename).toContain('Test-Association-2026');
  });
});

describe('PdfService.generateOfferPdf', () => {
  it('returns a valid PDF buffer (single config)', async () => {
    const pdf = await PdfService.generateOfferPdf(baseData as any);
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('returns a valid PDF buffer (multiple configs)', async () => {
    const data = { ...baseData, configs: [
      { leagueId: 16, finalPrice: 560, expectedTeamsCount: 1 },
      { leagueId: 29, finalPrice: 280, expectedTeamsCount: 1 },
    ], leaguesMap: { 16: 'RL Bayern', 29: 'Bayern U16' } };
    const pdf = await PdfService.generateOfferPdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });

  it('does not throw on umlaut / euro content', async () => {
    const data = { ...baseData,
      contact: { ...baseData.contact, name: 'Christian Dähn' },
      configs: [{ leagueId: 29, finalPrice: 1440, expectedTeamsCount: 3 }],
      leaguesMap: { 29: 'Bayern U16 Süd' } };
    const pdf = await PdfService.generateOfferPdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/server/services/__tests__/PdfService.test.ts`
Expected: FAIL — the current Puppeteer implementation either errors with "Could not find Chrome" (no browser in this env) or does not satisfy the new fast assertions. (Filename tests pass; the `generateOfferPdf` tests fail.)

- [ ] **Step 4: Rewrite `PdfService.ts` with pdfkit**

Replace the entire contents of `src/server/services/PdfService.ts` with:

```ts
import PDFDocument from 'pdfkit';

export interface PdfGenerationData {
  offer: any;
  contact: any;
  configs: any[];
  leaguesMap: Record<number, string>;
  associationName: string;
  seasonName: string;
}

const BLUE = '#2c5aa0';
const GREY = '#666666';
const DARK = '#333333';

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const deDate = (d: Date) => d.toLocaleDateString('de-DE');

export class PdfService {
  static generateOfferPdf(data: PdfGenerationData): Promise<Buffer> {
    const { offer, contact, configs, leaguesMap, associationName, seasonName } = data;
    const offerId8 = offer._id.toString().substring(0, 8);
    const totalPrice = configs.reduce((sum, c) => sum + (c.finalPrice || 0), 0);
    // Contact address may be nested (real Contact doc) or flat (legacy) — support both.
    const addr = contact.address ?? contact;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    // Header
    doc.font('Helvetica-Bold').fontSize(24).fillColor(BLUE).text('bumbleflies', left);
    doc.font('Helvetica').fontSize(9).fillColor(GREY)
      .text('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München', left);
    doc.moveDown(0.5);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(BLUE).lineWidth(2).stroke();
    doc.moveDown(1.5);

    // Recipient
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text('ANGEBOT AN:', left);
    doc.moveDown(0.3);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(contact.name ?? '', left);
    doc.font('Helvetica').fontSize(10)
      .text(addr.street ?? '', left)
      .text(`${addr.postalCode ?? ''} ${addr.city ?? ''}`.trim(), left)
      .text(addr.country ?? '', left)
      .text(contact.email ?? '', left);
    doc.moveDown(1.5);

    // Title + meta
    doc.font('Helvetica-Bold').fontSize(15).fillColor(BLUE)
      .text(`Angebot: ${offerId8} – Nutzung der LeagueSphere App für die Saison ${seasonName}`,
        left, doc.y, { width: contentWidth });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor(GREY)
      .text(`Angebots-ID: ${offerId8}`, left)
      .text(`Datum: ${deDate(new Date())}`, left)
      .text(`Organisation: ${associationName}`, left);

    const section = (title: string) => {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(13).fillColor(BLUE).text(title, left);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10.5).fillColor(DARK);
    };

    // Unser Angebot
    section('Unser Angebot');
    doc.text(`Wir freuen uns, dir unser Angebot für die Nutzung der LeagueSphere App zur effizienten ` +
      `Organisation und Verwaltung der Saison ${seasonName} zu unterbreiten.`,
      left, doc.y, { width: contentWidth });

    // Leistungsumfang
    section('Leistungsumfang');
    doc.text('Die Anwendung kann unter https://leaguesphere.app von allen Spieler:innen und ' +
      'Zuschauer:innen genutzt werden, mit folgenden Funktionen:', left, doc.y, { width: contentWidth });
    doc.moveDown(0.3);
    doc.list([
      'Einfache Spielplanerstellung und Einteilung der Offiziellen',
      'Live-Ergebnisse für die Fans und Teams',
      'Liveticker für die Fans',
      'Tracking der Schiedsrichtereinsätze',
      'Digitaler Passcheck der Teams ohne Listen zu drucken',
      'Automatischer digitaler Passtransfer innerhalb der App',
    ], left, doc.y, { width: contentWidth, bulletRadius: 1.5, textIndent: 12 });

    // Preise und Konditionen (table)
    section('Preise und Konditionen');
    const colTeams = left + contentWidth * 0.55;
    const colPrice = left + contentWidth * 0.78;
    const priceW = right - colPrice;
    const teamsW = contentWidth * 0.2;
    const rowH = 18;
    let y = doc.y + 4;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
    doc.text('Liga/League', left, y);
    doc.text('Teams', colTeams, y, { width: teamsW, align: 'right' });
    doc.text('Preis', colPrice, y, { width: priceW, align: 'right' });
    y += rowH;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor(BLUE).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(10).fillColor(DARK);
    for (const c of configs) {
      doc.text(leaguesMap[c.leagueId] || 'Unknown', left, y, { width: contentWidth * 0.5 });
      doc.text(String(c.expectedTeamsCount ?? 0), colTeams, y, { width: teamsW, align: 'right' });
      doc.text(euro(c.finalPrice || 0), colPrice, y, { width: priceW, align: 'right' });
      y += rowH;
    }
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
    doc.text('Gesamt (zzgl. MwSt.)', left, y, { width: contentWidth * 0.7 });
    doc.text(euro(totalPrice), colPrice, y, { width: priceW, align: 'right' });
    doc.x = left;
    doc.y = y + rowH;

    // Note
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
      .text('Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.', left, doc.y, { width: contentWidth });
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    doc.text(`Wir binden uns an dieses Angebot bis zum ${deDate(until)}.`, left, doc.y, { width: contentWidth });

    // Sign-off
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK).text('Viele Grüße', left);
    doc.font('Helvetica').text('bumbleflies (i.V. Christian Dähn)', left);

    // Footer
    doc.moveDown(2);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8).fillColor(GREY)
      .text('bumbleflies UG (haftungsbeschränkt) · Geschäftsführer: Christoph Kämpfe, Christian Dähn, Sebastian Keller', left, doc.y, { width: contentWidth })
      .text('Gleiwitzer Str. 6d, 81929 München · GLS Bank · IBAN: DE96430609671106170600', left, doc.y, { width: contentWidth })
      .text('info@bumbleflies.de · bumbleflies.de', left, doc.y, { width: contentWidth });

    doc.end();
    return done;
  }

  static generateFilename(offerId: string, associationName: string): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = associationName
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    return `Angebot_${date}-${offerId.substring(0, 8)}_${sanitizedName}.pdf`;
  }
}
```

Note: if `import PDFDocument from 'pdfkit'` raises a TS interop error under `tsconfig.server.json`, use `import PDFDocument = require('pdfkit');` instead — do not add `esModuleInterop` overrides.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/server/services/__tests__/PdfService.test.ts`
Expected: PASS (5 tests) and fast (well under 1s — no browser).

- [ ] **Step 6: Verify puppeteer is gone and types are clean**

Run: `grep -rn "puppeteer" src package.json` → expect no matches in `src/`; no `puppeteer` in `package.json`.
Run: `npm run typecheck:server && npm run typecheck` → both PASS.
Run: `npm test` → fully green.

- [ ] **Step 7: Commit**

```bash
git add src/server/services/PdfService.ts src/server/services/__tests__/PdfService.test.ts package.json package-lock.json
git commit -m "feat(pdf): render offer PDF with pdfkit, drop puppeteer/chrome"
```

---

## Task 2: Release + prod E2E verification (manual)

**Files:** none (release + verification).

- [ ] **Step 1:** Merge Task 1 to `master` (PR, green CI) → release-please releases a new version → tag-triggered CI builds & pushes `dachrisch/league.finance:latest` → Watchtower-dev (poll 300s) recreates `leagues-finance.finance-api`. Confirm the running image digest changed and the container is healthy.
- [ ] **Step 2:** Refresh the admin Google token if expired, then call `finance.offersDrive.fileOfferInDrive` for the AFVB draft offer (`6a43eddbd3cc34a8205e53f1`) with a real Drive folder.
- [ ] **Step 3:** Poll `getOfferDriveStatus` until `completed`; confirm the offer is `status=sent` with `driveMetadata.driveLink`, and that a real PDF (header, recipient, pricing table, total) is present in the chosen Drive folder. Optionally delete the test artifact.

---

## Self-Review

- **Spec coverage:** browserless pdfkit render (Task 1 Step 4) ✓; same interface/`PdfGenerationData` (unchanged signatures) ✓; built-in fonts + umlaut/€ (Step 4, test Step 2) ✓; German currency/date (`euro`/`deDate`) ✓; all offer-letter sections reproduced ✓; remove puppeteer + add pdfkit (Step 1, verified Step 6) ✓; no Dockerfile change ✓; tests keep filename cases + structural PDF assertions (Step 2) ✓; AC#3 prod E2E (Task 2) ✓.
- **Placeholder scan:** none — full code provided for both files; exact commands with expected output.
- **Type consistency:** `PdfGenerationData` fields identical to current and to callers (`FileOfferJob`); both static method signatures unchanged; `euro`/`deDate` defined before use; table column vars consistent within Step 4.
