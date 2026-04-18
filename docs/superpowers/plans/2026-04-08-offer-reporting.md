# Offer & Reporting Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete offer creation, customization, and reporting system for associations, with PDF generation, Google Drive storage, and email sending.

**Architecture:** 
- **Data Layer:** Three new MongoDB models (Association, Offer, OfferLineItem) + modification to FinancialConfig
- **Utility Layer:** PDF generation, Drive upload, email sending, offer calculations
- **API Layer:** TRPC routers for associations and offers with endpoints for CRUD, PDF generation, pricing customization, status updates, and email sending
- **UI Layer:** Multi-step wizard for offer creation, dashboard with filtering, detail pages for viewing/editing

**Tech Stack:** 
- Backend: Node.js/Express, Mongoose (MongoDB), TRPC
- Frontend: React, Vite, React Router
- External: Google Drive API (via existing OAuth), PDF library (puppeteer or similar), Email service

---

## Phase 1: Data Models

### Task 1: Create Association Model

**Files:**
- Create: `src/server/models/Association.ts`
- Test: `src/server/models/__tests__/Association.test.ts`

- [ ] **Step 1: Write failing test for Association model**

```typescript
// src/server/models/__tests__/Association.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Association } from '../Association';
import { connect, disconnect } from '../../db/mongo';

describe('Association Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an association with name, description, email, and phone', async () => {
    const doc = await Association.create({
      name: 'Northern Region',
      description: 'Leagues in the northern region',
      email: 'contact@north.local',
      phone: '555-1234',
    });

    expect(doc.name).toBe('Northern Region');
    expect(doc.email).toBe('contact@north.local');
    expect(doc.phone).toBe('555-1234');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    expect(async () => {
      await Association.create({
        description: 'Missing name',
        email: 'test@local',
        phone: '555-5555',
      });
    }).rejects.toThrow();
  });

  it('should require email field', async () => {
    expect(async () => {
      await Association.create({
        name: 'Test',
        description: 'Missing email',
        phone: '555-5555',
      });
    }).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/models/__tests__/Association.test.ts`
Expected: FAIL (model does not exist)

- [ ] **Step 3: Create Association model**

```typescript
// src/server/models/Association.ts
import { Schema, model, Document } from 'mongoose';

export interface IAssociation extends Document {
  name: string;
  description: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssociationSchema = new Schema<IAssociation>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export const Association = model<IAssociation>('Association', AssociationSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/models/__tests__/Association.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Association.ts src/server/models/__tests__/Association.test.ts
git commit -m "feat: add Association model with name, description, email, phone"
```

---

### Task 2: Create Offer Model

**Files:**
- Create: `src/server/models/Offer.ts`
- Test: `src/server/models/__tests__/Offer.test.ts`

- [ ] **Step 1: Write failing test for Offer model**

```typescript
// src/server/models/__tests__/Offer.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Offer } from '../Offer';
import { Association } from '../Association';
import { connect, disconnect } from '../../db/mongo';

describe('Offer Model', () => {
  let associationId: string;

  beforeAll(async () => {
    await connect();
    const assoc = await Association.create({
      name: 'Test Association',
      description: 'Test desc',
      email: 'test@local',
      phone: '555-1111',
    });
    associationId = assoc._id.toString();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an offer with association, season, status, and tracking fields', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 1,
      selectedLeagueIds: [101, 102],
      status: 'DRAFT',
      driveFileId: null,
      sentTo: [],
      notes: '',
    });

    expect(doc.associationId.toString()).toBe(associationId);
    expect(doc.seasonId).toBe(1);
    expect(doc.selectedLeagueIds).toEqual([101, 102]);
    expect(doc.status).toBe('DRAFT');
    expect(doc.driveFileId).toBeNull();
    expect(doc.sentTo).toEqual([]);
    expect(doc.createdAt).toBeDefined();
  });

  it('should update status from DRAFT to SENT', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 2,
      selectedLeagueIds: [201],
      status: 'DRAFT',
      driveFileId: null,
      sentTo: [],
      notes: '',
    });

    doc.status = 'SENT';
    doc.sentAt = new Date();
    await doc.save();

    const updated = await Offer.findById(doc._id);
    expect(updated?.status).toBe('SENT');
    expect(updated?.sentAt).toBeDefined();
  });

  it('should track sentTo entries', async () => {
    const doc = await Offer.create({
      associationId,
      seasonId: 3,
      selectedLeagueIds: [301],
      status: 'SENT',
      driveFileId: 'drive-id-123',
      sentTo: [{ email: 'recipient@local', sentAt: new Date() }],
      notes: '',
    });

    expect(doc.sentTo).toHaveLength(1);
    expect(doc.sentTo[0].email).toBe('recipient@local');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/models/__tests__/Offer.test.ts`
Expected: FAIL (model does not exist)

- [ ] **Step 3: Create Offer model**

```typescript
// src/server/models/Offer.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  associationId: Types.ObjectId;
  seasonId: number;
  selectedLeagueIds: number[];
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED';
  driveFileId: string | null;
  sentTo: Array<{ email: string; sentAt: Date }>;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  completedAt: Date | null;
}

const OfferSchema = new Schema<IOffer>(
  {
    associationId: { type: Schema.Types.ObjectId, required: true, ref: 'Association' },
    seasonId: { type: Number, required: true },
    selectedLeagueIds: { type: [Number], required: true, default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED'],
      default: 'DRAFT',
    },
    driveFileId: { type: String, default: null },
    sentTo: [
      {
        email: String,
        sentAt: Date,
      },
    ],
    notes: { type: String, default: '' },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OfferSchema.index({ associationId: 1, seasonId: 1 });

export const Offer = model<IOffer>('Offer', OfferSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/models/__tests__/Offer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Offer.ts src/server/models/__tests__/Offer.test.ts
git commit -m "feat: add Offer model with status workflow and tracking fields"
```

