# Offer Price Lines + Legacy Offer Letter PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offers carry editable price lines (generated from league configs or free), render as the legacy bumbleflies offer letter, and the five 2027 renewal offers are entered in prod as drafts.

**Architecture:** A pure shared module (`shared/lib/offerLines.ts`) owns line math. `Offer` stores `lines` + letter metadata; the tRPC offers router exposes `setLines`/`generateLines`/`previewPdf`; `PdfService.generateOfferPdf` is rewritten with absolute positions (`OFFER_LAYOUT`) measured from the 2026 Google Docs letter. The client gets an `OfferLinesEditor` on the offer detail page.

**Tech Stack:** TypeScript, Express + tRPC, Mongoose (MongoDB), mysql2 (read-only leaguesphere), pdfkit 0.20, React + Vite, Vitest (+ mongodb-memory-server), oxlint.

**Spec:** `docs/superpowers/specs/2026-10-01-offer-letter-lines-design.md`

## Global Constraints

- Repo `/home/cda/dev/leagues.finance`, branch `feat/offer-letter-lines` (from master `136ff23`).
- Offers without `lines` must behave exactly as before (totals, PDF content).
- Total = sum of all non-`optional` line amounts, rounded to cents; `discount` amounts are ≤ 0, all others ≥ 0.
- Offer number format `YYYYMMDD-N` (no zero padding, e.g. `20261001-1`); editable free text, unique when set.
- Default `validUntil` = `offerDate` + 30 days.
- Money in the PDF: `de-DE` EUR (`1.440,00 €`); dates `dd.mm.yyyy`.
- League picker for offers shows **all** leagues (`finance.leagues.listAll`).
- 2027 offers are created as **drafts**; filing to Drive (which sets status `sent`) is **not** used for them. Review uses `previewPdf`.
- Before pushing: `npm run lint`, `npm run typecheck`, `npm run typecheck:server`, `npm run test` all green.
- Commits: conventional commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Offer with lines but **zero configs / empty `leagueIds` from legacy data** — list/get/preview must not crash; total from lines.
2. **Long detail text** (`bis zu 20 Spieltage mit jeweils 6 Teams`) and 8+ lines — PDF rows wrap and never overlap the sign-off/footer; extra content moves to page 2.
3. **Percent discount rounding** — 734 × 15 % must give exactly −110,10 and total 1.523,90 (no float drift like 1523.8999).
4. **Editing a non-draft offer's lines** — rejected with `BAD_REQUEST` (sent/accepted offers are immutable).
5. **Duplicate offer number** — second offer with `20261001-1` gets `CONFLICT`, not a 500.

Each is pinned by a test in the owning task (marked *RF1–RF5*).

## File Structure

| File | Responsibility |
|---|---|
| `shared/lib/offerLines.ts` (new) | `OfferLine` type, `offerLinesTotal`, `linesFromConfigs`, `percentDiscountLine`, `validateOfferLines` |
| `shared/lib/__tests__/offerLines.test.ts` (new) | unit tests |
| `shared/schemas/offer.ts` (modify) | `OfferLineSchema`, letter metadata fields |
| `src/server/models/Offer.ts` (modify) | `lines`, `offerNumber`, `offerDate`, `validUntil`, `introNote`, `closingNote` |
| `src/server/lib/offerNumbering.ts` (new) + test | `generateOfferNumber(date)` |
| `src/server/routers/finance/offers.ts` (modify) | totals from lines, `setLines`, `generateLines`, `updateLetter`, `previewPdf` |
| `src/server/routers/finance/leagues.ts` (modify) | `listAll` |
| `src/server/lib/offerPdfData.ts` (new) | `buildOfferPdfData(offerId)` shared by `previewPdf` and `FileOfferJob` |
| `src/server/services/PdfService.ts` (modify) | `OFFER_LAYOUT`, rewritten `generateOfferPdf`, `generateFilename` |
| `src/server/jobs/FileOfferJob.ts` (modify) | use `buildOfferPdfData` |
| `src/client/components/Offer/OfferLinesEditor.tsx` (new) + test | lines editor UI |
| `src/client/pages/OfferDetailPage.tsx` (modify) | mount editor, letter fields, preview button |
| `src/client/components/Offer/OfferCreateWizard.tsx`, `OfferEditWizard.tsx` (modify) | use `listAll` |
| `scripts/render-2027-offers.ts` (new) | local render of the five offers for verification |

---

### Task 1: Shared offer line math

**Files:**
- Create: `shared/lib/offerLines.ts`
- Test: `shared/lib/__tests__/offerLines.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type OfferLineKind = 'league' | 'fee' | 'discount' | 'optional';
  export interface OfferLine { label: string; detail?: string; amount: number; kind: OfferLineKind; leagueId?: number }
  export const roundCents: (n: number) => number;
  export function offerLinesTotal(lines: OfferLine[]): number;
  export function linesFromConfigs(configs: Array<{ leagueId: number; costModel: 'SEASON'|'GAMEDAY'; expectedTeamsCount: number; expectedGamedaysCount: number; expectedTeamsPerGameday: number; finalPrice: number }>, leaguesMap: Record<number, string>): OfferLine[];
  export function percentDiscountLine(lines: OfferLine[], indexes: number[], percent: number, label?: string): OfferLine;
  export function validateOfferLines(lines: OfferLine[]): { index: number; message: string } | null;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// shared/lib/__tests__/offerLines.test.ts
import { describe, it, expect } from 'vitest';
import { offerLinesTotal, linesFromConfigs, percentDiscountLine, validateOfferLines, type OfferLine } from '../offerLines';

const ost: OfferLine[] = [
  { label: 'Oberliga Ost', detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 900, kind: 'fee' },
  { label: 'U16 Sachsen', amount: 144, kind: 'league' },
  { label: 'U16 Thüringen', amount: 216, kind: 'league' },
  { label: 'U16 Sachsen-Anhalt', amount: 180, kind: 'league' },
  { label: 'U13 Mitteldeutschland', amount: 122, kind: 'league' },
  { label: 'U13 Mitteldeutschland', amount: 72, kind: 'league' },
];

describe('offerLinesTotal', () => {
  it('sums all lines except optional ones', () => {
    expect(offerLinesTotal([
      { label: 'DFFL', amount: 864, kind: 'league' },
      { label: 'DFFL2', amount: 1080, kind: 'league' },
      { label: 'DFFLF', amount: 540, kind: 'league' },
      { label: 'DFFLF2', amount: 486, kind: 'optional' },
    ])).toBe(2484);
  });

  it('subtracts discount lines', () => {
    expect(offerLinesTotal([{ label: 'A', amount: 100, kind: 'fee' }, { label: 'R', amount: -10, kind: 'discount' }])).toBe(90);
  });

  it('returns 0 for no lines', () => {
    expect(offerLinesTotal([])).toBe(0);
  });
});

describe('percentDiscountLine', () => {
  it('RF3: 15 % on the five youth leagues of Ost is exactly -110.10 and total 1523.90', () => {
    const discount = percentDiscountLine(ost, [1, 2, 3, 4, 5], 15, '15 % Rabatt auf die Jugendligen');
    expect(discount).toEqual({ label: '15 % Rabatt auf die Jugendligen', detail: 'auf 734,00 €', amount: -110.1, kind: 'discount' });
    expect(offerLinesTotal([...ost, discount])).toBe(1523.9);
  });

  it('defaults the label to "{p} % Rabatt"', () => {
    expect(percentDiscountLine(ost, [0], 10).label).toBe('10 % Rabatt');
  });

  it('ignores out-of-range indexes', () => {
    expect(percentDiscountLine(ost, [0, 99], 10).amount).toBe(-90);
  });
});

describe('linesFromConfigs', () => {
  it('builds one league line per config with team detail (SEASON) and gameday detail (GAMEDAY)', () => {
    const lines = linesFromConfigs([
      { leagueId: 1, costModel: 'SEASON', expectedTeamsCount: 12, expectedGamedaysCount: 0, expectedTeamsPerGameday: 0, finalPrice: 648 },
      { leagueId: 2, costModel: 'GAMEDAY', expectedTeamsCount: 0, expectedGamedaysCount: 20, expectedTeamsPerGameday: 6, finalPrice: 900 },
    ], { 1: 'Regionalliga NRW' });
    expect(lines).toEqual([
      { label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 1 },
      { label: 'Liga 2', detail: '20 Spieltage × 6 Teams', amount: 900, kind: 'league', leagueId: 2 },
    ]);
  });
});

describe('validateOfferLines', () => {
  it('accepts valid lines', () => {
    expect(validateOfferLines(ost)).toBeNull();
  });
  it('rejects an empty label', () => {
    expect(validateOfferLines([{ label: ' ', amount: 1, kind: 'fee' }])).toEqual({ index: 0, message: 'Bezeichnung fehlt' });
  });
  it('rejects a positive discount', () => {
    expect(validateOfferLines([{ label: 'R', amount: 5, kind: 'discount' }])).toEqual({ index: 0, message: 'Rabatt muss negativ sein' });
  });
  it('rejects a negative non-discount amount', () => {
    expect(validateOfferLines([{ label: 'X', amount: -5, kind: 'fee' }])).toEqual({ index: 0, message: 'Betrag darf nicht negativ sein' });
  });
  it('rejects non-finite amounts', () => {
    expect(validateOfferLines([{ label: 'X', amount: Number.NaN, kind: 'fee' }])).toEqual({ index: 0, message: 'Betrag ungültig' });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test -- shared/lib/__tests__/offerLines.test.ts`