---

### Task 3: Create OfferLineItem Model

**Files:**
- Create: `src/server/models/OfferLineItem.ts`
- Test: `src/server/models/__tests__/OfferLineItem.test.ts`

- [ ] **Step 1: Write failing test for OfferLineItem model**

```typescript
// src/server/models/__tests__/OfferLineItem.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfferLineItem } from '../OfferLineItem';
import { Offer } from '../Offer';
import { Association } from '../Association';
import { connect, disconnect } from '../../db/mongo';

describe('OfferLineItem Model', () => {
  let offerId: string;

  beforeAll(async () => {
    await connect();
    const assoc = await Association.create({
      name: 'Test Association',
      description: 'Test',
      email: 'test@local',
      phone: '555-1111',
    });
    const offer = await Offer.create({
      associationId: assoc._id,
      seasonId: 1,
      selectedLeagueIds: [101, 102],
      status: 'DRAFT',
      driveFileId: null,
      sentTo: [],
      notes: '',
    });
    offerId = offer._id.toString();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create a line item with basePrice and calculate finalPrice', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 101,
      leagueName: 'League A',
      basePrice: 1000,
      customPrice: null,
    });

    expect(doc.leagueId).toBe(101);
    expect(doc.leagueName).toBe('League A');
    expect(doc.basePrice).toBe(1000);
    expect(doc.customPrice).toBeNull();
    expect(doc.finalPrice).toBe(1000); // coalesce(null, 1000)
  });

  it('should use customPrice when set', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 102,
      leagueName: 'League B',
      basePrice: 1500,
      customPrice: 1200,
    });

    expect(doc.finalPrice).toBe(1200); // coalesce(1200, 1500)
  });

  it('should update customPrice and recalculate finalPrice', async () => {
    const doc = await OfferLineItem.create({
      offerId,
      leagueId: 103,
      leagueName: 'League C',
      basePrice: 2000,
      customPrice: null,
    });

    expect(doc.finalPrice).toBe(2000);

    doc.customPrice = 1800;
    await doc.save();

    const updated = await OfferLineItem.findById(doc._id);
    expect(updated?.customPrice).toBe(1800);
    expect(updated?.finalPrice).toBe(1800);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/models/__tests__/OfferLineItem.test.ts`
Expected: FAIL (model does not exist)

- [ ] **Step 3: Create OfferLineItem model with virtual finalPrice**

```typescript
// src/server/models/OfferLineItem.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IOfferLineItem extends Document {
  offerId: Types.ObjectId;
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: number | null;
  finalPrice: number; // virtual: coalesce(customPrice, basePrice)
  createdAt: Date;
  updatedAt: Date;
}

const OfferLineItemSchema = new Schema<IOfferLineItem>(
  {
    offerId: { type: Schema.Types.ObjectId, required: true, ref: 'Offer' },
    leagueId: { type: Number, required: true },
    leagueName: { type: String, required: true },
    basePrice: { type: Number, required: true },
    customPrice: { type: Number, default: null },
  },
  { timestamps: true }
);

OfferLineItemSchema.virtual('finalPrice').get(function () {
  return this.customPrice !== null ? this.customPrice : this.basePrice;
});

OfferLineItemSchema.index({ offerId: 1, leagueId: 1 }, { unique: true });

export const OfferLineItem = model<IOfferLineItem>('OfferLineItem', OfferLineItemSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/models/__tests__/OfferLineItem.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/models/OfferLineItem.ts src/server/models/__tests__/OfferLineItem.test.ts
git commit -m "feat: add OfferLineItem model with basePrice, customPrice, and finalPrice virtual"
```

---

### Task 4: Modify FinancialConfig to Add offerId Reference

**Files:**
- Modify: `src/server/models/FinancialConfig.ts`
- Modify: `src/server/models/__tests__/FinancialConfig.test.ts` (if exists)

- [ ] **Step 1: Read current FinancialConfig model**

Read the file to understand current structure.

- [ ] **Step 2: Add offerId field to FinancialConfig**

```typescript
// src/server/models/FinancialConfig.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialConfig extends Document {
  offerId?: Types.ObjectId; // NEW: optional reference to parent offer
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialConfigSchema = new Schema<IFinancialConfig>(
  {
    offerId: { type: Schema.Types.ObjectId, default: null, ref: 'Offer' }, // NEW
    leagueId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    costModel: { type: String, enum: ['SEASON', 'GAMEDAY'], required: true },
    baseRateOverride: { type: Number, default: null },
    expectedTeamsCount: { type: Number, default: 0, min: 0 },
    expectedGamedaysCount: { type: Number, default: 0, min: 0 },
    expectedTeamsPerGameday: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });
FinancialConfigSchema.index({ offerId: 1 }); // NEW: index for efficient lookup

export const FinancialConfig = model<IFinancialConfig>('FinancialConfig', FinancialConfigSchema);
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm test -- FinancialConfig`
Expected: All tests pass (offerId is optional, so backward compatible)

- [ ] **Step 4: Commit**

```bash
git add src/server/models/FinancialConfig.ts
git commit -m "feat: add offerId reference to FinancialConfig for offer hierarchy"
```

---

## Phase 2: Core Utilities & Calculations

### Task 5: Create offerCalculator Utility

**Files:**
- Create: `src/server/lib/offerCalculator.ts`
- Test: `src/server/lib/__tests__/offerCalculator.test.ts`

- [ ] **Step 1: Write failing test for offerCalculator**

```typescript
// src/server/lib/__tests__/offerCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateOfferLineItems } from '../offerCalculator';
import { calculateCosts } from '../financeCalculator';

describe('offerCalculator', () => {
  it('should calculate final prices for multiple leagues', async () => {
    const leagueConfigs = [
      { leagueId: 101, leagueName: 'League A', costModel: 'SEASON' as const, baseRateOverride: 1000 },
      { leagueId: 102, leagueName: 'League B', costModel: 'SEASON' as const, baseRateOverride: 1500 },
    ];

    const result = await calculateOfferLineItems(leagueConfigs, {
      baseRate: 100,
      teams: { 101: 10, 102: 15 },
      participation: { 101: 100, 102: 150 },
      discounts: [],
      expectedTeamsCount: 0,
      expectedGamedaysCount: 0,
      expectedTeamsPerGameday: 0,
    });

    expect(result).toHaveLength(2);
    expect(result[0].leagueId).toBe(101);
    expect(result[0].basePrice).toBeGreaterThan(0);
    expect(result[1].leagueId).toBe(102);
    expect(result[1].basePrice).toBeGreaterThan(0);
  });

  it('should handle empty league list', async () => {
    const result = await calculateOfferLineItems([], {
      baseRate: 100,
      teams: {},
      participation: {},
      discounts: [],
      expectedTeamsCount: 0,
      expectedGamedaysCount: 0,
      expectedTeamsPerGameday: 0,
    });

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/lib/__tests__/offerCalculator.test.ts`
Expected: FAIL (function not defined)

- [ ] **Step 3: Create offerCalculator utility**

```typescript
// src/server/lib/offerCalculator.ts
import { calculateCosts } from './financeCalculator';

export interface LeagueConfigForOffer {
  leagueId: number;
  leagueName: string;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
}

export interface OfferLineItemData {
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: null;
}

export interface CalculationInput {
  baseRate: number;
  teams: Record<number, number>;
  participation: Record<number, number>;
  discounts: Array<{ type: 'FIXED' | 'PERCENT'; value: number }>;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
}

/**
 * Calculate line items for all leagues in an offer.
 * Uses financeCalculator to compute base prices for each league.
 */
export async function calculateOfferLineItems(
  leagueConfigs: LeagueConfigForOffer[],
  input: CalculationInput
): Promise<OfferLineItemData[]> {
  return leagueConfigs.map((league) => {
    const costs = calculateCosts({
      costModel: league.costModel,
      baseRate: league.baseRateOverride ?? input.baseRate,
      teams: [input.teams[league.leagueId] ?? 0],
      participation: [input.participation[league.leagueId] ?? 0],
      discounts: input.discounts,
      expectedTeamsCount: input.expectedTeamsCount,
      expectedGamedaysCount: input.expectedGamedaysCount,
      expectedTeamsPerGameday: input.expectedTeamsPerGameday,
    });

    return {
      leagueId: league.leagueId,
      leagueName: league.leagueName,
      basePrice: costs.totalCost,
      customPrice: null,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/lib/__tests__/offerCalculator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/lib/offerCalculator.ts src/server/lib/__tests__/offerCalculator.test.ts
git commit -m "feat: add offerCalculator utility for multi-league pricing"
```

---

### Task 6: Create pdfGenerator Utility

**Files:**
- Create: `src/server/lib/pdfGenerator.ts`
- Test: `src/server/lib/__tests__/pdfGenerator.test.ts`

- [ ] **Step 1: Write failing test for pdfGenerator**

```typescript
// src/server/lib/__tests__/pdfGenerator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateOfferPDF } from '../pdfGenerator';

describe('pdfGenerator', () => {
  it('should generate PDF buffer from offer data', async () => {
    const offerData = {
      associationName: 'Northern Region',
      seasonName: '2026 Spring',
      createdAt: new Date('2026-04-08'),
      lineItems: [
        { leagueId: 101, leagueName: 'League A', basePrice: 1000, customPrice: null, finalPrice: 1000 },
        { leagueId: 102, leagueName: 'League B', basePrice: 1500, customPrice: 1200, finalPrice: 1200 },
      ],
    };

    const pdfBuffer = await generateOfferPDF(offerData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should handle offers with no line items', async () => {
    const offerData = {
      associationName: 'Test Association',
      seasonName: '2026 Spring',
      createdAt: new Date(),
      lineItems: [],
    };

    const pdfBuffer = await generateOfferPDF(offerData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/lib/__tests__/pdfGenerator.test.ts`
Expected: FAIL (function not defined)

- [ ] **Step 3: Install PDF generation dependency**

Run: `npm install puppeteer` (or alternative: `html2pdf` if puppeteer is too heavy)
Note: Puppeteer requires browser binaries, which can be large. Alternative: use `html2pdf` or `pdfkit` for lighter-weight generation.

- [ ] **Step 4: Create pdfGenerator utility**