Expected: FAIL — `Cannot find module '../offerLines'`.

- [ ] **Step 3: Implement**

```ts
// shared/lib/offerLines.ts
export type OfferLineKind = 'league' | 'fee' | 'discount' | 'optional';

export interface OfferLine {
  label: string;
  detail?: string;
  /** EUR net; negative for kind 'discount' */
  amount: number;
  kind: OfferLineKind;
  leagueId?: number;
}

export const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const euroDe = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

/** The offer total: every line except optional ones (discounts are already negative). */
export function offerLinesTotal(lines: OfferLine[]): number {
  return roundCents(lines.filter((l) => l.kind !== 'optional').reduce((sum, l) => sum + l.amount, 0));
}

/** One 'league' line per priced FinancialConfig, in config order. */
export function linesFromConfigs(
  configs: Array<{ leagueId: number; costModel: 'SEASON' | 'GAMEDAY'; expectedTeamsCount: number;
    expectedGamedaysCount: number; expectedTeamsPerGameday: number; finalPrice: number }>,
  leaguesMap: Record<number, string>
): OfferLine[] {
  return configs.map((c) => ({
    label: leaguesMap[c.leagueId] ?? `Liga ${c.leagueId}`,
    detail: c.costModel === 'SEASON'
      ? `${c.expectedTeamsCount} Teams`
      : `${c.expectedGamedaysCount} Spieltage × ${c.expectedTeamsPerGameday} Teams`,
    amount: roundCents(c.finalPrice ?? 0),
    kind: 'league' as const,
    leagueId: c.leagueId,
  }));
}

/** A discount line worth `percent` of the selected lines' sum. */
export function percentDiscountLine(lines: OfferLine[], indexes: number[], percent: number, label?: string): OfferLine {
  const base = roundCents(indexes.reduce((sum, i) => sum + (lines[i]?.amount ?? 0), 0));
  return {
    label: label ?? `${percent} % Rabatt`,
    detail: `auf ${euroDe(base)}`,
    amount: -roundCents((base * percent) / 100),
    kind: 'discount',
  };
}

/** First invalid line, or null. */
export function validateOfferLines(lines: OfferLine[]): { index: number; message: string } | null {
  for (const [index, l] of lines.entries()) {
    if (!l.label.trim()) return { index, message: 'Bezeichnung fehlt' };
    if (!Number.isFinite(l.amount)) return { index, message: 'Betrag ungültig' };
    if (l.kind === 'discount' && l.amount > 0) return { index, message: 'Rabatt muss negativ sein' };
    if (l.kind !== 'discount' && l.amount < 0) return { index, message: 'Betrag darf nicht negativ sein' };
  }
  return null;
}
```

Note: `Intl` formats with a narrow no-break space before `€` (`734,00 €`). If the `toEqual` for `detail` fails on that character, change the test's expected string to `` `auf ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(734)}` `` — do not strip the space in the implementation (the PDF uses the same formatter).

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test -- shared/lib/__tests__/offerLines.test.ts` — Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/lib/offerLines.ts shared/lib/__tests__/offerLines.test.ts
git commit -m "feat(offers): shared price line math (totals, config lines, percent discount)"
```

---

### Task 2: Offer model fields, schemas, offer numbering

**Files:**
- Modify: `src/server/models/Offer.ts`
- Modify: `shared/schemas/offer.ts`
- Create: `src/server/lib/offerNumbering.ts`
- Test: `src/server/lib/__tests__/offerNumbering.test.ts`

**Interfaces:**
- Consumes: `OfferLine`, `OfferLineKind` (Task 1).
- Produces:
  - `IOffer` gains `lines?: OfferLine[]; offerNumber?: string; offerDate?: Date; validUntil?: Date; introNote?: string; closingNote?: string;`
  - `export const OfferLineSchema` (zod) and `export const OfferLetterSchema = z.object({ offerNumber: z.string().trim().min(1).optional(), offerDate: z.coerce.date().optional(), validUntil: z.coerce.date().optional(), introNote: z.string().optional(), closingNote: z.string().optional() })` in `shared/schemas/offer.ts`.
  - `export async function generateOfferNumber(date?: Date): Promise<string>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/lib/__tests__/offerNumbering.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../../db/mongo';
import { Offer } from '../../models/Offer';
import { generateOfferNumber } from '../offerNumbering';

const day = new Date('2026-10-01T10:00:00Z');
const make = (offerNumber?: string) => Offer.create({
  associationId: 'a', seasonId: 7, leagueIds: [1], contactId: new Types.ObjectId(), offerNumber,
});

describe('generateOfferNumber', () => {
  beforeAll(connectMongo);
  afterAll(disconnectMongo);
  afterEach(() => Offer.deleteMany({}));

  it('starts at -1 for a fresh day', async () => {
    expect(await generateOfferNumber(day)).toBe('20261001-1');
  });

  it('continues after the highest numeric suffix of the day, ignoring gaps', async () => {
    await make('20261001-1');
    await make('20261001-4');
    expect(await generateOfferNumber(day)).toBe('20261001-5');
  });

  it('ignores other days and non-numeric legacy suffixes', async () => {
    await make('20260930-9');
    await make('20261001-2_NRW');
    expect(await generateOfferNumber(day)).toBe('20261001-1');
  });

  it('RF5: offerNumber is unique when set, absent numbers may repeat', async () => {
    await make('20261001-1');
    await expect(make('20261001-1')).rejects.toMatchObject({ code: 11000 });
    await make();
    await make();
    expect(await Offer.countDocuments()).toBe(3);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm run test -- src/server/lib/__tests__/offerNumbering.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement model + schema + numbering**

In `src/server/models/Offer.ts`, add to `IOffer`:

```ts
  lines?: OfferLine[];
  offerNumber?: string;
  offerDate?: Date;
  validUntil?: Date;
  introNote?: string;
  closingNote?: string;
```

with `import type { OfferLine } from '../../../shared/lib/offerLines';`, and to the schema definition (after `financialConfigId`):

```ts
    lines: {
      type: [{
        _id: false,
        label: { type: String, required: true },
        detail: String,
        amount: { type: Number, required: true },
        kind: { type: String, enum: ['league', 'fee', 'discount', 'optional'], required: true },
        leagueId: Number,
      }],
      default: undefined,
    },
    offerNumber: { type: String },
    offerDate: Date,
    validUntil: Date,
    introNote: String,
    closingNote: String,
```

and below the existing indexes:

```ts
// Offer numbers are unique once assigned; legacy offers have none.
OfferSchema.index({ offerNumber: 1 }, { unique: true, partialFilterExpression: { offerNumber: { $type: 'string' } } });
```

In `shared/schemas/offer.ts` add:

```ts
export const OfferLineSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
  amount: z.number(),
  kind: z.enum(['league', 'fee', 'discount', 'optional']),
  leagueId: z.number().int().positive().optional(),
});

export const OfferLetterSchema = z.object({
  offerNumber: z.string().trim().min(1).optional(),
  offerDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  introNote: z.string().optional(),
  closingNote: z.string().optional(),
});
```

Create `src/server/lib/offerNumbering.ts`:

```ts
import { Offer } from '../models/Offer';

/**
 * Next "YYYYMMDD-N" offer number (the legacy Google Docs scheme, unpadded), continuing after
 * the highest purely numeric suffix of that day. Hand-typed legacy numbers like "…-2_NRW"
 * are ignored rather than parsed.
 */