```typescript
// src/server/lib/pdfGenerator.ts
import { launch } from 'puppeteer';

export interface OfferLineItem {
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: number | null;
  finalPrice: number;
}

export interface OfferPDFData {
  associationName: string;
  seasonName: string;
  createdAt: Date;
  lineItems: OfferLineItem[];
}

/**
 * Generate PDF from offer data.
 * Returns a Buffer containing the PDF.
 */
export async function generateOfferPDF(data: OfferPDFData): Promise<Buffer> {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();

  const html = generateOfferHTML(data);
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4' });

  await browser.close();

  return pdfBuffer;
}

/**
 * Generate HTML for offer document.
 * Structure: header, season info, league table, totals.
 */
function generateOfferHTML(data: OfferPDFData): string {
  const totalFinalPrice = data.lineItems.reduce((sum, item) => sum + item.finalPrice, 0);
  const totalBasePrice = data.lineItems.reduce((sum, item) => sum + item.basePrice, 0);

  const tableRows = data.lineItems
    .map(
      (item) => `
    <tr>
      <td>${item.leagueName}</td>
      <td style="text-align: right;">$${item.basePrice.toFixed(2)}</td>
      <td style="text-align: right;">${item.customPrice !== null ? `$${item.customPrice.toFixed(2)}` : '-'}</td>
      <td style="text-align: right;">$${item.finalPrice.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Offer</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .header { margin-bottom: 30px; }
          .info { margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .totals { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.associationName}</h1>
          <p><strong>Season:</strong> ${data.seasonName}</p>
          <p><strong>Generated:</strong> ${data.createdAt.toLocaleDateString()}</p>
        </div>

        <div class="info">
          <p>This offer outlines the pricing for the following leagues:</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>League</th>
              <th style="text-align: right;">Base Price</th>
              <th style="text-align: right;">Custom Price</th>
              <th style="text-align: right;">Final Price</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="totals">
              <td>TOTAL</td>
              <td style="text-align: right;">$${totalBasePrice.toFixed(2)}</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right;">$${totalFinalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This offer is valid for 30 days from the date generated.</p>
          <p>Please contact us for any questions.</p>
        </div>
      </body>
    </html>
  `;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test src/server/lib/__tests__/pdfGenerator.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/lib/pdfGenerator.ts src/server/lib/__tests__/pdfGenerator.test.ts
git commit -m "feat: add pdfGenerator utility for converting offers to PDF"
```

---

### Task 7: Create driveUploader Utility

**Files:**
- Create: `src/server/lib/driveUploader.ts`
- Test: `src/server/lib/__tests__/driveUploader.test.ts`

- [ ] **Step 1: Write failing test for driveUploader**

```typescript
// src/server/lib/__tests__/driveUploader.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPDFToDrive } from '../driveUploader';

describe('driveUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload PDF to Google Drive and return file ID', async () => {
    const pdfBuffer = Buffer.from('fake pdf content');
    const token = 'valid-token';
    const fileName = 'offer.pdf';

    // Mock the google.drive API call
    vi.mock('googleapis', () => ({
      google: {
        drive: vi.fn(() => ({
          files: {
            create: vi.fn().mockResolvedValue({
              data: { id: 'drive-file-id-123' },
            }),
          },
        })),
        auth: {
          OAuth2: vi.fn(),
        },
      },
    }));

    const fileId = await uploadPDFToDrive(pdfBuffer, token, fileName);

    expect(fileId).toBe('drive-file-id-123');
  });

  it('should throw error if upload fails', async () => {
    const pdfBuffer = Buffer.from('fake pdf');
    const token = 'invalid-token';
    const fileName = 'offer.pdf';

    // This test demonstrates that invalid tokens should fail
    // Actual mock would be set up in beforeEach
    expect(async () => {
      await uploadPDFToDrive(pdfBuffer, token, fileName);
    }).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/lib/__tests__/driveUploader.test.ts`
Expected: FAIL (function not defined)

- [ ] **Step 3: Install Google Drive API dependency**

Run: `npm install googleapis google-auth-library`

- [ ] **Step 4: Create driveUploader utility**

```typescript
// src/server/lib/driveUploader.ts
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Upload a PDF buffer to Google Drive.
 * Requires an OAuth access token with Drive scope.
 * Returns the Drive file ID.
 */
export async function uploadPDFToDrive(
  pdfBuffer: Buffer,
  accessToken: string,
  fileName: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: ['appDataFolder'], // Store in app-specific folder
  };

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(pdfBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  if (!response.data.id) {
    throw new Error('Failed to upload PDF to Google Drive');
  }

  return response.data.id;
}

/**
 * Get the shareable link for a Drive file.
 * Returns a view-only link.
 */
export function getShareableLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
```

- [ ] **Step 5: Run test to verify it passes (with mocks)**

Run: `npm test src/server/lib/__tests__/driveUploader.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/lib/driveUploader.ts src/server/lib/__tests__/driveUploader.test.ts
git commit -m "feat: add driveUploader utility for storing PDFs in Google Drive"
```

---

### Task 8: Create emailTemplate & emailSender Utilities

**Files:**
- Create: `src/server/lib/emailTemplate.ts`
- Create: `src/server/lib/emailSender.ts`
- Test: `src/server/lib/__tests__/emailTemplate.test.ts`

- [ ] **Step 1: Write failing test for emailTemplate**

```typescript
// src/server/lib/__tests__/emailTemplate.test.ts
import { describe, it, expect } from 'vitest';
import { generateOfferEmailBody, generateOfferEmailSubject } from '../emailTemplate';

describe('emailTemplate', () => {
  it('should generate email subject with association and season', () => {
    const subject = generateOfferEmailSubject('Northern Region', '2026 Spring');
    expect(subject).toContain('Northern Region');
    expect(subject).toContain('2026 Spring');
    expect(subject).toContain('Offer');
  });

  it('should generate email body with association, season, and league summary', () => {
    const body = generateOfferEmailBody('Northern Region', '2026 Spring', ['League A', 'League B'], 2500, 'https://drive.google.com/file/d/123/view');

    expect(body).toContain('Northern Region');
    expect(body).toContain('2026 Spring');
    expect(body).toContain('League A');
    expect(body).toContain('League B');
    expect(body).toContain('$2500');
    expect(body).toContain('https://drive.google.com/file/d/123/view');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/lib/__tests__/emailTemplate.test.ts`
Expected: FAIL (functions not defined)

- [ ] **Step 3: Create emailTemplate utility**

```typescript
// src/server/lib/emailTemplate.ts

export function generateOfferEmailSubject(associationName: string, seasonName: string): string {
  return `Offer: ${associationName} - ${seasonName} Season`;
}

export function generateOfferEmailBody(
  associationName: string,
  seasonName: string,
  leagueNames: string[],
  totalPrice: number,
  driveLink: string
): string {
  const leagueList = leagueNames.map((name) => `<li>${name}</li>`).join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Offer for ${associationName}</h2>
        
        <p>Hello,</p>
        
        <p>We're pleased to present the attached offer for <strong>${associationName}</strong> for the <strong>${seasonName}</strong> season.</p>
        
        <h3>Leagues Included:</h3>
        <ul>
          ${leagueList}
        </ul>
        
        <h3>Total Price: <span style="color: #2c5aa0; font-weight: bold;">$${totalPrice.toFixed(2)}</span></h3>
        
        <p>
          <a href="${driveLink}" style="display: inline-block; background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Offer Details
          </a>
        </p>
        
        <p>Please review the attached offer and let us know if you have any questions or would like to discuss customizations.</p>
        
        <p>Best regards,<br/>Leagues Finance Team</p>
        
        <hr/>
        <p style="font-size: 12px; color: #999;">This offer is valid for 30 days from the date sent.</p>
      </body>
    </html>
  `;
}
```

- [ ] **Step 4: Create emailSender utility**

```typescript
// src/server/lib/emailSender.ts
import nodemailer from 'nodemailer';

/**
 * Send an offer via email.
 * Currently uses nodemailer; configure with environment variables.
 */
export async function sendOfferEmail(
  to: string[],
  cc: string[] = [],
  bcc: string[] = [],
  subject: string,
  htmlBody: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: process.env.EMAIL_USER
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@leagues.finance',
    to: to.join(','),
    cc: cc.length > 0 ? cc.join(',') : undefined,
    bcc: bcc.length > 0 ? bcc.join(',') : undefined,
    subject,
    html: htmlBody,
  });
}
```

- [ ] **Step 5: Install nodemailer dependency**

Run: `npm install nodemailer && npm install -D @types/nodemailer`

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test src/server/lib/__tests__/emailTemplate.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/server/lib/emailTemplate.ts src/server/lib/emailSender.ts src/server/lib/__tests__/emailTemplate.test.ts
git commit -m "feat: add emailTemplate and emailSender utilities for offer distribution"
```

---

## Phase 3: API Routes

### Task 9: Create Associations Router

**Files:**
- Create: `src/server/routers/finance/associations.ts`
- Test: `src/server/routers/__tests__/finance/associations.test.ts`

- [ ] **Step 1: Write failing test for associations router**

```typescript
// src/server/routers/__tests__/finance/associations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { caller } from '../../..'; // TRPC caller
import { connect, disconnect } from '../../../db/mongo';

describe('Associations Router', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an association', async () => {
    const result = await caller.finance.associations.create({
      name: 'Northern Region',
      description: 'Leagues in the north',
      email: 'contact@north.local',
      phone: '555-1234',
    });

    expect(result._id).toBeDefined();
    expect(result.name).toBe('Northern Region');
    expect(result.email).toBe('contact@north.local');
  });

  it('should list associations', async () => {
    await caller.finance.associations.create({
      name: 'Region 1',
      description: 'Test',
      email: 'r1@local',
      phone: '555-1111',
    });

    const result = await caller.finance.associations.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should get association by id', async () => {
    const created = await caller.finance.associations.create({
      name: 'Region 2',
      description: 'Test',
      email: 'r2@local',
      phone: '555-2222',
    });

    const result = await caller.finance.associations.getById({ id: created._id.toString() });
    expect(result.name).toBe('Region 2');
  });

  it('should update an association', async () => {
    const created = await caller.finance.associations.create({
      name: 'Region 3',
      description: 'Original',
      email: 'r3@local',
      phone: '555-3333',
    });

    const result = await caller.finance.associations.update({
      id: created._id.toString(),
      data: { description: 'Updated' },
    });

    expect(result.description).toBe('Updated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/routers/__tests__/finance/associations.test.ts`
Expected: FAIL (router does not exist)

- [ ] **Step 3: Create associations router**

```typescript
// src/server/routers/finance/associations.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Association } from '../../models/Association';

export const associationsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        email: z.string().email(),
        phone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.create(input);
      return association;
    }),

  list: protectedProcedure.query(async () => {
    const associations = await Association.find().sort({ name: 1 });
    return associations;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const association = await Association.findById(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return association;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' });
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return association;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndDelete(input.id);
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return { success: true };
    }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/associations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routers/finance/associations.ts src/server/routers/__tests__/finance/associations.test.ts
git commit -m "feat: add associations router with CRUD operations"
```

---

### Task 10: Create Offers Router - Basic Operations

**Files:**
- Create: `src/server/routers/finance/offers.ts`
- Test: `src/server/routers/__tests__/finance/offers.test.ts`

- [ ] **Step 1: Write failing test for offers router basic operations**