export async function generateOfferNumber(date: Date = new Date()): Promise<string> {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const sameDay = await Offer.find({ offerNumber: { $regex: `^${datePart}-\\d+$` } }, { offerNumber: 1 }).lean();
  const highest = sameDay.reduce((max, { offerNumber }) => Math.max(max, Number(offerNumber!.slice(datePart.length + 1))), 0);
  return `${datePart}-${highest + 1}`;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm run test -- src/server/lib/__tests__/offerNumbering.test.ts && npm run typecheck:server` — Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Offer.ts shared/schemas/offer.ts src/server/lib/offerNumbering.ts src/server/lib/__tests__/offerNumbering.test.ts
git commit -m "feat(offers): store price lines and letter metadata, YYYYMMDD-N numbering"
```

---

### Task 3: Router — totals from lines, setLines, generateLines, updateLetter; leagues.listAll

**Files:**
- Modify: `src/server/routers/finance/offers.ts`
- Modify: `src/server/routers/finance/leagues.ts`
- Test: `src/server/routers/finance/__tests__/offers-lines.test.ts` (new), `src/server/routers/finance/__tests__/leagues.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 model/schemas, `generateOfferNumber`.
- Produces (tRPC, all under `finance.offers` unless noted):
  - `list` / `get`: `totalPrice` = `offerLinesTotal(offer.lines)` when `offer.lines?.length`, else config sum (unchanged). `get` additionally returns `totalPrice`.
  - `setLines({ id: string, lines: OfferLine[] })` (admin) → normalized offer
  - `generateLines({ id: string, overwrite?: boolean })` (admin) → normalized offer
  - `updateLetter({ id: string, data: OfferLetterSchema & { assignNumber?: boolean } })` (admin) → normalized offer
  - `finance.leagues.listAll()` → `Array<{ _id: number; name: string; slug: string }>`
  - helper `fetchLeaguesMap(ids?: number[]): Promise<Record<number,string>>` exported from `src/server/lib/leagueNames.ts` (new, small) for reuse in Tasks 3–5.

- [ ] **Step 1: Write the failing tests**

```ts
// src/server/routers/finance/__tests__/offers-lines.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { offersRouter } from '../offers';
import { Offer } from '../../../models/Offer';
import { FinancialConfig } from '../../../models/FinancialConfig';
import { connectMongo, disconnectMongo } from '../../../db/mongo';
import { getMysqlPool } from '../../../db/mysql';

vi.mock('../../../db/mysql');
vi.mocked(getMysqlPool).mockReturnValue({
  query: vi.fn().mockResolvedValue([[{ id: 16, name: 'Regionalliga NRW' }, { id: 17, name: 'Oberliga NRW' }]]),
} as any);

const caller = offersRouter.createCaller({ user: { userId: '1', email: 't@t', role: 'admin' } } as any);
const draft = (extra: any = {}) => Offer.create({
  associationId: 'a', seasonId: 7, leagueIds: [16, 17], contactId: new Types.ObjectId(), ...extra,
});

describe('offers price lines', () => {
  beforeAll(connectMongo);
  afterAll(disconnectMongo);
  afterEach(() => Promise.all([Offer.deleteMany({}), FinancialConfig.deleteMany({})]));

  it('setLines stores lines and list/get report the lines total (optional excluded)', async () => {
    const offer = await draft();
    await caller.setLines({ id: offer.id, lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '9 Teams à 18 €', amount: 162, kind: 'fee' },
      { label: 'Extra', amount: 50, kind: 'optional' },
    ] });
    const [listed] = await caller.list();
    expect(listed.totalPrice).toBe(762);
    const got = await caller.get({ id: offer.id });
    expect(got.totalPrice).toBe(762);
    expect(got.offer.lines).toHaveLength(3);
  });

  it('keeps the config-based total for offers without lines', async () => {
    const offer = await draft();
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 54,
      expectedTeamsCount: 12, offerId: offer._id });
    const [listed] = await caller.list();
    expect(listed.totalPrice).toBe(648);
  });

  it('RF1: an offer with lines but no configs and legacy empty leagueIds still lists and gets', async () => {
    const offer = await draft({ lines: [{ label: 'Grundpreis', amount: 600, kind: 'fee' }] });
    await Offer.collection.updateOne({ _id: offer._id }, { $set: { leagueIds: [] } });
    expect((await caller.list())[0].totalPrice).toBe(600);
    expect((await caller.get({ id: offer.id })).totalPrice).toBe(600);
  });

  it('setLines rejects invalid lines with the index', async () => {
    const offer = await draft();
    await expect(caller.setLines({ id: offer.id, lines: [
      { label: 'ok', amount: 1, kind: 'fee' }, { label: 'R', amount: 5, kind: 'discount' },
    ] })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Zeile 2: Rabatt muss negativ sein' });
  });

  it('RF4: setLines/generateLines/updateLetter reject non-draft offers', async () => {
    const offer = await draft({ status: 'sent' });
    await expect(caller.setLines({ id: offer.id, lines: [] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.generateLines({ id: offer.id })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.updateLetter({ id: offer.id, data: { introNote: 'x' } })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('generateLines builds league lines from configs and does not overwrite without the flag', async () => {
    const offer = await draft();
    await FinancialConfig.create({ leagueId: 16, seasonId: 7, costModel: 'SEASON', baseRateOverride: 54,
      expectedTeamsCount: 12, offerId: offer._id });
    const res = await caller.generateLines({ id: offer.id });
    expect(res.lines).toEqual([{ label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 16 }]);
    await caller.setLines({ id: offer.id, lines: [{ label: 'Hand', amount: 1, kind: 'fee' }] });
    await expect(caller.generateLines({ id: offer.id })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await caller.generateLines({ id: offer.id, overwrite: true })).lines[0].label).toBe('Regionalliga NRW');
  });

  it('updateLetter assigns a number, defaults validUntil to offerDate + 30 days', async () => {
    const offer = await draft();
    const res = await caller.updateLetter({ id: offer.id, data: { assignNumber: true, offerDate: new Date('2026-10-01T00:00:00Z') } });
    expect(res.offerNumber).toMatch(/^\d{8}-1$/);
    expect(new Date(res.validUntil).toISOString().slice(0, 10)).toBe('2026-10-31');
  });

  it('RF5: updateLetter maps a duplicate offer number to CONFLICT', async () => {
    await draft({ offerNumber: '20261001-1' });
    const other = await draft();
    await expect(caller.updateLetter({ id: other.id, data: { offerNumber: '20261001-1' } }))
      .rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
```

Append to `src/server/routers/finance/__tests__/leagues.test.ts`:

```ts
describe('leaguesRouter.listAll', () => {
  const caller = leaguesRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

  it('lists every league, not season-scoped', async () => {
    const query = vi.fn().mockResolvedValue([[{ _id: 1, name: 'DFFL', slug: 'dffl' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);
    expect(await caller.listAll()).toEqual([{ _id: 1, name: 'DFFL', slug: 'dffl' }]);
    const [sql] = query.mock.calls[0];
    expect(sql).not.toContain('season');
    expect(sql).toContain('ORDER BY l.name');
  });
});
```

- [ ] **Step 2: Run, verify they fail**

Run: `npm run test -- src/server/routers/finance/__tests__/offers-lines.test.ts src/server/routers/finance/__tests__/leagues.test.ts`
Expected: FAIL (`caller.setLines is not a function`, `listAll` missing).

- [ ] **Step 3: Implement**

Create `src/server/lib/leagueNames.ts`:

```ts
import { getMysqlPool } from '../db/mysql';

/** id → name for the given leagues (all leagues when ids is omitted). Empty map on DB failure. */
export async function fetchLeaguesMap(ids?: number[]): Promise<Record<number, string>> {
  if (ids && ids.length === 0) return {};
  try {
    const pool = getMysqlPool();
    const [rows] = ids
      ? await pool.query<any[]>('SELECT id, name FROM gamedays_league WHERE id IN (?)', [ids])
      : await pool.query<any[]>('SELECT id, name FROM gamedays_league');
    return rows.reduce((acc: Record<number, string>, r: any) => ({ ...acc, [r.id]: r.name }), {});
  } catch (err) {
    console.error('Failed to fetch league names:', err);
    return {};
  }
}
```

In `leagues.ts` add next to `listBySeason`:

```ts
  listAll: protectedProcedure.query(async () => {
    const [rows] = await getMysqlPool().query<RowDataPacket[]>(
      'SELECT l.id as _id, l.name, l.slug FROM gamedays_league l ORDER BY l.name'
    );
    return rows;
  }),
```

In `offers.ts`:
- imports: `offerLinesTotal, linesFromConfigs, validateOfferLines` from `'../../../../shared/lib/offerLines'`, `OfferLineSchema, OfferLetterSchema` from the schema, `generateOfferNumber`, `fetchLeaguesMap`.
- helper:

```ts
const loadDraft = async (id: string) => {
  const offer = await Offer.findById(id);
  if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
  if (offer.status !== 'draft') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft offers can be edited.' });
  }
  return offer;
};
const DAY_MS = 24 * 60 * 60 * 1000;
```

- `list`: replace the `totalPrice` line with
  `totalPrice: offer.lines?.length ? offerLinesTotal(offer.lines) : (totalByOfferId[offer._id?.toString()] || 0),`
- `get`: replace the inline MySQL block with `const leaguesMap = await fetchLeaguesMap();`, compute `const pricedConfigs = configs.map(...)` (existing), and return `{ offer, contact, configs: pricedConfigs, totalPrice: offer.lines?.length ? offerLinesTotal(offer.lines) : pricedConfigs.reduce((s, c) => s + c.finalPrice, 0) }`.
- new procedures:

```ts
  setLines: adminProcedure
    .input(z.object({ id: z.string(), lines: z.array(OfferLineSchema) }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      const invalid = validateOfferLines(input.lines);
      if (invalid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Zeile ${invalid.index + 1}: ${invalid.message}` });
      }
      offer.lines = input.lines;
      await offer.save();
      return normalizeOffer(offer);
    }),

  generateLines: adminProcedure
    .input(z.object({ id: z.string(), overwrite: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      if (offer.lines?.length && !input.overwrite) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Offer already has price lines.' });
      }
      const configs = await FinancialConfig.find({ offerId: offer._id }).lean();
      const leaguesMap = await fetchLeaguesMap(configs.map((c) => c.leagueId));
      offer.lines = linesFromConfigs(configs.map((c) => computeConfigPrices(c)), leaguesMap);
      await offer.save();
      return normalizeOffer(offer);
    }),

  updateLetter: adminProcedure
    .input(z.object({ id: z.string(), data: OfferLetterSchema.extend({ assignNumber: z.boolean().optional() }) }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      const { assignNumber, ...data } = input.data;
      Object.assign(offer, data);
      if (!offer.offerDate) offer.offerDate = new Date();
      if (assignNumber && !offer.offerNumber) offer.offerNumber = await generateOfferNumber(offer.offerDate);
      if (!offer.validUntil) offer.validUntil = new Date(offer.offerDate.getTime() + 30 * DAY_MS);
      try {
        await offer.save();
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({ code: 'CONFLICT', message: `Angebotsnummer ${offer.offerNumber} ist bereits vergeben.` });
        }
        throw err;
      }
      return normalizeOffer(offer);
    }),
```

Make sure `Offer.init()` has built the unique index before the RF5 test runs: in the test's `beforeAll`, after `connectMongo`, call `await Offer.init()` (add it to the test above if the duplicate save does not throw).

- [ ] **Step 4: Run, verify pass (and existing offer tests)**

Run: `npm run test -- src/server/routers/finance/__tests__/ src/server/__tests__/offers.test.ts && npm run typecheck:server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/lib/leagueNames.ts src/server/routers/finance/offers.ts src/server/routers/finance/leagues.ts src/server/routers/finance/__tests__/offers-lines.test.ts src/server/routers/finance/__tests__/leagues.test.ts
git commit -m "feat(offers): edit price lines and letter metadata via tRPC; list all leagues"
```

---

### Task 4: Offer letter PDF in the legacy layout + previewPdf

**Files:**
- Create: `src/server/lib/offerPdfData.ts`
- Modify: `src/server/services/PdfService.ts`
- Modify: `src/server/jobs/FileOfferJob.ts`, `src/server/routers/finance/offers-drive.ts` (job payload no longer needs `configs`), `src/server/routers/finance/offers.ts` (`previewPdf`)
- Test: `src/server/services/__tests__/PdfService.test.ts` (replace offer section), `src/server/jobs/__tests__/*` (adjust if they assert `configs` in payload), `src/server/routers/finance/__tests__/offers-drive.test.ts` (adjust)

**Interfaces:**
- Consumes: Tasks 1–3 (`OfferLine`, `offerLinesTotal`, `linesFromConfigs`, `fetchLeaguesMap`).
- Produces:
  ```ts
  // PdfService.ts
  export interface PdfGenerationData {
    offerNumber: string; offerDate: Date; validUntil: Date;
    introNote?: string; closingNote?: string;
    recipient: { associationName: string; contactName?: string; street: string; postalCode: string; city: string };
    lines: OfferLine[]; seasonName: string;
  }
  static generateOfferPdf(data: PdfGenerationData): Promise<Buffer>;
  static generateFilename(offerNumber: string, seasonName: string): string;
  // offerPdfData.ts
  export async function buildOfferPdfData(offerId: string): Promise<PdfGenerationData>;
  // offers router
  previewPdf({ id }) → { filename: string; base64: string }   // admin, no status change
  ```

Reference measurements (pdftotext `yMin`, A4 points) from `Angebot_20260319-2…pdf`: logo x 424.5 y 22.1 width 127; sender line 7pt x 43.1 y 50.6; recipient 11pt x 42.3 y 82.1 step 15.2; right meta block 9pt right edge 561.3, y 82.1 / 94.5 / 106.9; title 14pt bold y 163.4; "Unser Angebot" 14pt bold y 198.7; body 11pt from y 227.9, line step 15.2, width 495; section gap 25 before headings, 29 after; bullets at x 61.1, text at x 79.1; price lines: label x 79.1, detail x 187.1, amount right-aligned at 470; footer 7pt at y 784.8 step 8.4, columns x 49.1 / 217.8 / 386.6.

- [ ] **Step 1: Write the failing tests**

Replace the `generateFilename` and `generateOfferPdf` describes in `PdfService.test.ts` with:

```ts
const offerData = {
  offerNumber: '20261001-3',
  offerDate: new Date('2026-10-01T00:00:00Z'),
  validUntil: new Date('2026-11-15T00:00:00Z'),
  closingNote: 'Weitere Ligen berechnen wir mit 10 € pro Spieltag und Team.',
  recipient: { associationName: 'American Football und Cheerleading Verband Berlin-Brandenburg e. V.',
    contactName: 'Chris Claussen', street: 'Hanns-Braun-Straße 1', postalCode: '14053', city: 'Berlin' },
  lines: [
    { label: 'Oberliga Ost', detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 900, kind: 'fee' },
    { label: 'U16 Sachsen', amount: 144, kind: 'league' },
    { label: 'U16 Thüringen', amount: 216, kind: 'league' },
    { label: 'U16 Sachsen-Anhalt', amount: 180, kind: 'league' },
    { label: 'U13 Mitteldeutschland', amount: 122, kind: 'league' },
    { label: 'U13 Mitteldeutschland', amount: 72, kind: 'league' },
    { label: '15 % Rabatt auf die Jugendligen', detail: 'auf 734,00 €', amount: -110.1, kind: 'discount' },
    { label: 'DFFLF2', detail: '9 Teams', amount: 486, kind: 'optional' },
  ],
  seasonName: '2027',
} as const;

describe('PdfService.generateFilename', () => {
  it('uses the legacy Google Docs file name', () => {
    expect(PdfService.generateFilename('20261001-1', '2027'))
      .toBe('Angebot_20261001-1-Nutzung der LeagueSphere App für die Saison 2027.pdf');
  });
});

describe('PdfService.generateOfferPdf — layout matches the legacy offer letter', () => {
  // same texts/images spy harness as the invoice layout describe below (copy its beforeEach/afterEach,
  // `find` and `near` helpers verbatim)
  const render = (d: any = offerData) => PdfService.generateOfferPdf(d);

  it('returns a valid PDF', async () => {
    expect(isPdf(await render())).toBe(true);
  });

  it('places logo top right and the 7pt sender line', async () => {
    await render();
    near(images[0].x, 424.5); near(images[0].y, 22.1); near(images[0].opts.width, 127);
    const sender = find('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München');
    near(sender.x, 43.1); near(sender.y, 50.6); expect(sender.size).toBe(7);
  });

  it('draws recipient left and meta block right', async () => {
    await render();
    const name = find('American Football und Cheerleading Verband Berlin-Brandenburg e. V.');
    near(name.x, 42.3); near(name.y, 82.1); expect(name.size).toBe(11);
    near(find('z.H. Chris Claussen').y, 97.3);
    near(find('Hanns-Braun-Straße 1').y, 112.5);
    near(find('14053 Berlin').y, 127.7);
    near(find('info@bumbleflies.de').y, 82.1);
    near(find('Angebot: 20261001-3').y, 94.5);
    near(find('Datum: 01.10.2026').y, 106.9);
  });

  it('draws title and section headings in 14pt bold', async () => {
    await render();
    const title = find('Angebot: 20261001-3 - Nutzung der LeagueSphere App für die Saison 2027');
    near(title.y, 163.4); expect(title.size).toBe(14); expect(title.font).toBe('Helvetica-Bold');
    for (const h of ['Unser Angebot', 'Leistungsumfang', 'Preise und Konditionen']) {
      expect(find(h).font).toBe('Helvetica-Bold');
    }
  });

  it('states the total in the pricing sentence and lists lines with right-aligned amounts', async () => {
    await render();
    expect(texts.some((t) => t.str.includes('berechnen wir 1.523,90 €, die sich wie folgt zusammensetzen:'))).toBe(true);
    const label = find('Oberliga Ost');
    near(label.x, 79.1);
    near(find('bis zu 20 Spieltage mit jeweils 6 Teams').x, 187.1);
    // euro() emits a no-break space before €; build the expected string with the same formatter
    expect(find(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(-110.1)).opts.align).toBe('right');
    expect(find('Gesamt (zzgl. MwSt.)').font).toBe('Helvetica-Bold');
  });

  it('lists optional lines after the total under "Optional:"', async () => {
    await render();
    expect(find('Optional:').y).toBeGreaterThan(find('Gesamt (zzgl. MwSt.)').y);
    expect(find('DFFLF2').y).toBeGreaterThan(find('Optional:').y);
  });

  it('prints closing note, VAT + validity sentence and sign-off', async () => {
    await render();
    find('Weitere Ligen berechnen wir mit 10 € pro Spieltag und Team.');
    find('Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.');
    find('Wir binden uns an dieses Angebot bis zum 15.11.2026 und freuen uns auf die Zusammenarbeit.');
    find('Viele Grüße');
    find('bumbleflies (i.V. Christian Dähn)');
  });

  it('pins the 3-column 7pt footer to the page bottom', async () => {
    await render();
    const f = find('bumbleflies UG (haftungsbeschränkt)');
    near(f.x, 49.1); near(f.y, 784.8); expect(f.size).toBe(7);
    near(find('Bank: GLS Bank').x, 217.8);
    near(find('E-mail: info@bumbleflies.de').x, 386.6);
  });

  it('RF2: long line lists continue on a new page instead of overlapping the footer', async () => {
    const addPage = vi.spyOn(PDFDocument.prototype as any, 'addPage');
    const many = Array.from({ length: 30 }, (_, i) => ({ label: `Liga ${i + 1}`, detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 10, kind: 'league' }));
    await render({ ...offerData, lines: many });
    expect(addPage).toHaveBeenCalled();
    const maxBodyY = Math.max(...texts.filter((t) => t.size !== 7).map((t) => t.y));
    expect(maxBodyY).toBeLessThan(775);
  });

  it('wraps a long detail inside its column', async () => {
    await render({ ...offerData, lines: [{ label: 'X', detail: 'sehr '.repeat(40), amount: 1, kind: 'fee' }] });
    expect(find('sehr '.repeat(40)).opts.width).toBeLessThanOrEqual(200);
  });
});
```

Test for `buildOfferPdfData` in `src/server/lib/__tests__/offerPdfData.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { connectMongo, disconnectMongo } from '../../db/mongo';
import { Offer } from '../../models/Offer';
import { Contact } from '../../models/Contact';
import { Association } from '../../models/Association';
import { FinancialConfig } from '../../models/FinancialConfig';
import { getMysqlPool } from '../../db/mysql';
import { buildOfferPdfData } from '../offerPdfData';

vi.mock('../../db/mysql');
const query = vi.fn(async (sql: string) =>
  sql.includes('gamedays_season') ? [[{ name: '2027' }]] : [[{ id: 16, name: 'Regionalliga NRW' }]]);
vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

describe('buildOfferPdfData', () => {
  beforeAll(connectMongo);
  afterAll(disconnectMongo);
  afterEach(() => Promise.all([Offer, Contact, Association, FinancialConfig].map((m: any) => m.deleteMany({}))));

  const setup = async (offerExtra: any = {}) => {
    const association = await Association.create({ name: 'AFCVNRW e.V.', address: { street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl', country: 'Germany' } } as any);
    const contact = await Contact.create({ name: 'Fabian Pawlowski', email: 'f@x.de', address: { street: 's', city: 'c', postalCode: 'p', country: 'Germany' } });
    return Offer.create({ associationId: association.id, seasonId: 9, leagueIds: [16], contactId: contact._id, ...offerExtra });
  };

  it('uses stored lines, number, dates and the association address with z.H. contact', async () => {
    const offer = await setup({ offerNumber: '20261001-2', offerDate: new Date('2026-10-01'), validUntil: new Date('2026-11-15'),
      lines: [{ label: 'Regionalliga', detail: '12 Teams', amount: 648, kind: 'league' }] });
    const data = await buildOfferPdfData(offer.id);
    expect(data).toMatchObject({
      offerNumber: '20261001-2', seasonName: '2027',
      recipient: { associationName: 'AFCVNRW e.V.', contactName: 'Fabian Pawlowski', street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
      lines: [{ label: 'Regionalliga', amount: 648 }],
    });
  });

  it('falls back to config lines, id prefix number, createdAt date and +30 days for legacy offers', async () => {
    const offer = await setup();
    await FinancialConfig.create({ leagueId: 16, seasonId: 9, costModel: 'SEASON', baseRateOverride: 54, expectedTeamsCount: 12, offerId: offer._id });
    const data = await buildOfferPdfData(offer.id);
    expect(data.offerNumber).toBe(offer.id.slice(0, 8));
    expect(data.lines).toEqual([{ label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 16 }]);
    expect(data.validUntil.getTime() - data.offerDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
```

(Check `src/server/models/Association.ts` for its required fields before running; add any required field the `create` above is missing.)

- [ ] **Step 2: Run, verify they fail**

Run: `npm run test -- src/server/services/__tests__/PdfService.test.ts src/server/lib/__tests__/offerPdfData.test.ts`
Expected: FAIL (old signature, missing module).

- [ ] **Step 3: Implement**

`src/server/lib/offerPdfData.ts`:

```ts
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { Association } from '../models/Association';
import { FinancialConfig } from '../models/FinancialConfig';
import { computeConfigPrices } from './configPricing';
import { fetchLeaguesMap } from './leagueNames';
import { getMysqlPool } from '../db/mysql';
import { linesFromConfigs } from '../../../shared/lib/offerLines';
import type { PdfGenerationData } from '../services/PdfService';

const DAY_MS = 24 * 60 * 60 * 1000;

async function seasonName(seasonId: number): Promise<string> {
  try {
    const [rows] = await getMysqlPool().query<any[]>('SELECT name FROM gamedays_season WHERE id = ?', [seasonId]);
    return rows[0]?.name != null ? String(rows[0].name) : String(seasonId);
  } catch {
    return String(seasonId);
  }
}

/** Everything the offer letter needs, resolved from the offer and its relations. */
export async function buildOfferPdfData(offerId: string): Promise<PdfGenerationData> {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new Error('Offer not found');
  const contact = await Contact.findById(offer.contactId).lean();
  const association = await Association.findById(offer.associationId).lean().catch(() => null);
  // The postal address is the association's; the contact is the z.H. line.
  const address: any = (association as any)?.address ?? (contact as any)?.address ?? {};

  let lines = offer.lines ?? [];
  if (!lines.length) {
    const configs = await FinancialConfig.find({ offerId: offer._id }).lean();
    const leaguesMap = await fetchLeaguesMap(configs.map((c) => c.leagueId));
    lines = linesFromConfigs(configs.map((c) => computeConfigPrices(c)), leaguesMap);
  }

  const offerDate = offer.offerDate ?? offer.createdAt;
  return {
    offerNumber: offer.offerNumber ?? offer.id.slice(0, 8),
    offerDate,
    validUntil: offer.validUntil ?? new Date(offerDate.getTime() + 30 * DAY_MS),
    introNote: offer.introNote,
    closingNote: offer.closingNote,
    recipient: {
      associationName: (association as any)?.name ?? 'Unbekannter Verband',
      contactName: (contact as any)?.name,
      street: address.street ?? '',
      postalCode: address.postalCode ?? '',
      city: address.city ?? '',
    },
    lines,
    seasonName: await seasonName(offer.seasonId),
  };
}
```

In `PdfService.ts`: replace `PdfGenerationData` with the interface from **Produces**, delete the blue-style `generateOfferPdf`, add:

```ts
/**
 * Absolute positions (A4 points) of the legacy Google Docs offer letter, measured with
 * pdftotext -bbox from Angebot_20260319-2 (2026). Text y is the top of the line box.
 */
const OFFER_LAYOUT = {
  left: 43.1,
  logo: { x: 424.5, y: 22.1, width: 127 },
  senderY: 50.6,
  recipient: { x: 42.3, y: 82.1, lineHeight: 15.2 },
  meta: { right: 561.3, y: 82.1, lineHeight: 12.4 },
  titleY: 163.4,
  firstHeadingY: 198.7,
  bodyWidth: 495,
  lineHeight: 15.2,
  headingGapBefore: 10,
  headingGapAfter: 29.2,
  bullet: { x: 61.1, textX: 79.1 },
  priceColumns: { label: 79.1, labelWidth: 104, detail: 187.1, detailWidth: 200, amountRight: 470 },
  /** body content must end above this; the footer starts at footerY */
  contentBottom: 770,
  continuationTopY: 50,
  footerY: 784.8,
  footerLineHeight: 8.4,
  footerColumns: [49.1, 217.8, 386.6] as const,
};

const OFFER_FEATURES = [
  'Einfache Spielplanerstellung und Einteilung der Offiziellen',
  'Live-Ergebnisse für die Fans und Teams',
  'Liveticker für die Fans',
  'Tracking der Schiedsrichtereinsätze',
  'Digitalen Passcheck der Teams ohne Listen zu drucken',
  'Automatischer digitaler Passtransfer innerhalb der App',
];
```

and the generator:

```ts
  /**
   * Renders an offer as the legacy Google Docs letter (logo, address/meta header, three
   * sections, bullet price lines, footer) so app offers look like the ones sent before.
   */
  static generateOfferPdf(data: PdfGenerationData): Promise<Buffer> {
    const L = OFFER_LAYOUT;
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const font = (size: number, bold = false) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const line = (str: string, x: number, y: number, size: number, bold = false, opts: PDFKit.Mixins.TextOptions = {}) =>
      font(size, bold).text(str, x, y, { lineBreak: false, ...opts });
    const right = (str: string, rightEdge: number, y: number, size: number, bold = false) =>
      line(str, rightEdge - RIGHT_ALIGN_BOX, y, size, bold, { width: RIGHT_ALIGN_BOX, align: 'right' });

    let y = 0;
    const ensure = (height: number) => {
      if (y + height > L.contentBottom) {
        drawFooter();
        doc.addPage({ size: 'A4', margin: 0 });
        y = L.continuationTopY;
      }
    };
    /** Wrapped paragraph at the body width; advances y. */
    const paragraph = (str: string, x = L.left, width = L.bodyWidth, bold = false) => {
      font(11, bold);
      const h = doc.heightOfString(str, { width, lineGap: L.lineHeight - 12.65 });
      ensure(h);
      doc.text(str, x, y, { width, lineGap: L.lineHeight - 12.65 });
      y += Math.max(h, L.lineHeight);
    };
    const heading = (str: string) => {
      y += L.headingGapBefore;
      ensure(L.headingGapAfter + L.lineHeight);
      line(str, L.left, y, 14, true);
      y += L.headingGapAfter;
    };
    const drawFooter = () => {
      const cols: Array<[number, string[]]> = [
        [L.footerColumns[0], ['bumbleflies UG (haftungsbeschränkt)', 'Geschäftsführer: Christoph Kämpfe,',
          'Christian Dähn, Sebastian Keller', 'Gleiwitzer-Str-6d', '81929 München']],
        [L.footerColumns[1], ['Bank: GLS Bank', 'IBAN: DE96430609671106170600', 'HRB-Nr.: 260473']],
        [L.footerColumns[2], ['E-mail: info@bumbleflies.de', 'Web: bumbleflies.de']],
      ];
      for (const [x, rows] of cols) rows.forEach((r, i) => line(r, x, L.footerY + i * L.footerLineHeight, 7));
    };

    const { recipient: r, lines, seasonName } = data;
    const total = offerLinesTotal(lines);
    const regular = lines.filter((l) => l.kind !== 'optional');
    const optional = lines.filter((l) => l.kind === 'optional');

    doc.fillColor('black');
    doc.image(BUMBLEFLIES_LOGO_PNG_DATA_URI, L.logo.x, L.logo.y, { width: L.logo.width });
    line('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München', L.left, L.senderY, 7);

    const recipientLines = [r.associationName, ...(r.contactName ? [`z.H. ${r.contactName}`] : []),
      r.street, `${r.postalCode} ${r.city}`.trim()].filter(Boolean);
    recipientLines.forEach((s, i) => line(s, L.recipient.x, L.recipient.y + i * L.recipient.lineHeight, 11));
    ['info@bumbleflies.de', `Angebot: ${data.offerNumber}`, `Datum: ${deDate(data.offerDate)}`]
      .forEach((s, i) => right(s, L.meta.right, L.meta.y + i * L.meta.lineHeight, 9));

    line(`Angebot: ${data.offerNumber} - Nutzung der LeagueSphere App für die Saison ${seasonName}`,
      L.left, L.titleY, 14, true);

    y = L.firstHeadingY - L.headingGapBefore;
    heading('Unser Angebot');
    paragraph(`Wir freuen uns, dir unser Angebot für die Nutzung der LeagueSphere App zur effizienten Organisation ` +
      `und Verwaltung der Saison ${seasonName} zu unterbreiten. Unsere Plattform hilft dir dabei, die Spielplanung, ` +
      `die Verwaltung von Offiziellen und die Kommunikation mit Fans und Teams zu optimieren.`);
    if (data.introNote) paragraph(data.introNote);

    heading('Leistungsumfang');
    paragraph('Die Anwendung kann unter https://leaguesphere.app von allen Spieler:innen und Zuschauer:innen ' +
      'genutzt werden, mit folgenden Funktionen:');
    y += 12;
    for (const f of OFFER_FEATURES) {
      ensure(L.lineHeight);
      line('•', L.bullet.x, y, 11);
      line(f, L.bullet.textX, y, 11);
      y += L.lineHeight;
    }

    heading('Preise und Konditionen');
    paragraph(`Für die Nutzung der LeagueSphere App in der Saison ${seasonName} berechnen wir ${euro(total)}, ` +
      'die sich wie folgt zusammensetzen:');
    const C = L.priceColumns;
    const priceRow = (l: { label: string; detail?: string; amount: number }) => {
      font(11);
      const h = Math.max(
        doc.heightOfString(l.label, { width: C.labelWidth }),
        l.detail ? doc.heightOfString(l.detail, { width: C.detailWidth }) : 0,
        L.lineHeight);
      ensure(h);
      line('•', L.bullet.x, y, 11);
      font(11).text(l.label, C.label, y, { width: C.labelWidth });
      if (l.detail) font(11).text(l.detail, C.detail, y, { width: C.detailWidth });
      right(euro(l.amount), C.amountRight, y, 11);
      y += h;
    };
    regular.forEach(priceRow);
    ensure(L.lineHeight + 4);
    doc.moveTo(C.label, y + 1).lineTo(C.amountRight, y + 1).lineWidth(0.5).strokeColor('black').stroke();
    y += 4;
    line('Gesamt (zzgl. MwSt.)', C.label, y, 11, true);
    right(euro(total), C.amountRight, y, 11, true);
    y += L.lineHeight;
    if (optional.length) {
      y += 6;
      ensure(L.lineHeight * 2);
      line('Optional:', L.left, y, 11, true);
      y += L.lineHeight;
      optional.forEach(priceRow);
    }

    y += 15;
    if (data.closingNote) paragraph(data.closingNote);
    paragraph('Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.');
    y += 15;
    paragraph(`Wir binden uns an dieses Angebot bis zum ${deDate(data.validUntil)} und freuen uns auf die Zusammenarbeit.`);
    y += 15;
    ensure(L.lineHeight * 5);
    paragraph('Viele Grüße');
    y += 45;
    paragraph('bumbleflies (i.V. Christian Dähn)');

    drawFooter();
    doc.end();
    return done;
  }

  static generateFilename(offerNumber: string, seasonName: string): string {
    return `Angebot_${offerNumber}-Nutzung der LeagueSphere App für die Saison ${seasonName}.pdf`;
  }
```

with `import { offerLinesTotal, type OfferLine } from '../../../shared/lib/offerLines';`. Make `deDate` format with two-digit day/month: `d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })` (also check the invoice tests still pass; they use the same helper).

Note on line-height: Helvetica 11pt's natural line height is ≈12.65pt; `lineGap: L.lineHeight - 12.65` makes wrapped lines 15.2pt apart like the original. If the `near(...y...)` assertions are off by more than 1.5pt for bullet rows, adjust the `y += 12` spacer after the Leistungsumfang paragraph, not the measured constants.

`FileOfferJob.ts`: replace the contact/association/league/season resolution and `pdfData` construction with

```ts
      const pdfData = await buildOfferPdfData(offerId);
      const pdfBuffer = await PdfService.generateOfferPdf(pdfData);
      const filename = PdfService.generateFilename(pdfData.offerNumber, pdfData.seasonName);
```

and drop `configs` from `FileOfferJobData`; in `offers-drive.ts` drop `buildPricedConfigs` and the `configs` payload field (the PDF now resolves lines itself from stored data). Update the existing `offers-drive.test.ts` case "sends priced configs…" to assert the payload is `{ offerId, userId, driveFolderId, accessToken }` instead, and adjust `src/server/jobs/__tests__` mocks to mock `buildOfferPdfData`.

`offers.ts` — add:

```ts
  previewPdf: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const exists = await Offer.exists({ _id: input.id });
      if (!exists) throw new TRPCError({ code: 'NOT_FOUND' });
      const data = await buildOfferPdfData(input.id);
      const pdf = await PdfService.generateOfferPdf(data);
      return { filename: PdfService.generateFilename(data.offerNumber, data.seasonName), base64: pdf.toString('base64') };
    }),
```

plus a router test in `offers-lines.test.ts`:

```ts
  it('previewPdf returns a PDF without changing status', async () => {
    const offer = await draft({ offerNumber: '20261001-9', lines: [{ label: 'Grundpreis', amount: 600, kind: 'fee' }] });
    const res = await caller.previewPdf({ id: offer.id });
    expect(Buffer.from(res.base64, 'base64').toString('ascii', 0, 5)).toBe('%PDF-');
    expect(res.filename).toBe('Angebot_20261001-9-Nutzung der LeagueSphere App für die Saison 7.pdf');
    expect((await Offer.findById(offer.id))!.status).toBe('draft');
  });
```

(The mysql mock in that file returns league rows for every query, so the season resolves to the id `7` — that is expected here.)

- [ ] **Step 4: Run, verify pass**

Run: `npm run test -- src/server && npm run typecheck:server`
Expected: PASS (invoice layout tests unchanged and green).

- [ ] **Step 5: Commit**

```bash
git add src/server shared
git commit -m "feat(pdf): render offers as the legacy bumbleflies offer letter, add PDF preview"
```

---

### Task 5: Client — price lines editor, letter fields, preview, all-league picker

**Files:**
- Create: `src/client/components/Offer/OfferLinesEditor.tsx`
- Test: `src/client/components/Offer/__tests__/OfferLinesEditor.test.tsx`
- Modify: `src/client/pages/OfferDetailPage.tsx`, `src/client/components/Offer/OfferCreateWizard.tsx:63`, `src/client/components/Offer/OfferEditWizard.tsx:54`

**Interfaces:**
- Consumes: `OfferLine`, `offerLinesTotal`, `percentDiscountLine` (Task 1); `finance.offers.setLines|generateLines|updateLetter|previewPdf`, `finance.leagues.listAll` (Tasks 3–4).
- Produces: `export function OfferLinesEditor(props: { lines: OfferLine[]; readOnly?: boolean; saving?: boolean; onSave: (lines: OfferLine[]) => void; onGenerate: () => void; }): JSX.Element`

- [ ] **Step 1: Write the failing component test**

```tsx
// src/client/components/Offer/__tests__/OfferLinesEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { OfferLinesEditor } from '../OfferLinesEditor';

const lines = [
  { label: 'U16 Sachsen', amount: 144, kind: 'league' as const },
  { label: 'U16 Thüringen', amount: 216, kind: 'league' as const },
  { label: 'DFFLF2', amount: 486, kind: 'optional' as const },
];

describe('OfferLinesEditor', () => {
  it('shows the total without optional lines', () => {
    render(<OfferLinesEditor lines={lines} onSave={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('360,00 €');
  });

  it('adds, edits and deletes lines and saves the result', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zeile hinzufügen' }));
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.change(within(rows[3]).getByLabelText('Bezeichnung'), { target: { value: 'Grundpreis' } });
    fireEvent.change(within(rows[3]).getByLabelText('Betrag'), { target: { value: '600' } });
    fireEvent.change(within(rows[3]).getByLabelText('Art'), { target: { value: 'fee' } });
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Zeile löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(onSave).toHaveBeenCalledWith([
      lines[0], lines[1], { label: 'Grundpreis', amount: 600, kind: 'fee' },
    ]);
  });

  it('adds a percent discount on the selected lines', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    const rows = screen.getAllByTestId('offer-line-row');
    fireEvent.click(within(rows[0]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.click(within(rows[1]).getByLabelText('Für Rabatt auswählen'));
    fireEvent.change(screen.getByLabelText('Rabatt in %'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rabatt hinzufügen' }));
    expect(screen.getByTestId('offer-lines-total')).toHaveTextContent('306,00 €');
  });

  it('moves a line up', () => {
    const onSave = vi.fn();
    render(<OfferLinesEditor lines={lines} onSave={onSave} onGenerate={vi.fn()} />);
    fireEvent.click(within(screen.getAllByTestId('offer-line-row')[1]).getByRole('button', { name: 'Nach oben' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preise speichern' }));
    expect(onSave.mock.calls[0][0][0].label).toBe('U16 Thüringen');
  });

  it('is read-only for non-draft offers', () => {
    render(<OfferLinesEditor lines={lines} readOnly onSave={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Preise speichern' })).toBeNull();
    expect(screen.queryAllByLabelText('Bezeichnung')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm run test -- src/client/components/Offer/__tests__/OfferLinesEditor.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement the editor**

```tsx
// src/client/components/Offer/OfferLinesEditor.tsx
import { useEffect, useState } from 'react';
import { offerLinesTotal, percentDiscountLine, type OfferLine, type OfferLineKind } from '../../../../shared/lib/offerLines';

const euro = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const KINDS: Array<[OfferLineKind, string]> = [['league', 'Liga'], ['fee', 'Gebühr'], ['discount', 'Rabatt'], ['optional', 'Optional']];

interface Props {
  lines: OfferLine[];
  readOnly?: boolean;
  saving?: boolean;
  onSave: (lines: OfferLine[]) => void;
  onGenerate: () => void;
}

/** Ordered price lines of an offer: edit, reorder, add a % discount, save as a whole. */
export function OfferLinesEditor({ lines, readOnly, saving, onSave, onGenerate }: Props) {
  const [draft, setDraft] = useState<OfferLine[]>(lines);
  const [selected, setSelected] = useState<number[]>([]);
  const [percent, setPercent] = useState('');
  useEffect(() => setDraft(lines), [lines]);

  const update = (i: number, patch: Partial<OfferLine>) =>
    setDraft((d) => d.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, dir: -1 | 1) => setDraft((d) => {
    const j = i + dir;
    if (j < 0 || j >= d.length) return d;
    const next = [...d];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const addDiscount = () => {
    const p = Number(percent.replace(',', '.'));
    if (!selected.length || !(p > 0)) return;
    setDraft((d) => [...d, percentDiscountLine(d, selected, p)]);
    setSelected([]);
    setPercent('');
  };
  const clean = (l: OfferLine): OfferLine => {
    const { detail, leagueId, ...rest } = l;
    return { ...rest, ...(detail ? { detail } : {}), ...(leagueId ? { leagueId } : {}) };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {!readOnly && <th aria-label="Auswahl" />}
              <th>Bezeichnung</th><th>Detail</th><th>Art</th><th style={{ textAlign: 'right' }}>Betrag</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {draft.map((l, i) => (
              <tr key={i} data-testid="offer-line-row">
                {readOnly ? (
                  <>
                    <td>{l.label}</td><td>{l.detail}</td>
                    <td>{KINDS.find(([k]) => k === l.kind)?.[1]}</td>
                    <td style={{ textAlign: 'right' }}>{euro(l.amount)}</td>
                  </>
                ) : (
                  <>
                    <td><input type="checkbox" aria-label="Für Rabatt auswählen" checked={selected.includes(i)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i] : s.filter((x) => x !== i)))} /></td>
                    <td><input aria-label="Bezeichnung" value={l.label} onChange={(e) => update(i, { label: e.target.value })} /></td>
                    <td><input aria-label="Detail" value={l.detail ?? ''} onChange={(e) => update(i, { detail: e.target.value })} /></td>
                    <td>
                      <select aria-label="Art" value={l.kind} onChange={(e) => update(i, { kind: e.target.value as OfferLineKind })}>
                        {KINDS.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
                      </select>
                    </td>
                    <td><input aria-label="Betrag" type="number" step="0.01" style={{ textAlign: 'right', width: '8em' }}
                      value={Number.isFinite(l.amount) ? l.amount : ''}
                      onChange={(e) => update(i, { amount: e.target.value === '' ? Number.NaN : Number(e.target.value) })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-secondary" aria-label="Nach oben" onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="btn btn-secondary" aria-label="Nach unten" onClick={() => move(i, 1)}>↓</button>
                      <button type="button" className="btn btn-secondary" aria-label="Zeile löschen"
                        onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>✕</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={readOnly ? 3 : 4}><strong>Gesamt (zzgl. MwSt., ohne optionale Zeilen)</strong></td>
              <td style={{ textAlign: 'right' }} data-testid="offer-lines-total"><strong>{euro(offerLinesTotal(draft.filter((l) => Number.isFinite(l.amount))))}</strong></td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary"
            onClick={() => setDraft((d) => [...d, { label: '', amount: 0, kind: 'fee' }])}>Zeile hinzufügen</button>
          <button type="button" className="btn btn-secondary" onClick={onGenerate}>Aus Ligen erzeugen</button>
          <label>Rabatt in %
            <input aria-label="Rabatt in %" inputMode="decimal" style={{ width: '4em', marginLeft: 4 }}
              value={percent} onChange={(e) => setPercent(e.target.value)} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={addDiscount}>Rabatt hinzufügen</button>
          <button type="button" className="btn btn-primary" disabled={saving}
            onClick={() => onSave(draft.map(clean))}>Preise speichern</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the editor test, verify pass**

Run: `npm run test -- src/client/components/Offer/__tests__/OfferLinesEditor.test.tsx` — Expected: PASS.

- [ ] **Step 5: Wire into `OfferDetailPage.tsx`**

Add after the existing mutations:

```tsx
  const setLines = trpc.finance.offers.setLines.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const generateLines = trpc.finance.offers.generateLines.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const updateLetter = trpc.finance.offers.updateLetter.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const utils = trpc.useUtils();
  const openPreview = async () => {
    const { base64 } = await utils.finance.offers.previewPdf.fetch({ id });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
  };
```

Replace the "League Pricing Breakdown" card with a "Preise" card that renders

```tsx
<OfferLinesEditor
  lines={offer.lines ?? []}
  readOnly={offer.status !== 'draft'}
  saving={setLines.isPending}
  onSave={(lines) => setLines.mutate({ id, lines })}
  onGenerate={() => generateLines.mutate({ id, overwrite: !!offer.lines?.length && confirm('Vorhandene Zeilen ersetzen?') })}
/>
```

and keep the old per-league breakdown below it, collapsed under a `<details><summary>Liga-Konfiguration</summary>…</details>`. Add an "Angebotsschreiben" card for drafts with inputs `Angebotsnummer` (text), `Datum` (date), `Gültig bis` (date), `Zusatztext`, `Schlusstext` (textareas) and buttons `Nummer vergeben` (`updateLetter.mutate({ id, data: { assignNumber: true } })`), `Speichern` (`updateLetter.mutate({ id, data: { ...fields } })`), and `PDF-Vorschau` (`openPreview`). Use the page's existing inline-style + `className="card"` conventions. Show `data.totalPrice` (from `get`) as the headline price.

In both wizards replace `trpc.finance.leagues.listBySeason.useQuery(…)` with `trpc.finance.leagues.listAll.useQuery()` (keep the variable name `leagues`; remove the now-unused season/association args).

- [ ] **Step 6: Verify**

Run: `npm run test -- src/client && npm run typecheck && npm run lint`
Expected: PASS, 0 lint errors. Fix wizard tests that mocked `listBySeason` to mock `listAll`.

- [ ] **Step 7: Commit**

```bash
git add src/client
git commit -m "feat(offers): price lines editor, letter fields and PDF preview on the offer page"
```

---

### Task 6: Local verification of the five 2027 offers

**Files:**
- Create: `scripts/render-2027-offers.ts` (dev-only, not shipped; add `scripts/` to nothing — it is run with `npx tsx`)

- [ ] **Step 1: Write the render script**

```ts
// scripts/render-2027-offers.ts — renders the 2027 renewal offers to ./tmp-offers for review.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PdfService } from '../src/server/services/PdfService';
import { offerLinesTotal, type OfferLine } from '../shared/lib/offerLines';

const date = new Date('2026-10-01T00:00:00Z');
const validUntil = new Date('2026-11-15T00:00:00Z');
const offers: Array<{ no: string; expected: number; recipient: any; lines: OfferLine[]; introNote?: string; closingNote?: string }> = [
  { no: '20261001-1', expected: 1440,
    recipient: { associationName: 'American Football Verband Bayern e.V.', contactName: 'Lynn Hoffer', street: 'Georg-Brauchle-Ring 93', postalCode: '80992', city: 'München' },
    lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '35 Teams à 16 €', amount: 560, kind: 'fee' },
      { label: 'Jugendteams', detail: '35 Teams à 9 €', amount: 280, kind: 'fee' },
    ] },
  { no: '20261001-2', expected: 1904,
    recipient: { associationName: 'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.', contactName: 'Fabian Pawlowski', street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
    lines: [
      { label: 'Regionalliga', detail: '12 Teams', amount: 648, kind: 'league' },
      { label: 'Oberliga', detail: '17 Teams', amount: 918, kind: 'league' },
      { label: 'U10', detail: '6 Teams', amount: 78, kind: 'league' },
      { label: 'U13', detail: '11 Teams', amount: 143, kind: 'league' },
      { label: 'U16', detail: '9 Teams', amount: 117, kind: 'league' },
    ] },
  { no: '20261001-3', expected: 1523.9, closingNote: 'Weitere Ligen berechnen wir mit 10 € pro Spieltag und Team.',
    recipient: { associationName: 'American Football und Cheerleading Verband Berlin-Brandenburg e. V.', contactName: 'Chris Claussen', street: 'Hanns-Braun-Straße 1', postalCode: '14053', city: 'Berlin' },
    lines: [
      { label: 'Oberliga Ost', detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 900, kind: 'fee' },
      { label: 'U16 Sachsen', amount: 144, kind: 'league' },
      { label: 'U16 Thüringen', amount: 216, kind: 'league' },
      { label: 'U16 Sachsen-Anhalt', amount: 180, kind: 'league' },
      { label: 'U13 Mitteldeutschland', amount: 122, kind: 'league' },
      { label: 'U13 Mitteldeutschland', amount: 72, kind: 'league' },
      { label: '15 % Rabatt auf die Jugendligen', detail: 'auf 734,00 €', amount: -110.1, kind: 'discount' },
    ] },
  { no: '20261001-4', expected: 2484,
    recipient: { associationName: 'American Football Verband Deutschland e.V.', contactName: 'Max Keneder', street: 'Richard-Herrmann-Platz 1', postalCode: '60386', city: 'Frankfurt am Main' },
    lines: [
      { label: 'DFFL', detail: '16 Teams', amount: 864, kind: 'league' },
      { label: 'DFFL2', detail: '20 Teams', amount: 1080, kind: 'league' },
      { label: 'DFFLF', detail: '10 Teams', amount: 540, kind: 'league' },
      { label: 'DFFLF2', detail: '9 Teams', amount: 486, kind: 'optional' },
    ] },
  { no: '20261001-5', expected: 762,
    introNote: 'Wir schicken es bewusst früh, damit es in eure Budgetplanung für 2027 einfließen kann.',
    recipient: { associationName: 'American Football Verband Hessen e.V.', contactName: 'Michael Hanke', street: 'Postfach 15 02 51', postalCode: '60062', city: 'Frankfurt am Main' },
    lines: [
      { label: 'Grundpreis', amount: 600, kind: 'fee' },
      { label: 'Erwachsenenteams', detail: '9 Teams à 18 €', amount: 162, kind: 'fee' },
    ] },
];

mkdirSync('tmp-offers', { recursive: true });
for (const o of offers) {
  const total = offerLinesTotal(o.lines);
  if (total !== o.expected) throw new Error(`${o.no}: total ${total} != ${o.expected}`);
  const pdf = await PdfService.generateOfferPdf({ offerNumber: o.no, offerDate: date, validUntil, introNote: o.introNote,
    closingNote: o.closingNote, recipient: o.recipient, lines: o.lines, seasonName: '2027' });
  const name = PdfService.generateFilename(o.no, '2027');
  writeFileSync(`tmp-offers/${name}`, pdf);
  console.log(`${name}  ${total.toFixed(2)} €`);
}
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/render-2027-offers.ts && ls tmp-offers`
Expected: five PDFs, totals 1440.00 / 1904.00 / 1523.90 / 2484.00 / 762.00.

- [ ] **Step 3: Compare against the 2026 letter**

Run: `pdftotext -bbox-layout "tmp-offers/Angebot_20261001-1-Nutzung der LeagueSphere App für die Saison 2027.pdf" /dev/stdout | grep -E 'yMin="(8[0-9]|9[0-9]|16[0-9]|19[0-9])' | head`
Expected: recipient, meta block, title and first heading within ±1.5pt of the reference positions in Task 4. Render page 1 of each PDF to PNG (`pdftoppm -r 60 -png -f 1 -l 1 …`) and look at the five images once next to the 2026 PDF; fix any visible overlap, then re-run Task 4's tests.

- [ ] **Step 4: Add the output dir to `.gitignore` and commit the script**

```bash
echo "tmp-offers/" >> .gitignore
git add scripts/render-2027-offers.ts .gitignore
git commit -m "chore(offers): script to render the 2027 renewal offers for review"
```

---

### Task 7: Docs, PR, release

**Files:**
- Modify: `AGENTS.md` (Domain gotchas), `docs/ARCHITECTURE.md` (Offer section)

- [ ] **Step 1: Document**

Add to `AGENTS.md` under *Domain Data Shapes & Gotchas*:

```md
- **Offer price lines win over configs.** `Offer.lines` (label/detail/amount/kind) — once non-empty — are the offer's price: `totalPrice` = `offerLinesTotal(lines)` (optional lines excluded, discounts negative). Offers without lines still price from `FinancialConfig`s. `generateLines` seeds lines from configs; `setLines` replaces them (drafts only).
- **Offer PDF mirrors the legacy Google Docs letter** (`OFFER_LAYOUT`, measured from `Angebot_20260319-2`). `previewPdf` renders it without changing status; `fileOfferInDrive` uploads it and marks the offer `sent`.
```

and a matching paragraph to the Offer entity in `docs/ARCHITECTURE.md`.

- [ ] **Step 2: Full verification**

Run: `npm run lint && npm run typecheck && npm run typecheck:server && npm run test && npm run build`
Expected: all green.

- [ ] **Step 3: Commit, push, open PR**

```bash
git add AGENTS.md docs/ARCHITECTURE.md
git commit -m "docs(offers): price lines and legacy offer letter"
git push -u origin feat/offer-letter-lines
gh pr create --repo dachrisch/league.finance --base master --title "feat(offers): price lines and legacy offer letter PDF" --body "<summary of tasks 1–6, test plan, screenshots of the five rendered 2027 offers>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: CI, merge, release**

Wait for CI green (`gh pr checks --watch`). After the user approves the merge: merge, let release-please open its release PR, merge that (auto-merge workflow), confirm the tag build pushed `dachrisch/league.finance:latest`, then confirm Watchtower picked it up: `curl -s https://finance.leaguesphere.app/health` shows the new version.

---

### Task 8: Enter the 2027 offers in prod (drafts only)

Done through the app UI as the logged-in admin (browser automation or by hand) — no direct database writes.

- [ ] **Step 1: Associations & contacts** — in *Associations*, make sure these exist with postal addresses (create missing ones):

| Association | Address | Contact |
|---|---|---|
| American Football Verband Bayern e.V. | Georg-Brauchle-Ring 93, 80992 München | Lynn Hoffer |
| American Football und Cheerleading Verband Nordrhein-Westfalen e.V. | Halterner Straße 193, 45770 Marl | Fabian Pawlowski |
| American Football und Cheerleading Verband Berlin-Brandenburg e. V. | Hanns-Braun-Straße 1, 14053 Berlin | Chris Claussen |
| American Football Verband Deutschland e.V. | Richard-Herrmann-Platz 1, 60386 Frankfurt am Main | Max Keneder |
| American Football Verband Hessen e.V. | Postfach 15 02 51, 60062 Frankfurt am Main | Michael Hanke |

- [ ] **Step 2: Create five draft offers for season 2027** via *New Offer*, picking the matching leagues (all-league picker), then on each offer page:
  - *Angebotsschreiben*: Angebotsnummer `20261001-1` … `-5` (order as in Task 6), Datum 01.10.2026, Gültig bis 15.11.2026, Zusatz-/Schlusstext as in Task 6.
  - *Preise*: enter exactly the lines of Task 6 for that offer (Ost: enter the six lines, select the five youth lines, 15 %, "Rabatt hinzufügen", rename the label to `15 % Rabatt auf die Jugendligen`); save.
- [ ] **Step 3: Check** each offer's headline total (1.440,00 / 1.904,00 / 1.523,90 / 2.484,00 / 762,00 €) and open *PDF-Vorschau* once per offer. Status stays **Draft**. Do **not** use "File in Drive".
- [ ] **Step 4: Report** the five offer URLs to the user.