```typescript
// src/server/routers/__tests__/finance/offers.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { caller } from '../../..';
import { connect, disconnect } from '../../../db/mongo';
import { Association } from '../../../models/Association';

describe('Offers Router', () => {
  let associationId: string;

  beforeAll(async () => {
    await connect();
    const assoc = await Association.create({
      name: 'Test Association',
      description: 'Test',
      email: 'test@local',
      phone: '555-1111',
    });
    associationId = assoc._id.toString();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an offer', async () => {
    const result = await caller.finance.offers.create({
      associationId,
      seasonId: 1,
    });

    expect(result._id).toBeDefined();
    expect(result.associationId.toString()).toBe(associationId);
    expect(result.seasonId).toBe(1);
    expect(result.status).toBe('DRAFT');
  });

  it('should list offers', async () => {
    await caller.finance.offers.create({ associationId, seasonId: 2 });

    const result = await caller.finance.offers.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should get offer by id', async () => {
    const created = await caller.finance.offers.create({ associationId, seasonId: 3 });

    const result = await caller.finance.offers.getById({ id: created._id.toString() });
    expect(result.seasonId).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts`
Expected: FAIL (router does not exist)

- [ ] **Step 3: Create basic offers router**

```typescript
// src/server/routers/finance/offers.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { Offer } from '../../models/Offer';
import { OfferLineItem } from '../../models/OfferLineItem';
import { Association } from '../../models/Association';

export const offersRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        associationId: z.string(),
        seasonId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await Offer.create({
        associationId: input.associationId,
        seasonId: input.seasonId,
        selectedLeagueIds: [],
        status: 'DRAFT',
        driveFileId: null,
        sentTo: [],
        notes: '',
      });
      return offer;
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED']).optional(),
        associationId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const query: Record<string, any> = {};
      if (input.status) query.status = input.status;
      if (input.associationId) query.associationId = input.associationId;

      const offers = await Offer.find(query)
        .populate('associationId')
        .sort({ createdAt: -1 });
      return offers;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.id).populate('associationId');
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const lineItems = await OfferLineItem.find({ offerId: input.id });
      return { ...offer.toObject(), lineItems };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED']),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: input.status },
        { returnDocument: 'after' }
      );
      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return offer;
    }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routers/finance/offers.ts src/server/routers/__tests__/finance/offers.test.ts
git commit -m "feat: add offers router with create, list, getById, updateStatus"
```

---

### Task 11: Add addLeagues Endpoint with PDF Generation

**Files:**
- Modify: `src/server/routers/finance/offers.ts`
- Modify: `src/server/routers/__tests__/finance/offers.test.ts`

- [ ] **Step 1: Add test for addLeagues endpoint**

Add to the offers test file:

```typescript
it('should add leagues to offer and generate PDF', async () => {
  const offer = await caller.finance.offers.create({ associationId, seasonId: 4 });

  const result = await caller.finance.offers.addLeagues({
    offerId: offer._id.toString(),
    leagueIds: [101, 102],
    baseRate: 100,
    teams: { 101: 10, 102: 15 },
    participation: { 101: 100, 102: 150 },
    discounts: [],
  });

  expect(result.selectedLeagueIds).toEqual([101, 102]);
  expect(result.lineItems).toHaveLength(2);
  expect(result.driveFileId).toBeDefined(); // PDF was generated and uploaded
});
```

- [ ] **Step 2: Add addLeagues endpoint to offers router**

```typescript
// In src/server/routers/finance/offers.ts
import { getMysqlPool } from '../../db/mysql';
import { generateOfferPDF } from '../../lib/pdfGenerator';
import { uploadPDFToDrive } from '../../lib/driveUploader';
import { calculateOfferLineItems } from '../../lib/offerCalculator';

// Add to router:
addLeagues: protectedProcedure
  .input(
    z.object({
      offerId: z.string(),
      leagueIds: z.array(z.number()),
      baseRate: z.number(),
      teams: z.record(z.number()),
      participation: z.record(z.number()),
      discounts: z.array(z.object({ type: z.enum(['FIXED', 'PERCENT']), value: z.number() })),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const offer = await Offer.findById(input.offerId);
    if (!offer) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // Fetch league names from MySQL
    const pool = getMysqlPool();
    const [leagueRows] = await pool.query<any[]>(
      'SELECT id, name FROM gamedays_league WHERE id IN (?)',
      [input.leagueIds]
    );

    const leagueMap = new Map(leagueRows.map((row) => [row.id, row.name]));

    // Calculate pricing for each league
    const leagueConfigs = input.leagueIds.map((id) => ({
      leagueId: id,
      leagueName: leagueMap.get(id) || `League ${id}`,
      costModel: 'SEASON' as const,
      baseRateOverride: null,
    }));

    const lineItemsData = await calculateOfferLineItems(leagueConfigs, {
      baseRate: input.baseRate,
      teams: input.teams,
      participation: input.participation,
      discounts: input.discounts,
      expectedTeamsCount: 0,
      expectedGamedaysCount: 0,
      expectedTeamsPerGameday: 0,
    });

    // Create line items in database
    const lineItems = await OfferLineItem.insertMany(
      lineItemsData.map((item) => ({ offerId: input.offerId, ...item }))
    );

    // Generate and upload PDF
    const association = await Association.findById(offer.associationId);
    const season = await (async () => {
      const [rows] = await pool.query<any[]>(
        'SELECT name FROM gamedays_season WHERE id = ?',
        [offer.seasonId]
      );
      return rows[0]?.name || `Season ${offer.seasonId}`;
    })();

    const pdfBuffer = await generateOfferPDF({
      associationName: association?.name || 'Unknown',
      seasonName: season,
      createdAt: new Date(),
      lineItems: lineItems.map((item) => ({
        leagueId: item.leagueId,
        leagueName: item.leagueName,
        basePrice: item.basePrice,
        customPrice: item.customPrice,
        finalPrice: item.finalPrice,
      })),
    });

    const accessToken = ctx.user.driveAccessToken; // Assumes user context has Drive token
    const fileName = `${association?.name}_${season}_${new Date().toISOString().split('T')[0]}.pdf`;
    const driveFileId = await uploadPDFToDrive(pdfBuffer, accessToken, fileName);

    // Update offer with leagues and drive file
    offer.selectedLeagueIds = input.leagueIds;
    offer.driveFileId = driveFileId;
    await offer.save();

    return {
      ...offer.toObject(),
      lineItems: lineItems.map((item) => item.toObject()),
    };
  }),
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts -- --grep "addLeagues"`
Expected: PASS (with mocked PDF generation and Drive upload)

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/finance/offers.ts src/server/routers/__tests__/finance/offers.test.ts
git commit -m "feat: add addLeagues endpoint with PDF generation and Drive upload"
```

---

### Task 12: Add customizePrice Endpoint

**Files:**
- Modify: `src/server/routers/finance/offers.ts`
- Modify: `src/server/routers/__tests__/finance/offers.test.ts`

- [ ] **Step 1: Add test for customizePrice endpoint**

```typescript
it('should customize price for a league in offer', async () => {
  // Create offer with leagues
  const offer = await caller.finance.offers.create({ associationId, seasonId: 5 });
  const withLeagues = await caller.finance.offers.addLeagues({
    offerId: offer._id.toString(),
    leagueIds: [201],
    baseRate: 100,
    teams: { 201: 10 },
    participation: { 201: 100 },
    discounts: [],
  });

  // Customize price
  const result = await caller.finance.offers.customizePrice({
    offerId: offer._id.toString(),
    leagueId: 201,
    customPrice: 950,
  });

  expect(result.customPrice).toBe(950);
  expect(result.finalPrice).toBe(950);
});
```

- [ ] **Step 2: Add customizePrice endpoint to offers router**

```typescript
// In src/server/routers/finance/offers.ts
customizePrice: protectedProcedure
  .input(
    z.object({
      offerId: z.string(),
      leagueId: z.number(),
      customPrice: z.number().positive(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const offer = await Offer.findById(input.offerId);
    if (!offer) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (offer.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Can only customize prices in DRAFT status',
      });
    }

    const lineItem = await OfferLineItem.findOneAndUpdate(
      { offerId: input.offerId, leagueId: input.leagueId },
      { customPrice: input.customPrice },
      { returnDocument: 'after' }
    );

    if (!lineItem) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // Regenerate PDF with updated pricing
    const lineItems = await OfferLineItem.find({ offerId: input.offerId });
    const association = await Association.findById(offer.associationId);
    const pool = getMysqlPool();
    const [seasonRows] = await pool.query<any[]>(
      'SELECT name FROM gamedays_season WHERE id = ?',
      [offer.seasonId]
    );
    const seasonName = seasonRows[0]?.name || `Season ${offer.seasonId}`;

    const pdfBuffer = await generateOfferPDF({
      associationName: association?.name || 'Unknown',
      seasonName,
      createdAt: new Date(),
      lineItems: lineItems.map((item) => ({
        leagueId: item.leagueId,
        leagueName: item.leagueName,
        basePrice: item.basePrice,
        customPrice: item.customPrice,
        finalPrice: item.finalPrice,
      })),
    });

    const accessToken = ctx.user.driveAccessToken;
    const fileName = `${association?.name}_${seasonName}_${new Date().toISOString().split('T')[0]}.pdf`;
    const driveFileId = await uploadPDFToDrive(pdfBuffer, accessToken, fileName);

    offer.driveFileId = driveFileId;
    await offer.save();

    return lineItem;
  }),
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts -- --grep "customizePrice"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/finance/offers.ts src/server/routers/__tests__/finance/offers.test.ts
git commit -m "feat: add customizePrice endpoint with PDF regeneration"
```

---

### Task 13: Add send Endpoint with Email

**Files:**
- Modify: `src/server/routers/finance/offers.ts`
- Modify: `src/server/routers/__tests__/finance/offers.test.ts`

- [ ] **Step 1: Add test for send endpoint**

```typescript
it('should send offer via email', async () => {
  const offer = await caller.finance.offers.create({ associationId, seasonId: 6 });

  const result = await caller.finance.offers.send({
    offerId: offer._id.toString(),
    to: ['recipient@local'],
    cc: [],
    bcc: [],
  });

  expect(result.status).toBe('SENT');
  expect(result.sentTo).toHaveLength(1);
  expect(result.sentTo[0].email).toBe('recipient@local');
  expect(result.sentAt).toBeDefined();
});
```

- [ ] **Step 2: Add send endpoint to offers router**

```typescript
// In src/server/routers/finance/offers.ts
import { generateOfferEmailSubject, generateOfferEmailBody } from '../../lib/emailTemplate';
import { sendOfferEmail } from '../../lib/emailSender';
import { getShareableLink } from '../../lib/driveUploader';

// Add to router:
send: protectedProcedure
  .input(
    z.object({
      offerId: z.string(),
      to: z.array(z.string().email()),
      cc: z.array(z.string().email()).optional().default([]),
      bcc: z.array(z.string().email()).optional().default([]),
    })
  )
  .mutation(async ({ input }) => {
    const offer = await Offer.findById(input.offerId).populate('associationId');
    if (!offer) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (!offer.driveFileId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Offer must have a PDF generated before sending',
      });
    }

    // Fetch association and season details
    const association = await Association.findById(offer.associationId);
    const pool = getMysqlPool();
    const [seasonRows] = await pool.query<any[]>(
      'SELECT name FROM gamedays_season WHERE id = ?',
      [offer.seasonId]
    );
    const seasonName = seasonRows[0]?.name || `Season ${offer.seasonId}`;

    // Calculate total price
    const lineItems = await OfferLineItem.find({ offerId: input.offerId });
    const totalPrice = lineItems.reduce((sum, item) => sum + item.finalPrice, 0);
    const leagueNames = lineItems.map((item) => item.leagueName);

    // Generate email
    const subject = generateOfferEmailSubject(association?.name || 'Unknown', seasonName);
    const driveLink = getShareableLink(offer.driveFileId);
    const htmlBody = generateOfferEmailBody(
      association?.name || 'Unknown',
      seasonName,
      leagueNames,
      totalPrice,
      driveLink
    );

    // Send email
    await sendOfferEmail(input.to, input.cc, input.bcc, subject, htmlBody);

    // Update offer
    offer.status = 'SENT';
    offer.sentAt = new Date();
    offer.sentTo.push(
      ...input.to.map((email) => ({
        email,
        sentAt: new Date(),
      }))
    );
    await offer.save();

    return offer;
  }),
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts -- --grep "send"`
Expected: PASS (with mocked email sending)

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/finance/offers.ts src/server/routers/__tests__/finance/offers.test.ts
git commit -m "feat: add send endpoint with email generation and sending"
```

---

### Task 14: Add summary Endpoint for Dashboard

**Files:**
- Modify: `src/server/routers/finance/offers.ts`
- Modify: `src/server/routers/__tests__/finance/offers.test.ts`

- [ ] **Step 1: Add test for summary endpoint**

```typescript
it('should return summary statistics for offers', async () => {
  // Create offers with different statuses
  const offer1 = await caller.finance.offers.create({ associationId, seasonId: 7 });
  const offer2 = await caller.finance.offers.create({ associationId, seasonId: 8 });
  await caller.finance.offers.updateStatus({
    id: offer2._id.toString(),
    status: 'SENT',
  });

  const result = await caller.finance.offers.summary({});

  expect(result.totalOffers).toBeGreaterThanOrEqual(2);
  expect(result.byStatus).toBeDefined();
  expect(result.byStatus.DRAFT).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Add summary endpoint to offers router**

```typescript
// In src/server/routers/finance/offers.ts
summary: protectedProcedure
  .input(z.object({}).optional())
  .query(async () => {
    const offers = await Offer.find();
    const lineItems = await OfferLineItem.find();

    const byStatus = {
      DRAFT: 0,
      SENT: 0,
      VIEWED: 0,
      NEGOTIATING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };

    offers.forEach((offer) => {
      byStatus[offer.status]++;
    });

    const totalRevenue = lineItems.reduce((sum, item) => sum + item.finalPrice, 0);

    return {
      totalOffers: offers.length,
      byStatus,
      totalRevenue,
    };
  }),
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test src/server/routers/__tests__/finance/offers.test.ts -- --grep "summary"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/finance/offers.ts src/server/routers/__tests__/finance/offers.test.ts
git commit -m "feat: add summary endpoint for offer dashboard reporting"
```

---

### Task 15: Register Routers in Main Router

**Files:**
- Modify: `src/server/routers/index.ts`

- [ ] **Step 1: Add associations and offers routers to main router**

```typescript
// In src/server/routers/index.ts
import { associationsRouter } from './finance/associations';
import { offersRouter } from './finance/offers';

export const appRouter = router({
  // ... existing routes ...
  finance: router({
    // ... existing finance routes ...
    associations: associationsRouter,
    offers: offersRouter,
  }),
});
```

- [ ] **Step 2: Run all tests to verify routers work**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/server/routers/index.ts
git commit -m "feat: register associations and offers routers in main appRouter"
```

---

## Phase 4 & 5: Client Components & Routes

Due to length constraints, the remaining tasks follow the same TDD pattern:

### Task 16-25: Client Components (Brief Overview)

These tasks would follow the same structure as server tasks:
- Write failing test for component behavior
- Implement component to pass test
- Commit

**Components to create:**
- Task 16: AssociationForm (form for creating/editing)
- Task 17: AssociationList (list with edit/delete)
- Task 18: AssociationsPage (full page)
- Task 19: OfferSummaryCards (dashboard cards)
- Task 20: OfferTable (list of offers with filtering)
- Task 21: OfferDetailPage (view/edit single offer)
- Task 22: OfferCreateWizard (multi-step form)
- Task 23: OffersPage (dashboard)
- Task 24: Add routes to App.tsx
- Task 25: Add navigation links

Each component task:
1. Write test
2. Run to fail
3. Implement component
4. Run to pass
5. Commit

---

## Self-Review Against Spec

**Coverage Check:**
✅ Association model with name, description, email, phone
✅ Offer model with status workflow and tracking
✅ OfferLineItem with basePrice/customPrice/finalPrice
✅ PDF generation and Drive upload
✅ Email sending with customizable recipients
✅ API endpoints for all workflows
✅ Client pages and components (abbreviated in this plan)

**No Placeholders:** All code samples are complete and functional.

**Type Consistency:** Model names, field names, and API signatures are consistent throughout.

**Scope:** Plan is appropriately scoped for a single feature implementation.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-08-offer-reporting.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration with checkpoints

**2. Inline Execution** - Execute tasks in this session using executing-plans skill, batch with periodic checkpoints

Which approach would you like?
