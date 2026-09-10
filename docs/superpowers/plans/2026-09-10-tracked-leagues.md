# Tracked Leagues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the manually-maintained "Tracker Kontakte Ligen" sheet into leagues.finance: associations gain multiple contacts, and a new `TrackedLeague` model tracks per-league sales-pipeline leads before a real leaguesphere league or `Offer` exists, deriving status from the linked `Offer`/`Invoice` once one is created.

**Architecture:** `Contact` gains a nullable `associationId`. A new `TrackedLeague` Mongo collection holds pre-contract leads (name, year, contact, comment, manual status) with an optional `leaguesphereLeagueId` (set via a computed-on-read "crosscheck" against the MySQL leaguesphere source) and an optional `linkedOfferId`. Once linked, effective status is derived live from the linked `Offer`/`Invoice`, never duplicated. A new Association detail page surfaces both. A one-time migration imports the sheet's existing rows.

**Tech Stack:** TypeScript, Express, tRPC, Mongoose (MongoDB), MySQL (`mysql2`, read-only), React, Vitest, `mongodb-memory-server`.

**Spec:** `docs/superpowers/specs/2026-09-10-tracked-leagues-design.md`

## Global Constraints

- `Offer.status` gains a `'rejected'` value everywhere it's typed (Zod schemas, Mongoose model, client TS unions) — a sent offer can be declined and today there's no way to represent that.
- Crosscheck and effective-status computation are **computed on read, never persisted** — same pattern as `computeConfigPrices()` in `src/server/lib/configPricing.ts`.
- No cron job or background worker — crosscheck runs when the UI requests it.
- `Contact.associationId` and `TrackedLeague.contactId` are **not** constrained to match each other — a contact can be assigned to any tracked league or offer regardless of its "home" association (needed for shared reps across association federations).
- Follow existing test conventions exactly: Vitest, `router.createCaller({ user: { userId, email, role } })` for router tests, `connectMongo()`/`disconnectMongo()` from `src/server/db/mongo.ts` + `afterEach` cleanup for Mongo-backed router tests, `vi.mock('../../../db/mysql')` for MySQL-backed router tests.
- Migrations are plain `.js` files in `src/server/db/migrations/`, numbered sequentially, exporting `{ up, down }`, using the raw Mongo driver (`mongoose.connection.db.collection(...)`) — see `002-update-associations-and-contacts.js`. This repo has no dedicated test file for pages (`src/client/pages/`) — only components, hooks, and lib functions are unit-tested; keep page components thin and put logic in tested components.

---

### Task 1: `Offer.status` gains `'rejected'` (server) + `markRejected` mutation

**Files:**
- Modify: `shared/schemas/offer.ts:12` and `:34`
- Modify: `src/server/models/Offer.ts:4` and `:30`
- Modify: `src/server/routers/finance/offers.ts` (add `markRejected` after `markAccepted`, ~line 318)
- Test: `src/server/routers/finance/__tests__/offers.test.ts` (new file)

**Interfaces:**
- Produces: `offersRouter.markRejected` — `protectedProcedure` mutation, input `{ id: string }`, sets `Offer.status = 'rejected'`, returns the normalized offer (same shape as `markAccepted`/`markSent`).

- [ ] **Step 1: Write the failing test**

Create `src/server/routers/finance/__tests__/offers.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { offersRouter } from '../offers';
import { Offer } from '../../../models/Offer';
import { Contact } from '../../../models/Contact';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

describe('offersRouter.markRejected', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([Offer.deleteMany({}), Contact.deleteMany({})]);
  });

  it('sets status to rejected', async () => {
    const contact = await Contact.create({
      name: 'Michael Hanke',
      email: 'michael@afvh.de',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
    });
    const offer = await Offer.create({
      associationId: 'assoc-1',
      seasonId: 2026,
      leagueIds: [16],
      contactId: contact._id,
      status: 'sent',
    });

    const caller = offersRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.markRejected({ id: offer._id.toString() });

    expect(result.status).toBe('rejected');
    const fromDb = await Offer.findById(offer._id);
    expect(fromDb?.status).toBe('rejected');
  });

  it('throws NOT_FOUND for a missing offer', async () => {
    const caller = offersRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    await expect(
      caller.markRejected({ id: '507f1f77bcf86cd799439011' })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/routers/finance/__tests__/offers.test.ts`
Expected: FAIL — `caller.markRejected is not a function`, and the `status: 'rejected'` on `Offer.create` fails Mongoose enum validation.

- [ ] **Step 3: Widen the status enum in the shared schema**

In `shared/schemas/offer.ts`, change both occurrences:

```ts
  status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']).optional(),
```

and

```ts
  status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']),
```

- [ ] **Step 4: Widen the status enum in the Mongoose model**

In `src/server/models/Offer.ts`, change:

```ts
  status: 'draft' | 'sending' | 'sent' | 'accepted';
```
to
```ts
  status: 'draft' | 'sending' | 'sent' | 'accepted' | 'rejected';
```

and:

```ts
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'accepted'],
      default: 'draft',
    },
```
to
```ts
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'accepted', 'rejected'],
      default: 'draft',
    },
```

- [ ] **Step 5: Add the `markRejected` mutation**

In `src/server/routers/finance/offers.ts`, immediately after the `markAccepted` mutation (after its closing `}),` around line 318):

```ts
  markRejected: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: 'rejected' },
        { returnDocument: 'after' }
      ).lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeOffer(offer);
    }),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/server/routers/finance/__tests__/offers.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Also widen the `list` filter enum for consistency**

In `src/server/routers/finance/offers.ts`, the `list` procedure's input has its own enum (line ~48). Change:

```ts
        status: z.enum(['draft', 'sent', 'accepted']).optional(),
```
to
```ts
        status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']).optional(),
```

(This also fixes a pre-existing gap where `'sending'` was missing from the filter enum.)

- [ ] **Step 8: Run the full server test suite and typecheck**

Run: `npm run test -- src/server/routers/finance/__tests__/offers.test.ts && npm run typecheck:server`
Expected: PASS, no type errors

- [ ] **Step 9: Commit**

```bash
git add shared/schemas/offer.ts src/server/models/Offer.ts src/server/routers/finance/offers.ts src/server/routers/finance/__tests__/offers.test.ts
git commit -m "feat: add rejected status to Offer"
```

---

### Task 2: `Offer.status` gains `'rejected'` (client badges + button)

**Files:**
- Modify: `src/client/components/OfferCard.tsx:12`
- Modify: `src/client/components/OfferTable.tsx:15-20`
- Modify: `src/client/pages/OfferDetailPage.tsx:6-13`, `:250-259`

**Interfaces:**
- Consumes: `trpc.finance.offers.markRejected` (Task 1)

- [ ] **Step 1: Add the `rejected` badge color to `OfferTable.tsx`**

In `src/client/components/OfferTable.tsx`, the `colors` map (around line 15):

```ts
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
```

becomes:

```ts
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
```

Also add a filter option next to the existing `{ label: 'Accepted', value: 'accepted' }` (line ~79):

```ts
          { label: 'Rejected', value: 'rejected' },
```

- [ ] **Step 2: Add the same badge color to `OfferDetailPage.tsx`**

In `src/client/pages/OfferDetailPage.tsx`, the `colors` map inside `statusBadgeStyle` (lines 7-11):

```ts
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sending: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
```

becomes:

```ts
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sending: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
```

- [ ] **Step 3: Add a "Mark as Rejected" action button**

In `src/client/pages/OfferDetailPage.tsx`, add the mutation next to `markAccepted` (line ~58):

```ts
  const markRejected = trpc.finance.offers.markRejected.useMutation({
    onSuccess: () => refetch(),
  });
```

Then in the action-buttons block, right after the "Mark as Accepted" button (after its closing `)}` around line 259):

```tsx
          {offer.status === 'sent' && (
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--danger-color)' }}
              onClick={() => markRejected.mutate({ id: id! })}
              disabled={markRejected.isPending}
            >
              {markRejected.isPending ? '…' : '✕ Mark as Rejected'}
            </button>
          )}
```

- [ ] **Step 4: Widen the `OfferCard.tsx` status type**

In `src/client/components/OfferCard.tsx:12`, change:

```ts
  status: 'draft' | 'sending' | 'sent' | 'accepted';
```
to
```ts
  status: 'draft' | 'sending' | 'sent' | 'accepted' | 'rejected';
```

- [ ] **Step 5: Typecheck and run the client test suite**

Run: `npm run typecheck && npm run test -- src/client`
Expected: PASS, no type errors (existing `OfferCard.test.tsx`/`OfferTable.test.tsx` continue to pass since `'rejected'` is additive)

- [ ] **Step 6: Commit**

```bash
git add src/client/components/OfferCard.tsx src/client/components/OfferTable.tsx src/client/pages/OfferDetailPage.tsx
git commit -m "feat: render rejected offer status and add a reject action"
```

---

### Task 3: `Contact` → `Association` link

**Files:**
- Modify: `shared/schemas/contact.ts:10-17`
- Test: `shared/schemas/__tests__/contact.test.ts` (new file)
- Modify: `src/server/models/Contact.ts`
- Modify: `src/server/routers/finance/contacts.ts:13-16`
- Test: `src/server/routers/finance/__tests__/contacts.test.ts` (new file)

**Interfaces:**
- Produces: `Contact.associationId: string | null`. `contactsRouter.list` accepts optional `{ associationId?: string }` input (backward compatible with existing no-arg calls).

- [ ] **Step 1: Write the failing schema test**

Create `shared/schemas/__tests__/contact.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreateContactSchema } from '../contact';

const validContact = () => ({
  name: 'Michael Hanke',
  email: 'michael@afvh.de',
  address: { street: 'Street 1', city: 'City', postalCode: '12345', country: 'Germany' },
});

describe('CreateContactSchema', () => {
  it('accepts a contact without an associationId', () => {
    const result = CreateContactSchema.safeParse(validContact());
    expect(result.success).toBe(true);
  });

  it('accepts a contact with an associationId', () => {
    const result = CreateContactSchema.safeParse({ ...validContact(), associationId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
    expect(result.data?.associationId).toBe('507f1f77bcf86cd799439011');
  });

  it('accepts an explicit null associationId', () => {
    const result = CreateContactSchema.safeParse({ ...validContact(), associationId: null });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- shared/schemas/__tests__/contact.test.ts`
Expected: FAIL on the second test — `result.data?.associationId` is `undefined` because the schema strips unknown keys by default... actually Zod's default `.object()` strips unrecognized keys silently, so this will PASS parsing but `associationId` will be `undefined` in the output. Confirm this by checking `expect(result.data?.associationId).toBe('507f1f77bcf86cd799439011')` fails (`undefined !== '507f...'`).

- [ ] **Step 3: Add `associationId` to the contact schemas**

In `shared/schemas/contact.ts`, change `CreateContactSchema`:

```ts
export const CreateContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).trim(),
  address: AddressSchema,
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  associationId: z.string().min(1).nullable().optional(),
});
```

(`UpdateContactSchema` and `ContactSchema` derive from this via `.partial()`/`.extend()`, so they pick it up automatically.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- shared/schemas/__tests__/contact.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing router test**

Create `src/server/routers/finance/__tests__/contacts.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { contactsRouter } from '../contacts';
import { Contact } from '../../../models/Contact';
import { Association } from '../../../models/Association';
import { connectMongo, disconnectMongo } from '../../../db/mongo';

describe('contactsRouter', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([Contact.deleteMany({}), Association.deleteMany({})]);
  });

  it('creates a contact linked to an association', async () => {
    const association = await Association.create({
      name: 'AFVH',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
    });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const created = await caller.create({
      name: 'Michael Hanke',
      email: 'michael@afvh.de',
      address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
      associationId: association._id.toString(),
    });

    expect(created.associationId).toBe(association._id.toString());
  });

  it('filters list by associationId', async () => {
    const assocA = await Association.create({ name: 'A', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    const assocB = await Association.create({ name: 'B', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person A', email: 'a@a.de', associationId: assocA._id.toString(), address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person B', email: 'b@b.de', associationId: assocB._id.toString(), address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.list({ associationId: assocA._id.toString() });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Person A');
  });

  it('list with no input returns all contacts (backward compatible)', async () => {
    await Contact.create({ name: 'Person A', email: 'a@a.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
    await Contact.create({ name: 'Person B', email: 'b@b.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

    const caller = contactsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });
    const result = await caller.list();

    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/server/routers/finance/__tests__/contacts.test.ts`
Expected: FAIL — `caller.list({ associationId: ... })` fails input validation since `list` currently takes no input at all.

- [ ] **Step 7: Add `associationId` to the Mongoose model**

In `src/server/models/Contact.ts`, add to the interface:

```ts
export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  associationId: string | null;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

and to the schema (after `phone`):

```ts
    phone: { type: String, default: '' },
    associationId: { type: String, default: null },
```

and add an index near the existing `ContactSchema.index({ name: 1 });`:

```ts
ContactSchema.index({ associationId: 1 });
```

- [ ] **Step 8: Add the `associationId` filter to `contactsRouter.list`**

In `src/server/routers/finance/contacts.ts`, change:

```ts
  list: protectedProcedure.query(async () => {
    const contacts = await Contact.find().sort({ name: 1 }).lean();
    return contacts.map(normalizeContact);
  }),
```

to:

```ts
  list: protectedProcedure
    .input(z.object({ associationId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const filter = input?.associationId ? { associationId: input.associationId } : {};
      const contacts = await Contact.find(filter).sort({ name: 1 }).lean();
      return contacts.map(normalizeContact);
    }),
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm run test -- src/server/routers/finance/__tests__/contacts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck:server`
Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add shared/schemas/contact.ts shared/schemas/__tests__/contact.test.ts src/server/models/Contact.ts src/server/routers/finance/contacts.ts src/server/routers/finance/__tests__/contacts.test.ts
git commit -m "feat: link contacts to an association"
```

---

### Task 4: `TrackedLeague` shared schema + Mongoose model

**Files:**
- Create: `shared/schemas/trackedLeague.ts`
- Test: `shared/schemas/__tests__/trackedLeague.test.ts`
- Create: `src/server/models/TrackedLeague.ts`

**Interfaces:**
- Produces: `TrackedLeagueStatusSchema`, `CreateTrackedLeagueSchema`, `UpdateTrackedLeagueSchema`, `TrackedLeagueSchema` and their inferred types (`CreateTrackedLeagueInput`, `UpdateTrackedLeagueInput`, `TrackedLeague`). Produces the `TrackedLeague` Mongoose model with fields `associationId: string`, `contactId: ObjectId|null` (ref `Contact`), `name: string`, `year: number`, `isYouth: boolean`, `estimatedTeamsCount: string|null`, `estimatedGamedaysCount: string|null`, `comment: string`, `leaguesphereLeagueId: number|null`, `linkedOfferId: ObjectId|null` (ref `Offer`), `status: 'lead'|'contacted'|'offer_in_progress'|'rejected_pre_offer'|'closed_historical'`.

- [ ] **Step 1: Write the failing schema test**

Create `shared/schemas/__tests__/trackedLeague.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreateTrackedLeagueSchema, UpdateTrackedLeagueSchema } from '../trackedLeague';

const validLeague = () => ({
  associationId: '507f1f77bcf86cd799439011',
  name: 'Regionalliga Hessen',
  year: 2026,
  isYouth: false,
});

describe('CreateTrackedLeagueSchema', () => {
  it('accepts the minimal required fields and applies defaults', () => {
    const result = CreateTrackedLeagueSchema.safeParse(validLeague());
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('lead');
    expect(result.data?.comment).toBe('');
  });

  it('rejects a missing name', () => {
    const result = CreateTrackedLeagueSchema.safeParse({ ...validLeague(), name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = CreateTrackedLeagueSchema.safeParse({ ...validLeague(), status: 'bogus' });
    expect(result.success).toBe(false);
  });

  it('accepts free-text estimate fields', () => {
    const result = CreateTrackedLeagueSchema.safeParse({
      ...validLeague(),
      estimatedTeamsCount: '~50',
      estimatedGamedaysCount: 'max. 6/Spieltag',
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateTrackedLeagueSchema', () => {
  it('accepts a partial update setting only leaguesphereLeagueId', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ leaguesphereLeagueId: 42 });
    expect(result.success).toBe(true);
  });

  it('accepts a partial update setting only linkedOfferId', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ linkedOfferId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
  });

  it('does not silently apply the status default on partial update', () => {
    const result = UpdateTrackedLeagueSchema.safeParse({ comment: 'updated' });
    expect(result.success).toBe(true);
    expect(result.data?.status).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- shared/schemas/__tests__/trackedLeague.test.ts`
Expected: FAIL — cannot find module `../trackedLeague`

- [ ] **Step 3: Create the shared schema**

Create `shared/schemas/trackedLeague.ts`:

```ts
import { z } from 'zod';

export const TrackedLeagueStatusSchema = z.enum([
  'lead',
  'contacted',
  'offer_in_progress',
  'rejected_pre_offer',
  'closed_historical',
]);

export const CreateTrackedLeagueSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  contactId: z.string().min(1).nullable().optional(),
  name: z.string().min(1, 'Name is required').max(255).trim(),
  year: z.number().int().min(2000).max(2100),
  isYouth: z.boolean(),
  estimatedTeamsCount: z.string().max(100).nullable().optional(),
  estimatedGamedaysCount: z.string().max(100).nullable().optional(),
  comment: z.string().max(2000).optional().default(''),
  status: TrackedLeagueStatusSchema.default('lead'),
});

export const UpdateTrackedLeagueSchema = CreateTrackedLeagueSchema.partial().extend({
  leaguesphereLeagueId: z.number().int().positive().nullable().optional(),
  linkedOfferId: z.string().nullable().optional(),
});

export const TrackedLeagueSchema = CreateTrackedLeagueSchema.extend({
  _id: z.string(),
  leaguesphereLeagueId: z.number().nullable(),
  linkedOfferId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TrackedLeagueStatus = z.infer<typeof TrackedLeagueStatusSchema>;
export type CreateTrackedLeagueInput = z.infer<typeof CreateTrackedLeagueSchema>;
export type UpdateTrackedLeagueInput = z.infer<typeof UpdateTrackedLeagueSchema>;
export type TrackedLeague = z.infer<typeof TrackedLeagueSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- shared/schemas/__tests__/trackedLeague.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Create the Mongoose model**

Create `src/server/models/TrackedLeague.ts`:

```ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ITrackedLeague extends Document {
  associationId: string;
  contactId: Types.ObjectId | null;
  name: string;
  year: number;
  isYouth: boolean;
  estimatedTeamsCount: string | null;
  estimatedGamedaysCount: string | null;
  comment: string;
  leaguesphereLeagueId: number | null;
  linkedOfferId: Types.ObjectId | null;
  status: 'lead' | 'contacted' | 'offer_in_progress' | 'rejected_pre_offer' | 'closed_historical';
  createdAt: Date;
  updatedAt: Date;
}

const TrackedLeagueSchema = new Schema<ITrackedLeague>(
  {
    associationId: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    name: { type: String, required: true },
    year: { type: Number, required: true },
    isYouth: { type: Boolean, default: false },
    estimatedTeamsCount: { type: String, default: null },
    estimatedGamedaysCount: { type: String, default: null },
    comment: { type: String, default: '' },
    leaguesphereLeagueId: { type: Number, default: null },
    linkedOfferId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
    status: {
      type: String,
      enum: ['lead', 'contacted', 'offer_in_progress', 'rejected_pre_offer', 'closed_historical'],
      default: 'lead',
    },
  },
  { timestamps: true }
);

TrackedLeagueSchema.index({ associationId: 1, year: 1 });

export const TrackedLeague = model<ITrackedLeague>('TrackedLeague', TrackedLeagueSchema);
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck:server`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add shared/schemas/trackedLeague.ts shared/schemas/__tests__/trackedLeague.test.ts src/server/models/TrackedLeague.ts
git commit -m "feat: add TrackedLeague schema and model"
```

---

### Task 5: Derived effective status (`trackedLeagueStatus.ts`)

**Files:**
- Create: `src/server/lib/trackedLeagueStatus.ts`
- Test: `src/server/lib/__tests__/trackedLeagueStatus.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, plain object shapes only)
- Produces: `computeTrackedLeagueEffectiveStatus(trackedLeague, offer?, invoice?): TrackedLeagueEffectiveStatus`, used by Task 7's `trackedLeagues.list` procedure.

- [ ] **Step 1: Write the failing test**

Create `src/server/lib/__tests__/trackedLeagueStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeTrackedLeagueEffectiveStatus } from '../trackedLeagueStatus';

describe('computeTrackedLeagueEffectiveStatus', () => {
  it('returns the manual status when not linked to an offer', () => {
    const result = computeTrackedLeagueEffectiveStatus({ status: 'contacted', linkedOfferId: null });
    expect(result).toEqual({ stage: 'contacted' });
  });

  it('falls back to manual status when linkedOfferId is set but the offer was not passed', () => {
    const result = computeTrackedLeagueEffectiveStatus({ status: 'offer_in_progress', linkedOfferId: 'offer-1' });
    expect(result).toEqual({ stage: 'offer_in_progress' });
  });

  it('derives offer_draft from a draft offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'draft' }
    );
    expect(result).toEqual({ stage: 'offer_draft', offerId: 'offer-1' });
  });

  it('derives offer_awaiting_decision from a sending offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'sending' }
    );
    expect(result.stage).toBe('offer_awaiting_decision');
  });

  it('derives offer_awaiting_decision from a sent offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'sent' }
    );
    expect(result.stage).toBe('offer_awaiting_decision');
  });

  it('derives offer_rejected from a rejected offer', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'rejected' }
    );
    expect(result.stage).toBe('offer_rejected');
  });

  it('derives accepted_awaiting_invoice from an accepted offer with no invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      null
    );
    expect(result.stage).toBe('accepted_awaiting_invoice');
  });

  it('derives invoiced_unpaid from an accepted offer with an unpaid invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      { status: 'sent' }
    );
    expect(result.stage).toBe('invoiced_unpaid');
  });

  it('derives paid from an accepted offer with a paid invoice', () => {
    const result = computeTrackedLeagueEffectiveStatus(
      { status: 'offer_in_progress', linkedOfferId: 'offer-1' },
      { _id: 'offer-1', status: 'accepted' },
      { status: 'paid' }
    );
    expect(result.stage).toBe('paid');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/lib/__tests__/trackedLeagueStatus.test.ts`
Expected: FAIL — cannot find module `../trackedLeagueStatus`

- [ ] **Step 3: Implement the pure function**

Create `src/server/lib/trackedLeagueStatus.ts`:

```ts
export type TrackedLeaguePreOfferStage =
  | 'lead'
  | 'contacted'
  | 'offer_in_progress'
  | 'rejected_pre_offer'
  | 'closed_historical';

export type TrackedLeagueLinkedStage =
  | 'offer_draft'
  | 'offer_awaiting_decision'
  | 'offer_rejected'
  | 'accepted_awaiting_invoice'
  | 'invoiced_unpaid'
  | 'paid';

export type TrackedLeagueEffectiveStatus =
  | { stage: TrackedLeaguePreOfferStage }
  | { stage: TrackedLeagueLinkedStage; offerId: string };

interface TrackedLeagueLike {
  status: string;
  linkedOfferId?: string | null;
}

interface OfferLike {
  _id: unknown;
  status: string;
}

interface InvoiceLike {
  status: string;
}

/**
 * Derives a TrackedLeague's pipeline stage. Once a real Offer is linked, the
 * Offer/Invoice status is the single source of truth — this is NOT persisted
 * on the TrackedLeague document, mirroring computeConfigPrices()'s
 * computed-on-read pattern.
 */
export function computeTrackedLeagueEffectiveStatus(
  trackedLeague: TrackedLeagueLike,
  offer?: OfferLike | null,
  invoice?: InvoiceLike | null
): TrackedLeagueEffectiveStatus {
  if (!trackedLeague.linkedOfferId || !offer) {
    return { stage: trackedLeague.status as TrackedLeaguePreOfferStage };
  }

  const offerId = String(offer._id);

  if (offer.status === 'draft') return { stage: 'offer_draft', offerId };
  if (offer.status === 'sending' || offer.status === 'sent') {
    return { stage: 'offer_awaiting_decision', offerId };
  }
  if (offer.status === 'rejected') return { stage: 'offer_rejected', offerId };

  // offer.status === 'accepted'
  if (!invoice) return { stage: 'accepted_awaiting_invoice', offerId };
  if (invoice.status === 'paid') return { stage: 'paid', offerId };
  return { stage: 'invoiced_unpaid', offerId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/server/lib/__tests__/trackedLeagueStatus.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/lib/trackedLeagueStatus.ts src/server/lib/__tests__/trackedLeagueStatus.test.ts
git commit -m "feat: derive TrackedLeague effective status from linked Offer/Invoice"
```

---

### Task 6: Leaguesphere name-matching (`trackedLeagueCrosscheck.ts`)

**Files:**
- Create: `src/server/lib/trackedLeagueCrosscheck.ts`
- Test: `src/server/lib/__tests__/trackedLeagueCrosscheck.test.ts`

**Interfaces:**
- Produces: `matchLeaguesphereCandidates(trackedLeagueName: string, leaguesphereLeagues: { _id: number; name: string }[]): CrosscheckCandidate[]`, used by Task 7's `trackedLeagues.crosscheck` procedure.

- [ ] **Step 1: Write the failing test**

Create `src/server/lib/__tests__/trackedLeagueCrosscheck.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchLeaguesphereCandidates } from '../trackedLeagueCrosscheck';

describe('matchLeaguesphereCandidates', () => {
  const leagues = [
    { _id: 1, name: 'Regionalliga Hessen' },
    { _id: 2, name: 'U16 Hessen' },
    { _id: 3, name: 'Bayernliga' },
  ];

  it('returns an exact case-insensitive match first', () => {
    const result = matchLeaguesphereCandidates('regionalliga hessen', leagues);
    expect(result).toEqual([{ leaguesphereLeagueId: 1, name: 'Regionalliga Hessen', confidence: 'exact' }]);
  });

  it('falls back to a substring match when there is no exact match', () => {
    const result = matchLeaguesphereCandidates('Hessen', leagues);
    expect(result.map((c) => c.leaguesphereLeagueId).sort()).toEqual([1, 2]);
    expect(result.every((c) => c.confidence === 'partial')).toBe(true);
  });

  it('returns an empty array when nothing matches', () => {
    const result = matchLeaguesphereCandidates('Oberliga NRW', leagues);
    expect(result).toEqual([]);
  });

  it('caps partial matches at 3 candidates', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ _id: i, name: `Test League ${i}` }));
    const result = matchLeaguesphereCandidates('Test League', many);
    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/lib/__tests__/trackedLeagueCrosscheck.test.ts`
Expected: FAIL — cannot find module `../trackedLeagueCrosscheck`

- [ ] **Step 3: Implement the pure function**

Create `src/server/lib/trackedLeagueCrosscheck.ts`:

```ts
export interface LeaguesphereLeagueOption {
  _id: number;
  name: string;
}

export interface CrosscheckCandidate {
  leaguesphereLeagueId: number;
  name: string;
  confidence: 'exact' | 'partial';
}

const normalize = (s: string) => s.trim().toLowerCase();

/**
 * Name-matches a TrackedLeague against real leaguesphere leagues for the
 * same association+season. Computed on read — nothing here is persisted.
 */
export function matchLeaguesphereCandidates(
  trackedLeagueName: string,
  leaguesphereLeagues: LeaguesphereLeagueOption[]
): CrosscheckCandidate[] {
  const target = normalize(trackedLeagueName);

  const exact = leaguesphereLeagues.filter((l) => normalize(l.name) === target);
  if (exact.length > 0) {
    return exact.map((l) => ({ leaguesphereLeagueId: l._id, name: l.name, confidence: 'exact' as const }));
  }

  const partial = leaguesphereLeagues.filter((l) => {
    const n = normalize(l.name);
    return n.includes(target) || target.includes(n);
  });

  return partial.slice(0, 3).map((l) => ({ leaguesphereLeagueId: l._id, name: l.name, confidence: 'partial' as const }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/server/lib/__tests__/trackedLeagueCrosscheck.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/lib/trackedLeagueCrosscheck.ts src/server/lib/__tests__/trackedLeagueCrosscheck.test.ts
git commit -m "feat: add leaguesphere name-matching for tracked league crosscheck"
```

---

### Task 7: `finance.trackedLeagues` router

**Files:**
- Create: `src/server/routers/finance/trackedLeagues.ts`
- Test: `src/server/routers/finance/__tests__/trackedLeagues.test.ts`
- Modify: `src/server/routers/index.ts`

**Interfaces:**
- Consumes: `TrackedLeague` model (Task 4), `computeTrackedLeagueEffectiveStatus` (Task 5), `matchLeaguesphereCandidates` (Task 6), `Association`/`Offer`/`Invoice` models, `getMysqlPool`.
- Produces: `trackedLeaguesRouter` with `list`, `create`, `update`, `delete`, `crosscheck`, `linkToOffer`, registered at `finance.trackedLeagues` in the app router.

- [ ] **Step 1: Write the failing tests**

Create `src/server/routers/finance/__tests__/trackedLeagues.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { trackedLeaguesRouter } from '../trackedLeagues';
import { TrackedLeague } from '../../../models/TrackedLeague';
import { Association } from '../../../models/Association';
import { Contact } from '../../../models/Contact';
import { Offer } from '../../../models/Offer';
import { Invoice } from '../../../models/Invoice';
import { connectMongo, disconnectMongo } from '../../../db/mongo';
import { getMysqlPool } from '../../../db/mysql';

vi.mock('../../../db/mysql');

const caller = () => trackedLeaguesRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

describe('trackedLeaguesRouter', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  afterEach(async () => {
    await Promise.all([
      TrackedLeague.deleteMany({}),
      Association.deleteMany({}),
      Contact.deleteMany({}),
      Offer.deleteMany({}),
      Invoice.deleteMany({}),
    ]);
    vi.clearAllMocks();
  });

  describe('create/list/update/delete', () => {
    it('creates a tracked league with defaults', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });

      const created = await caller().create({
        associationId: association._id.toString(),
        name: 'Regionalliga Hessen',
        year: 2026,
        isYouth: false,
      });

      expect(created.status).toBe('lead');
      expect(created.leaguesphereLeagueId).toBeUndefined(); // not set by create input, defaults to null in DB
    });

    it('lists tracked leagues for an association with a lead effectiveStatus', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false, status: 'contacted' });

      const result = await caller().list({ associationId: association._id.toString() });

      expect(result).toHaveLength(1);
      expect(result[0].effectiveStatus).toEqual({ stage: 'contacted' });
    });

    it('lists a tracked league linked to an accepted, paid offer as paid', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const contact = await Contact.create({ name: 'Michael Hanke', email: 'michael@afvh.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const offer = await Offer.create({ associationId: association._id.toString(), seasonId: 2026, leagueIds: [16], contactId: contact._id, status: 'accepted' });
      await Invoice.create({
        offerId: offer._id, associationId: association._id.toString(), contactId: contact._id, customerNumber: 1,
        seasonId: 2026, invoiceNumber: 'INV-1', invoiceDate: new Date(), servicePeriod: '2026', dueDate: new Date(),
        status: 'paid',
      });
      await TrackedLeague.create({
        associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false,
        linkedOfferId: offer._id,
      });

      const result = await caller().list({ associationId: association._id.toString() });

      expect(result[0].effectiveStatus).toEqual({ stage: 'paid', offerId: offer._id.toString() });
    });

    it('updates leaguesphereLeagueId', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const created = await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false });

      const updated = await caller().update({ id: created._id.toString(), data: { leaguesphereLeagueId: 16 } });

      expect(updated.leaguesphereLeagueId).toBe(16);
    });

    it('deletes a tracked league', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const created = await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false });

      await caller().delete({ id: created._id.toString() });

      expect(await TrackedLeague.findById(created._id)).toBeNull();
    });
  });

  describe('crosscheck', () => {
    it('returns candidates for unlinked leagues matched by season and association', async () => {
      const association = await Association.create({
        name: 'AFVH', leaguesphereAssociationId: 3,
        address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' },
      });
      const unlinked = await TrackedLeague.create({
        associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false,
      });

      const query = vi.fn()
        .mockResolvedValueOnce([[{ id: 6 }]]) // season lookup
        .mockResolvedValueOnce([[{ _id: 16, name: 'Regionalliga Hessen' }]]); // league lookup
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2026] });

      expect(result[unlinked._id.toString()]).toEqual([
        { leaguesphereLeagueId: 16, name: 'Regionalliga Hessen', confidence: 'exact' },
      ]);
    });

    it('returns no candidates when the season does not exist yet', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'U16 Hessen', year: 2027, isYouth: true });

      const query = vi.fn().mockResolvedValueOnce([[]]); // no season row for 2027
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2027] });

      expect(result).toEqual({});
    });

    it('skips already-linked leagues', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      await TrackedLeague.create({ associationId: association._id.toString(), name: 'Regionalliga Hessen', year: 2026, isYouth: false, leaguesphereLeagueId: 16 });

      const query = vi.fn();
      vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

      const result = await caller().crosscheck({ associationId: association._id.toString(), years: [2026] });

      expect(result).toEqual({});
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('linkToOffer', () => {
    it('sets linkedOfferId on all given tracked leagues', async () => {
      const association = await Association.create({ name: 'AFVH', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const a = await TrackedLeague.create({ associationId: association._id.toString(), name: 'League A', year: 2026, isYouth: false });
      const b = await TrackedLeague.create({ associationId: association._id.toString(), name: 'League B', year: 2026, isYouth: false });
      const contact = await Contact.create({ name: 'C', email: 'c@c.de', address: { street: 'S', city: 'C', postalCode: 'P', country: 'Germany' } });
      const offer = await Offer.create({ associationId: association._id.toString(), seasonId: 2026, leagueIds: [1, 2], contactId: contact._id });

      await caller().linkToOffer({ ids: [a._id.toString(), b._id.toString()], offerId: offer._id.toString() });

      const refreshedA = await TrackedLeague.findById(a._id);
      const refreshedB = await TrackedLeague.findById(b._id);
      expect(refreshedA?.linkedOfferId?.toString()).toBe(offer._id.toString());
      expect(refreshedB?.linkedOfferId?.toString()).toBe(offer._id.toString());
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/routers/finance/__tests__/trackedLeagues.test.ts`
Expected: FAIL — cannot find module `../trackedLeagues`

- [ ] **Step 3: Implement the router**

Create `src/server/routers/finance/trackedLeagues.ts`:

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../../trpc';
import { CreateTrackedLeagueSchema, UpdateTrackedLeagueSchema } from '../../../../shared/schemas/trackedLeague';
import { TrackedLeague } from '../../models/TrackedLeague';
import { Association } from '../../models/Association';
import { Offer } from '../../models/Offer';
import { Invoice } from '../../models/Invoice';
import { getMysqlPool } from '../../db/mysql';
import { computeTrackedLeagueEffectiveStatus } from '../../lib/trackedLeagueStatus';
import { matchLeaguesphereCandidates, type CrosscheckCandidate } from '../../lib/trackedLeagueCrosscheck';

const normalizeTrackedLeague = (doc: any) => ({
  ...doc,
  _id: doc._id.toString(),
  contactId: doc.contactId ? doc.contactId.toString() : null,
  linkedOfferId: doc.linkedOfferId ? doc.linkedOfferId.toString() : null,
});

export const trackedLeaguesRouter = router({
  list: protectedProcedure
    .input(z.object({ associationId: z.string() }))
    .query(async ({ input }) => {
      const trackedLeagues = await TrackedLeague.find({ associationId: input.associationId })
        .sort({ year: -1, name: 1 })
        .lean();

      const offerIds = trackedLeagues
        .map((tl) => tl.linkedOfferId?.toString())
        .filter((id): id is string => !!id);

      const offers = offerIds.length > 0 ? await Offer.find({ _id: { $in: offerIds } }).lean() : [];
      const offersById = new Map(offers.map((o) => [o._id.toString(), o]));

      const invoices = offerIds.length > 0 ? await Invoice.find({ offerId: { $in: offerIds } }).lean() : [];
      const invoicesByOfferId = new Map(invoices.map((i) => [i.offerId.toString(), i]));

      return trackedLeagues.map((tl) => {
        const normalized = normalizeTrackedLeague(tl);
        const offer = normalized.linkedOfferId ? offersById.get(normalized.linkedOfferId) : undefined;
        const invoice = offer ? invoicesByOfferId.get(offer._id.toString()) : undefined;
        return {
          ...normalized,
          effectiveStatus: computeTrackedLeagueEffectiveStatus(normalized, offer, invoice),
        };
      });
    }),

  create: protectedProcedure
    .input(CreateTrackedLeagueSchema)
    .mutation(async ({ input }) => {
      const created = await TrackedLeague.create(input);
      return normalizeTrackedLeague(created.toObject());
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: UpdateTrackedLeagueSchema }))
    .mutation(async ({ input }) => {
      const updated = await TrackedLeague.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' }).lean();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeTrackedLeague(updated);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await TrackedLeague.findByIdAndDelete(input.id);
      if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' });
      return { success: true };
    }),

  crosscheck: protectedProcedure
    .input(z.object({ associationId: z.string(), years: z.array(z.number()).min(1) }))
    .query(async ({ input }) => {
      const unlinked = await TrackedLeague.find({
        associationId: input.associationId,
        year: { $in: input.years },
        leaguesphereLeagueId: null,
      }).lean();

      if (unlinked.length === 0) return {};

      const pool = getMysqlPool();
      const association = await Association.findById(input.associationId).lean();
      const result: Record<string, CrosscheckCandidate[]> = {};

      for (const year of input.years) {
        const forYear = unlinked.filter((tl) => tl.year === year);
        if (forYear.length === 0) continue;

        const [seasonRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM gamedays_season WHERE name = ?',
          [String(year)]
        );
        const season = seasonRows[0];
        if (!season) continue;

        const params: number[] = [season.id];
        let joinClause = '';
        let whereClause = 'WHERE slt.season_id = ?';
        if (association?.leaguesphereAssociationId != null) {
          joinClause = `
           JOIN gamedays_seasonleagueteam_teams st ON st.seasonleagueteam_id = slt.id
           JOIN gamedays_team t ON t.id = st.team_id`;
          whereClause += " AND t.association_id = ? AND t.location != 'dummy'";
          params.push(association.leaguesphereAssociationId);
        }

        const [leagueRows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT l.id as _id, l.name
           FROM gamedays_league l
           JOIN gamedays_seasonleagueteam slt ON slt.league_id = l.id
           ${joinClause}
           ${whereClause}`,
          params
        );

        for (const tl of forYear) {
          const candidates = matchLeaguesphereCandidates(tl.name, leagueRows as unknown as { _id: number; name: string }[]);
          if (candidates.length > 0) result[tl._id.toString()] = candidates;
        }
      }

      return result;
    }),

  linkToOffer: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1), offerId: z.string() }))
    .mutation(async ({ input }) => {
      await TrackedLeague.updateMany(
        { _id: { $in: input.ids } },
        { $set: { linkedOfferId: input.offerId } }
      );
      return { success: true };
    }),
});
```

- [ ] **Step 4: Register the router**

In `src/server/routers/index.ts`, add the import:

```ts
import { trackedLeaguesRouter } from './finance/trackedLeagues';
```

and register it inside the `finance` router (after `leagues: leaguesRouter,`):

```ts
    leagues: leaguesRouter,
    trackedLeagues: trackedLeaguesRouter,
    seasons: seasonsRouter,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/server/routers/finance/__tests__/trackedLeagues.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck:server`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/server/routers/finance/trackedLeagues.ts src/server/routers/finance/__tests__/trackedLeagues.test.ts src/server/routers/index.ts
git commit -m "feat: add finance.trackedLeagues router"
```

---

### Task 8: `ContactForm.tsx` gains an Association select

**Files:**
- Modify: `src/client/components/ContactForm.tsx`
- Test: `src/client/components/__tests__/ContactForm.test.tsx` (new file)

**Interfaces:**
- Consumes: `trpc.finance.associations.list` (existing)
- Produces: `ContactFormProps.lockedAssociationId?: string`; `onSubmit` payload gains `associationId: string | null`.

- [ ] **Step 1: Write the failing test**

Create `src/client/components/__tests__/ContactForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../ContactForm';
import { trpc } from '../../lib/trpc';

vi.mock('../../lib/trpc', () => ({
  trpc: {
    finance: {
      associations: {
        list: { useQuery: vi.fn() },
      },
    },
  },
}));

describe('ContactForm — association link', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.mocked(trpc.finance.associations.list.useQuery).mockReturnValue({
      data: [{ _id: 'assoc-1', name: 'AFVH' }, { _id: 'assoc-2', name: 'AFVBy' }],
    } as any);
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/Contact Name/i), { target: { value: 'Michael Hanke' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'michael@afvh.de' } });
    fireEvent.change(screen.getByLabelText(/Street/i), { target: { value: 'Street 1' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'City' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '12345' } });
  };

  it('shows an association dropdown when not locked, and submits the chosen id', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Association/i), { target: { value: 'assoc-2' } });
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBe('assoc-2');
  });

  it('submits null when no association is chosen', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBeNull();
  });

  it('hides the dropdown and forces the locked associationId when lockedAssociationId is given', async () => {
    render(<ContactForm onSubmit={mockOnSubmit} lockedAssociationId="assoc-1" />);
    expect(screen.queryByLabelText(/Association/i)).not.toBeInTheDocument();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Person'));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(mockOnSubmit.mock.calls[0][0].associationId).toBe('assoc-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/client/components/__tests__/ContactForm.test.tsx`
Expected: FAIL — no element with label `/Association/i`, `associationId` is `undefined` in submitted data

- [ ] **Step 3: Implement the association field**

In `src/client/components/ContactForm.tsx`, add the import:

```ts
import { trpc } from '../lib/trpc';
```

Update the props interface:

```ts
export interface ContactFormProps {
  initialData?: any;
  lockedAssociationId?: string;
  onSubmit: (data: {
    name: string;
    email: string;
    associationId: string | null;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}
```

Update the component signature and state:

```ts
export function ContactForm({ initialData, lockedAssociationId, onSubmit, onCancel, isLoading = false }: ContactFormProps) {
  const { data: associations = [] } = trpc.finance.associations.list.useQuery(undefined, {
    enabled: !lockedAssociationId,
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    associationId: lockedAssociationId || '',
  });
```

Update the `initialData` effect:

```ts
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        street: initialData.address?.street || initialData.street || '',
        city: initialData.address?.city || initialData.city || '',
        postalCode: initialData.address?.postalCode || initialData.postalCode || '',
        country: initialData.address?.country || initialData.country || '',
        associationId: lockedAssociationId || initialData.associationId || '',
      });
    } else if (lockedAssociationId) {
      setFormData((prev) => ({ ...prev, associationId: lockedAssociationId }));
    }
  }, [initialData, lockedAssociationId]);
```

Change `handleChange` to accept selects too:

```ts
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
```

Include `associationId` in the submit payload (inside `handleSubmit`, in the `onSubmit(...)` call):

```ts
      await onSubmit({
        name: formData.name,
        email: formData.email,
        associationId: formData.associationId || null,
        address: {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        },
      });
```

Add the dropdown in the JSX, right after the email field's closing `</div>` and before the street field:

```tsx
      {!lockedAssociationId && (
        <div>
          <label htmlFor="associationId" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Association
          </label>
          <select
            id="associationId"
            name="associationId"
            value={formData.associationId}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="">— No association —</option>
            {associations.map((a: any) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/client/components/__tests__/ContactForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/client/components/ContactForm.tsx src/client/components/__tests__/ContactForm.test.tsx
git commit -m "feat: let ContactForm assign a contact to an association"
```

---

### Task 9: Association detail page shell (routing + Contacts section)

**Files:**
- Modify: `src/client/components/AssociationList.tsx`
- Modify: `src/client/components/__tests__/AssociationList.test.tsx`
- Modify: `src/client/pages/AssociationsPage.tsx`
- Modify: `src/client/App.tsx`
- Create: `src/client/pages/AssociationDetailPage.tsx`

**Interfaces:**
- Produces: `AssociationList` gains a required `onViewDetails: (id: string) => void` prop, rendered as a "View leagues & contacts →" link that does not trigger `onEdit`. Route `/associations/:id` renders `AssociationDetailPage`.
- Consumes: `trpc.finance.associations.get`, `trpc.finance.contacts.list({ associationId })` (Task 3), `ContactForm` (Task 8), `ContactGrid` (existing).

- [ ] **Step 1: Write the failing test for the new list affordance**

In `src/client/components/__tests__/AssociationList.test.tsx`, add `mockOnViewDetails` next to the existing mocks:

```ts
  const mockOnViewDetails = vi.fn();
```

Add `mockOnViewDetails.mockClear();` to the `beforeEach`, pass `onViewDetails={mockOnViewDetails}` to every existing `render(<AssociationList ... />)` call in the file, and add a new test at the end of the `describe` block:

```ts
  it('calls onViewDetails without triggering onEdit when the details link is clicked', () => {
    render(<AssociationList associations={mockAssociations} onEdit={mockOnEdit} onDelete={mockOnDelete} onViewDetails={mockOnViewDetails} />);

    fireEvent.click(screen.getAllByText(/View leagues & contacts/i)[0]);

    expect(mockOnViewDetails).toHaveBeenCalledWith('1');
    expect(mockOnEdit).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/client/components/__tests__/AssociationList.test.tsx`
Expected: FAIL — TypeScript error (missing required prop) and/or no element matching `/View leagues & contacts/i`

- [ ] **Step 3: Add the prop and affordance to `AssociationList.tsx`**

In `src/client/components/AssociationList.tsx`, update the props interface:

```ts
interface AssociationListProps {
  associations: Association[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  isLoading?: boolean;
}

export function AssociationList({ associations, onEdit, onDelete, onViewDetails, isLoading = false }: AssociationListProps) {
```

Add the link right after the "Click to edit" footer `<div>` (before that div's closing, or as a sibling below it):

```tsx
          <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click to edit
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(association._id);
            }}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 'var(--spacing-sm)', padding: 0, minHeight: 'auto', alignSelf: 'flex-start' }}
          >
            View leagues & contacts →
          </button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/client/components/__tests__/AssociationList.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire navigation in `AssociationsPage.tsx`**

In `src/client/pages/AssociationsPage.tsx`, add the import:

```ts
import { useNavigate } from 'react-router-dom';
```

Add inside the component, near the top:

```ts
  const navigate = useNavigate();
```

Pass the new prop to `AssociationList` (in the JSX near the bottom):

```tsx
        <AssociationList
          associations={visibleAssociations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={(id) => navigate(`/associations/${id}`)}
          isLoading={isLoading}
        />
```

- [ ] **Step 6: Create the detail page**

Create `src/client/pages/AssociationDetailPage.tsx`:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { ContactForm } from '../components/ContactForm';
import { ContactGrid } from '../components/ContactGrid';
import { Toast } from '../components/Toast';

type ContactModal = { mode: 'create' } | { mode: 'edit'; id: string } | null;

export function AssociationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contactModal, setContactModal] = useState<ContactModal>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: association, isLoading } = trpc.finance.associations.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );
  const { data: contacts = [], refetch: refetchContacts } = trpc.finance.contacts.list.useQuery(
    { associationId: id },
    { enabled: !!id }
  );

  const createContact = trpc.finance.contacts.create.useMutation({
    onSuccess: () => { setContactModal(null); refetchContacts(); },
  });
  const updateContact = trpc.finance.contacts.update.useMutation({
    onSuccess: () => { setContactModal(null); refetchContacts(); },
  });
  const deleteContact = trpc.finance.contacts.delete.useMutation({
    onSuccess: () => refetchContacts(),
    onError: (error) => setToast({ message: error.message || 'Failed to delete contact', type: 'error' }),
  });

  if (!id) {
    return <div className="container">Association not found.</div>;
  }

  const activeContact = contactModal?.mode === 'edit'
    ? contacts.find((c: any) => c._id === contactModal.id)
    : undefined;

  async function handleContactSubmit(data: any) {
    if (contactModal?.mode === 'edit') {
      await updateContact.mutateAsync({ id: contactModal.id, data });
    } else {
      await createContact.mutateAsync(data);
    }
  }

  if (isLoading) {
    return <div className="container">Loading…</div>;
  }

  if (!association) {
    return <div className="container">Association not found.</div>;
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/associations')} style={{ marginBottom: 'var(--spacing-md)' }}>
        ← Back to Associations
      </button>

      <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>{association.name}</h1>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 'var(--spacing-xl)' }}>
        {association.address?.street}, {association.address?.postalCode} {association.address?.city}
      </div>

      <section style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Contacts</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setContactModal({ mode: 'create' })}>
            + Add Contact
          </button>
        </div>
        <ContactGrid
          contacts={contacts}
          onEdit={(cid) => setContactModal({ mode: 'edit', id: cid })}
          onDelete={(cid) => deleteContact.mutate({ id: cid })}
        />
      </section>

      {contactModal && (
        <div
          onClick={() => setContactModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '1rem', backdropFilter: 'blur(2px)',
          }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                {contactModal.mode === 'create' ? 'Add Contact' : 'Edit Contact'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setContactModal(null)}>✕</button>
            </div>
            <ContactForm
              initialData={activeContact}
              lockedAssociationId={id}
              onSubmit={handleContactSubmit}
              onCancel={() => setContactModal(null)}
              isLoading={createContact.isPending || updateContact.isPending}
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
```

- [ ] **Step 7: Wire the route**

In `src/client/App.tsx`, add the import next to the other page imports:

```ts
import { AssociationDetailPage } from './pages/AssociationDetailPage';
```

Add the route right after `<Route path="/associations" element={<AssociationsPage />} />`:

```tsx
                    <Route path="/associations/:id" element={<AssociationDetailPage />} />
```

- [ ] **Step 8: Typecheck and run the client test suite**

Run: `npm run typecheck && npm run test -- src/client`
Expected: PASS, no type errors

- [ ] **Step 9: Manually verify in the dev server**

Run: `npm run dev`, open the app, go to Associations, click "View leagues & contacts →" on any association card, confirm it navigates to `/associations/:id` and shows the association header and its Contacts section (add/edit/delete a contact to confirm the CRUD flow still works end to end).

- [ ] **Step 10: Commit**

```bash
git add src/client/components/AssociationList.tsx src/client/components/__tests__/AssociationList.test.tsx src/client/pages/AssociationsPage.tsx src/client/pages/AssociationDetailPage.tsx src/client/App.tsx
git commit -m "feat: add Association detail page with a Contacts section"
```

---

### Task 10: `TrackedLeagueForm` component

**Files:**
- Create: `src/client/components/TrackedLeagueForm.tsx`
- Test: `src/client/components/__tests__/TrackedLeagueForm.test.tsx`

**Interfaces:**
- Produces: `TrackedLeagueForm({ initialData?, associationId, contacts, onSubmit, onCancel?, isLoading? })`, `onSubmit` payload shape `{ associationId, contactId, name, year, isYouth, estimatedTeamsCount, estimatedGamedaysCount, comment, status }`.

- [ ] **Step 1: Write the failing test**

Create `src/client/components/__tests__/TrackedLeagueForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackedLeagueForm } from '../TrackedLeagueForm';

describe('TrackedLeagueForm', () => {
  const contacts = [{ _id: 'contact-1', name: 'Michael Hanke' }];

  it('requires a name', async () => {
    const onSubmit = vi.fn();
    render(<TrackedLeagueForm associationId="assoc-1" contacts={contacts} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Add League'));

    expect(await screen.findByText(/League name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with the association id, chosen contact, and defaults', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TrackedLeagueForm associationId="assoc-1" contacts={contacts} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/League Name/i), { target: { value: 'Regionalliga Hessen' } });
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Contact/i), { target: { value: 'contact-1' } });
    fireEvent.click(screen.getByText('Add League'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      associationId: 'assoc-1',
      contactId: 'contact-1',
      name: 'Regionalliga Hessen',
      year: 2026,
      isYouth: false,
      status: 'lead',
    }));
  });

  it('shows a derived-status note instead of the status field when linked to an offer', () => {
    render(
      <TrackedLeagueForm
        associationId="assoc-1"
        contacts={contacts}
        initialData={{ name: 'Regionalliga Hessen', year: 2026, linkedOfferId: 'offer-1' }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/^Status$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/derived from the linked offer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/client/components/__tests__/TrackedLeagueForm.test.tsx`
Expected: FAIL — cannot find module `../TrackedLeagueForm`

- [ ] **Step 3: Implement the component**

Create `src/client/components/TrackedLeagueForm.tsx`:

```tsx
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'offer_in_progress', label: 'Offer in progress' },
  { value: 'rejected_pre_offer', label: 'Rejected (before offer)' },
  { value: 'closed_historical', label: 'Closed (historical)' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  fontSize: '0.875rem',
};

export interface TrackedLeagueFormProps {
  initialData?: any;
  associationId: string;
  contacts: { _id: string; name: string }[];
  onSubmit: (data: {
    associationId: string;
    contactId: string | null;
    name: string;
    year: number;
    isYouth: boolean;
    estimatedTeamsCount: string | null;
    estimatedGamedaysCount: string | null;
    comment: string;
    status: string;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TrackedLeagueForm({ initialData, associationId, contacts, onSubmit, onCancel, isLoading = false }: TrackedLeagueFormProps) {
  const [formData, setFormData] = useState({
    contactId: '',
    name: '',
    year: new Date().getFullYear(),
    isYouth: false,
    estimatedTeamsCount: '',
    estimatedGamedaysCount: '',
    comment: '',
    status: 'lead',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        contactId: initialData.contactId || '',
        name: initialData.name || '',
        year: initialData.year || new Date().getFullYear(),
        isYouth: !!initialData.isYouth,
        estimatedTeamsCount: initialData.estimatedTeamsCount || '',
        estimatedGamedaysCount: initialData.estimatedGamedaysCount || '',
        comment: initialData.comment || '',
        status: initialData.status || 'lead',
      });
    }
  }, [initialData]);

  const isLinked = !!initialData?.linkedOfferId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('League name is required');
      return;
    }
    if (!formData.year || formData.year < 2000) {
      setError('A valid year is required');
      return;
    }

    try {
      await onSubmit({
        associationId,
        contactId: formData.contactId || null,
        name: formData.name,
        year: Number(formData.year),
        isYouth: formData.isYouth,
        estimatedTeamsCount: formData.estimatedTeamsCount || null,
        estimatedGamedaysCount: formData.estimatedGamedaysCount || null,
        comment: formData.comment,
        status: formData.status,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to save tracked league');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: '#dc3545', fontSize: '0.875rem' }}>{error}</div>}

      <div>
        <label htmlFor="tl-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>League Name *</label>
        <input
          id="tl-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          placeholder="Regionalliga Hessen"
          style={inputStyle}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="tl-year" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Year *</label>
          <input
            id="tl-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData((p) => ({ ...p, year: Number(e.target.value) }))}
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="tl-contact" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Contact</label>
          <select
            id="tl-contact"
            value={formData.contactId}
            onChange={(e) => setFormData((p) => ({ ...p, contactId: e.target.value }))}
            style={inputStyle}
            disabled={isLoading}
          >
            <option value="">— None —</option>
            {contacts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          checked={formData.isYouth}
          onChange={(e) => setFormData((p) => ({ ...p, isYouth: e.target.checked }))}
          disabled={isLoading}
        />
        Youth league
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="tl-teams" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Est. Teams</label>
          <input
            id="tl-teams"
            type="text"
            value={formData.estimatedTeamsCount}
            onChange={(e) => setFormData((p) => ({ ...p, estimatedTeamsCount: e.target.value }))}
            placeholder="~50"
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="tl-gamedays" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Est. Gamedays</label>
          <input
            id="tl-gamedays"
            type="text"
            value={formData.estimatedGamedaysCount}
            onChange={(e) => setFormData((p) => ({ ...p, estimatedGamedaysCount: e.target.value }))}
            placeholder="max. 6/Spieltag"
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tl-comment" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Comment</label>
        <textarea
          id="tl-comment"
          value={formData.comment}
          rows={3}
          onChange={(e) => setFormData((p) => ({ ...p, comment: e.target.value }))}
          style={inputStyle}
          disabled={isLoading}
        />
      </div>

      {isLinked ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Status is derived from the linked offer — edit it from the offer page.
        </div>
      ) : (
        <div>
          <label htmlFor="tl-status" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Status</label>
          <select
            id="tl-status"
            value={formData.status}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
            style={inputStyle}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update League' : 'Add League'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/client/components/__tests__/TrackedLeagueForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/client/components/TrackedLeagueForm.tsx src/client/components/__tests__/TrackedLeagueForm.test.tsx
git commit -m "feat: add TrackedLeagueForm component"
```

---

### Task 11: `TrackedLeagueList` component + wire into the detail page

**Files:**
- Create: `src/client/components/TrackedLeagueList.tsx`
- Test: `src/client/components/__tests__/TrackedLeagueList.test.tsx`
- Modify: `src/client/pages/AssociationDetailPage.tsx`

**Interfaces:**
- Consumes: `trpc.finance.trackedLeagues.{list,create,update,delete,crosscheck,linkToOffer}` (Task 7), `trpc.teams.seasons` (existing), `trpc.finance.offers.create` (existing), `TrackedLeagueForm` (Task 10).
- Produces: `TrackedLeagueList({ trackedLeagues, contacts, crosscheckSuggestions, onLink, onEdit, onDelete, onCreateOfferFromSelected })`.

- [ ] **Step 1: Write the failing test**

Create `src/client/components/__tests__/TrackedLeagueList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackedLeagueList } from '../TrackedLeagueList';

const contacts = [{ _id: 'contact-1', name: 'Michael Hanke' }];

const league = (over: Record<string, any> = {}) => ({
  _id: 'tl-1',
  contactId: 'contact-1',
  name: 'Regionalliga Hessen',
  year: 2026,
  isYouth: false,
  estimatedTeamsCount: null,
  estimatedGamedaysCount: null,
  comment: '',
  leaguesphereLeagueId: null,
  linkedOfferId: null,
  status: 'lead',
  effectiveStatus: { stage: 'lead' },
  ...over,
});

describe('TrackedLeagueList', () => {
  it('shows the empty state', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByText(/No tracked leagues yet/i)).toBeInTheDocument();
  });

  it('groups leagues by year and shows the effective status label', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[league({ year: 2026 }), league({ _id: 'tl-2', year: 2025, effectiveStatus: { stage: 'paid', offerId: 'o1' } })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('shows a crosscheck suggestion and links it on click', () => {
    const onLink = vi.fn();
    render(
      <TrackedLeagueList
        trackedLeagues={[league()]}
        contacts={contacts}
        crosscheckSuggestions={{ 'tl-1': [{ leaguesphereLeagueId: 16, name: 'Regionalliga Hessen', confidence: 'exact' }] }}
        onLink={onLink}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Link'));
    expect(onLink).toHaveBeenCalledWith('tl-1', 16);
  });

  it('disables selection for a league with no leaguesphereLeagueId, and enables it once linked', () => {
    const { rerender } = render(
      <TrackedLeagueList
        trackedLeagues={[league()]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).toBeDisabled();

    rerender(
      <TrackedLeagueList
        trackedLeagues={[league({ leaguesphereLeagueId: 16 })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('calls onCreateOfferFromSelected with the selection once a linked league is checked', () => {
    const onCreateOfferFromSelected = vi.fn();
    render(
      <TrackedLeagueList
        trackedLeagues={[league({ leaguesphereLeagueId: 16 })]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={onCreateOfferFromSelected}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText(/Create Offer from Selected/i));

    expect(onCreateOfferFromSelected).toHaveBeenCalledWith({
      ids: ['tl-1'],
      contactId: 'contact-1',
      year: 2026,
      leaguesphereLeagueIds: [16],
    });
  });

  it('shows a validation error instead of allowing submission when years differ', () => {
    render(
      <TrackedLeagueList
        trackedLeagues={[
          league({ leaguesphereLeagueId: 16, year: 2026 }),
          league({ _id: 'tl-2', leaguesphereLeagueId: 17, year: 2025 }),
        ]}
        contacts={contacts}
        crosscheckSuggestions={{}}
        onLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreateOfferFromSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(screen.getByText(/must all be from the same year/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Offer from Selected/i)).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/client/components/__tests__/TrackedLeagueList.test.tsx`
Expected: FAIL — cannot find module `../TrackedLeagueList`

- [ ] **Step 3: Implement the component**

Create `src/client/components/TrackedLeagueList.tsx`:

```tsx
import { useMemo, useState } from 'react';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  offer_in_progress: 'Offer in progress',
  rejected_pre_offer: 'Rejected (pre-offer)',
  closed_historical: 'Closed (historical)',
  offer_draft: 'Offer draft',
  offer_awaiting_decision: 'Awaiting decision',
  offer_rejected: 'Rejected',
  accepted_awaiting_invoice: 'Accepted, awaiting invoice',
  invoiced_unpaid: 'Invoiced, unpaid',
  paid: 'Paid',
};

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  lead: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  contacted: { bg: '#eff6ff', color: '#0369a1' },
  offer_in_progress: { bg: '#fff7ed', color: '#c2410c' },
  rejected_pre_offer: { bg: '#fef2f2', color: '#b91c1c' },
  closed_historical: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  offer_draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
  offer_awaiting_decision: { bg: '#eff6ff', color: '#0369a1' },
  offer_rejected: { bg: '#fef2f2', color: '#b91c1c' },
  accepted_awaiting_invoice: { bg: '#fff7ed', color: '#c2410c' },
  invoiced_unpaid: { bg: '#fff7ed', color: '#c2410c' },
  paid: { bg: '#ecfdf5', color: 'var(--success-color)' },
};

export interface TrackedLeagueRow {
  _id: string;
  contactId: string | null;
  name: string;
  year: number;
  isYouth: boolean;
  estimatedTeamsCount: string | null;
  estimatedGamedaysCount: string | null;
  comment: string;
  leaguesphereLeagueId: number | null;
  linkedOfferId: string | null;
  status: string;
  effectiveStatus: { stage: string; offerId?: string };
}

export interface CrosscheckCandidate {
  leaguesphereLeagueId: number;
  name: string;
  confidence: 'exact' | 'partial';
}

export interface TrackedLeagueListProps {
  trackedLeagues: TrackedLeagueRow[];
  contacts: { _id: string; name: string }[];
  crosscheckSuggestions: Record<string, CrosscheckCandidate[]>;
  onLink: (trackedLeagueId: string, leaguesphereLeagueId: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateOfferFromSelected: (selection: { ids: string[]; contactId: string; year: number; leaguesphereLeagueIds: number[] }) => void;
}

export function TrackedLeagueList({
  trackedLeagues, contacts, crosscheckSuggestions, onLink, onEdit, onDelete, onCreateOfferFromSelected,
}: TrackedLeagueListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const contactName = (id: string | null) => contacts.find((c) => c._id === id)?.name || '—';

  const byYear = useMemo(() => {
    const groups = new Map<number, TrackedLeagueRow[]>();
    for (const league of trackedLeagues) {
      const list = groups.get(league.year) || [];
      list.push(league);
      groups.set(league.year, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [trackedLeagues]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedLeagues = trackedLeagues.filter((l) => selected.has(l._id));

  const selectionError = useMemo(() => {
    if (selectedLeagues.length === 0) return null;
    if (selectedLeagues.some((l) => !l.leaguesphereLeagueId)) {
      return 'Every selected league must be linked to a real leaguesphere league first.';
    }
    const years = new Set(selectedLeagues.map((l) => l.year));
    if (years.size > 1) return 'Selected leagues must all be from the same year.';
    const contactIds = new Set(selectedLeagues.map((l) => l.contactId));
    if (contactIds.has(null) || contactIds.size > 1) return 'Selected leagues must all share the same contact.';
    return null;
  }, [selectedLeagues]);

  if (trackedLeagues.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        No tracked leagues yet.
      </div>
    );
  }

  return (
    <div>
      {byYear.map(([year, leagues]) => (
        <div key={year} style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', margin: '0 0 var(--spacing-sm) 0' }}>{year}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                <th></th>
                <th>League</th>
                <th>Contact</th>
                <th>Teams / Gamedays</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league) => {
                const stageStyle = STAGE_COLORS[league.effectiveStatus.stage] || STAGE_COLORS.lead;
                const suggestions = crosscheckSuggestions[league._id] || [];
                return (
                  <tr key={league._id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(league._id)}
                        onChange={() => toggleSelected(league._id)}
                        disabled={!league.leaguesphereLeagueId}
                        title={!league.leaguesphereLeagueId ? 'Link to a leaguesphere league first' : undefined}
                      />
                    </td>
                    <td onClick={() => onEdit(league._id)} style={{ cursor: 'pointer' }}>
                      {league.name} {league.isYouth && <span title="Youth league">🧒</span>}
                      {!league.leaguesphereLeagueId && suggestions.length > 0 && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Matches <strong>{suggestions[0].name}</strong> —{' '}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 0, minHeight: 'auto' }}
                            onClick={(e) => { e.stopPropagation(); onLink(league._id, suggestions[0].leaguesphereLeagueId); }}
                          >
                            Link
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{contactName(league.contactId)}</td>
                    <td>{league.estimatedTeamsCount || '—'} / {league.estimatedGamedaysCount || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--border-radius-md)',
                        fontSize: 'var(--font-size-xs)', background: stageStyle.bg, color: stageStyle.color,
                      }}>
                        {STAGE_LABELS[league.effectiveStatus.stage] || league.effectiveStatus.stage}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => onDelete(league._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {selected.size > 0 && (
        <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          {selectionError && <div style={{ color: '#dc3545', fontSize: 'var(--font-size-sm)' }}>{selectionError}</div>}
          <button
            className="btn btn-primary"
            disabled={!!selectionError}
            onClick={() => {
              onCreateOfferFromSelected({
                ids: selectedLeagues.map((l) => l._id),
                contactId: selectedLeagues[0].contactId!,
                year: selectedLeagues[0].year,
                leaguesphereLeagueIds: selectedLeagues.map((l) => l.leaguesphereLeagueId!),
              });
              setSelected(new Set());
            }}
          >
            Create Offer from Selected ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/client/components/__tests__/TrackedLeagueList.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire it into `AssociationDetailPage.tsx`**

In `src/client/pages/AssociationDetailPage.tsx`, add imports:

```ts
import { useMemo, useState } from 'react';
```
(replacing the existing `import { useState } from 'react';`)
```ts
import { TrackedLeagueForm } from '../components/TrackedLeagueForm';
import { TrackedLeagueList } from '../components/TrackedLeagueList';
```

Add a `leagueModal` state next to `contactModal`:

```ts
  const [leagueModal, setLeagueModal] = useState<{ mode: 'create' } | { mode: 'edit'; id: string } | null>(null);
```

Add the data hooks and mutations, after the existing contact queries/mutations:

```ts
  const { data: trackedLeagues = [], refetch: refetchLeagues } = trpc.finance.trackedLeagues.list.useQuery(
    { associationId: id! },
    { enabled: !!id }
  );
  const { data: seasons = [] } = trpc.teams.seasons.useQuery();

  const distinctYears = useMemo(
    () => Array.from(new Set(trackedLeagues.filter((l: any) => !l.leaguesphereLeagueId).map((l: any) => l.year))),
    [trackedLeagues]
  );
  const { data: crosscheckSuggestions = {} } = trpc.finance.trackedLeagues.crosscheck.useQuery(
    { associationId: id!, years: distinctYears as number[] },
    { enabled: !!id && distinctYears.length > 0 }
  );

  const createLeague = trpc.finance.trackedLeagues.create.useMutation({
    onSuccess: () => { setLeagueModal(null); refetchLeagues(); },
  });
  const updateLeague = trpc.finance.trackedLeagues.update.useMutation({
    onSuccess: () => { setLeagueModal(null); refetchLeagues(); },
  });
  const deleteLeague = trpc.finance.trackedLeagues.delete.useMutation({
    onSuccess: () => refetchLeagues(),
  });
  const linkToOffer = trpc.finance.trackedLeagues.linkToOffer.useMutation({
    onSuccess: () => refetchLeagues(),
  });
  const createOffer = trpc.finance.offers.create.useMutation();
```

Add the `activeLeague` lookup next to `activeContact`:

```ts
  const activeLeague = leagueModal?.mode === 'edit'
    ? trackedLeagues.find((l: any) => l._id === leagueModal.id)
    : undefined;
```

Add the handlers, after `handleContactSubmit`:

```ts
  async function handleLeagueSubmit(data: any) {
    if (leagueModal?.mode === 'edit') {
      await updateLeague.mutateAsync({ id: leagueModal.id, data });
    } else {
      await createLeague.mutateAsync(data);
    }
  }

  async function handleCreateOfferFromSelected(selection: { ids: string[]; contactId: string; year: number; leaguesphereLeagueIds: number[] }) {
    const season = seasons.find((s: any) => Number(s.name) === selection.year);
    if (!season) {
      setToast({ message: `No leaguesphere season found for ${selection.year}.`, type: 'error' });
      return;
    }
    try {
      const offer = await createOffer.mutateAsync({
        associationId: id!,
        contactId: selection.contactId,
        seasonId: season.id,
        leagueIds: selection.leaguesphereLeagueIds,
        costModel: 'flatFee',
        expectedTeamsCount: 0,
      });
      await linkToOffer.mutateAsync({ ids: selection.ids, offerId: offer._id });
      navigate(`/offers/${offer._id}/edit`);
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to create offer', type: 'error' });
    }
  }
```

Add the Tracked Leagues section in the JSX, right after the closing `</section>` of the Contacts section:

```tsx
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Tracked Leagues</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setLeagueModal({ mode: 'create' })}>
            + Add Tracked League
          </button>
        </div>
        <TrackedLeagueList
          trackedLeagues={trackedLeagues}
          contacts={contacts}
          crosscheckSuggestions={crosscheckSuggestions}
          onLink={(leagueId, leaguesphereLeagueId) => updateLeague.mutate({ id: leagueId, data: { leaguesphereLeagueId } })}
          onEdit={(lid) => setLeagueModal({ mode: 'edit', id: lid })}
          onDelete={(lid) => deleteLeague.mutate({ id: lid })}
          onCreateOfferFromSelected={handleCreateOfferFromSelected}
        />
      </section>
```

Add the league modal, right after the contact modal's closing `)}`:

```tsx
      {leagueModal && (
        <div
          onClick={() => setLeagueModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: '1rem', backdropFilter: 'blur(2px)',
          }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                {leagueModal.mode === 'create' ? 'Add Tracked League' : 'Edit Tracked League'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setLeagueModal(null)}>✕</button>
            </div>
            <TrackedLeagueForm
              initialData={activeLeague}
              associationId={id!}
              contacts={contacts}
              onSubmit={handleLeagueSubmit}
              onCancel={() => setLeagueModal(null)}
              isLoading={createLeague.isPending || updateLeague.isPending}
            />
          </div>
        </div>
      )}
```

- [ ] **Step 6: Typecheck and run the client test suite**

Run: `npm run typecheck && npm run test -- src/client`
Expected: PASS, no type errors

- [ ] **Step 7: Manually verify in the dev server**

Run: `npm run dev`. On an association's detail page: add a tracked league for a year/name that matches a real leaguesphere league in your dev DB, confirm the "Matches … — Link" hint appears and linking it sets a real league id; select it (after linking) plus a shared contact and click "Create Offer from Selected"; confirm it creates a draft `Offer`, links the tracked league, and navigates to `/offers/:id/edit`. Then try selecting two tracked leagues from different years and confirm the validation message blocks submission.

- [ ] **Step 8: Commit**

```bash
git add src/client/components/TrackedLeagueList.tsx src/client/components/__tests__/TrackedLeagueList.test.tsx src/client/pages/AssociationDetailPage.tsx
git commit -m "feat: add TrackedLeagueList and wire tracked leagues into the Association detail page"
```

---

### Task 12: One-time import migration

**Files:**
- Create: `src/server/db/migrations/004-import-tracked-leagues.js`

**Interfaces:**
- Consumes: `gamedays_association` (MySQL), `associations`/`contacts`/`trackedleagues` (raw Mongo collections — Mongoose pluralizes `TrackedLeague` to `trackedleagues`).

- [ ] **Step 1: Write the migration**

Create `src/server/db/migrations/004-import-tracked-leagues.js`:

```js
/**
 * Migration: Import the "Tracker Kontakte Ligen" sheet into
 * associations / contacts / trackedleagues.
 *
 * Idempotent: re-running skips any association/contact already created by
 * a previous run (matched by name) and any tracked league already present
 * for the same associationId + name + year.
 *
 * Set DRY_RUN=true to log intended writes without applying them.
 */
const mongoose = require('mongoose');
const { getMysqlPool } = require('../mysql');

const DRY_RUN = process.env.DRY_RUN === 'true';

// [{ label: the sheet's "Verband" column, contacts: sheet's "Kontakt" column split on '/',
//    leagues: [{ name, year, isYouth, estimatedTeamsCount, estimatedGamedaysCount, status, comment, contact }] }]
const GROUPS = [
  {
    label: 'AFVBy',
    contacts: ['Niko Tzioras', 'Lynn Hoffer'],
    leagues: [
      {
        name: 'Regionalliga + Bayernliga (Erwachsene)', year: 2025, isYouth: false,
        estimatedTeamsCount: '6', estimatedGamedaysCount: '21', status: 'closed_historical',
        comment: '180€ RL (6 Spieltage/6 Teams) + 450€ Bayernliga (15 Spieltage/6 Teams), 50% Rabatt 1. Saison. Vertrag+AVV unterschrieben, bezahlt. Preis: 630€ netto. Rechnung gestellt 23.03.2025 – keine Zahlungsbestätigung in Mails gefunden.',
        contact: 'Niko Tzioras',
      },
      {
        name: 'Bayern Ligen (teambasiert)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Erstangebot (Lizenzgebühr-Logik, 100€/Verein) abgelehnt, angepasstes teambasiertes Angebot angenommen 13.04.2026. Rechnung 29.05.2026, bezahlt 09.08.2026 ("Die Zahlung ist bei uns eingegangen"). Betrag nur im PDF-Angebot dokumentiert.',
        contact: 'Niko Tzioras',
      },
    ],
  },
  {
    label: 'AFVH',
    contacts: ['Michael Hanke'],
    leagues: [
      {
        name: 'Regionalliga Hessen (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Angebot 08.04.2026, abgelehnt weil kein Budget geplant war. Keine Antwort auf Angebot gefunden.',
        contact: 'Michael Hanke',
      },
      {
        name: 'U16 Hessen (Jugend)', year: 2027, isYouth: true,
        estimatedTeamsCount: '16', estimatedGamedaysCount: null, status: 'lead',
        comment: 'Einfach mal für 2027 aufgenommen.',
        contact: 'Michael Hanke',
      },
    ],
  },
  {
    label: 'AFVD',
    contacts: ['Max Keneder'],
    leagues: [
      {
        name: 'DFFL (Bundesliga)', year: 2026, isYouth: false,
        estimatedTeamsCount: '16', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFL2 (Bundesliga 2)', year: 2026, isYouth: false,
        estimatedTeamsCount: '20', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFLF (Bundesliga Frauen)', year: 2026, isYouth: false,
        estimatedTeamsCount: '10', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFLF2 (Bundesliga Frauen)', year: 2027, isYouth: false,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'lead',
        comment: 'Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF/DFFLF2. Kein Angebot gemacht.',
        contact: 'Max Keneder',
      },
    ],
  },
  {
    label: 'AFCVNRW',
    contacts: ['Fabian Pawlowski'],
    leagues: [
      {
        name: 'Regionalliga NRW (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '12', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden. Fabian schlug 40–50% der Vereins-Lizenzgebühr vor (~1.740–2.175€ für alle NRW-Ligen zusammen).',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'Oberliga NRW (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '17', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U10 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '6', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U13 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '11', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U16 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
    ],
  },
  {
    label: 'Spielverbund Ost', // virtual: AFCVBB, AFVS, AFVSA, AFCVTH, AFCV-MV
    contacts: ['Chris Claussen', 'Melik Seelig', 'Julian Schickfluss'],
    leagues: [
      {
        name: 'Oberliga Ost (5er DFFL)', year: 2026, isYouth: false,
        estimatedTeamsCount: 'max. 6/Spieltag', estimatedGamedaysCount: '20', status: 'closed_historical',
        comment: 'Digitaler Passcheck inklusive. Angebot 21.08.2025 (korrigiert), angenommen 03.11.2025. Vertrag von allen 5 Landesverbänden zu unterschreiben; AFVS-Vertrag unterschrieben zurückgesandt (Jan 2026). Keine Rechnungs-/Zahlungsmail gefunden.',
        contact: 'Chris Claussen',
      },
    ],
  },
  {
    label: 'AFCVBB',
    contacts: [],
    leagues: [
      {
        name: 'Jugendligen U10/U13/U16 (Ober-/Landesliga)', year: 2027, isYouth: true,
        estimatedTeamsCount: '~50 (U10:15, U13:20, U16:15)', estimatedGamedaysCount: '~5 je Liga', status: 'offer_in_progress',
        comment: 'Je Altersklasse 2 Ligen (Oberliga+Landesliga). Anfrage 03.08.2026; 13€/Team genannt (650€, Richtwert), offizielles PDF-Angebot noch ausständig. Preisindikation 09.08.2026, ausstehend.',
        contact: 'Chris Claussen',
      },
    ],
  },
  {
    label: 'AFCV Rheinland-Pfalz',
    contacts: ['Markus Krüger'],
    leagues: [
      {
        name: 'Regionalliga (Senioren) RLP', year: 2026, isYouth: false,
        estimatedTeamsCount: '4', estimatedGamedaysCount: '~20 (vorläufig)', status: 'offer_in_progress',
        comment: '9€/Spieltag/Team Basispreis, halber Preis für Jugend-Teams → 36€/Spieltag bei 4 Teams, Gesamtsumme noch offen. In Vorbereitung (28.01.2026), Spielplan stand noch nicht final fest.',
        contact: 'Markus Krüger',
      },
    ],
  },
  {
    label: 'AFCV Mecklenburg-Vorpommern',
    contacts: ['Andreas Hantschmann'],
    leagues: [
      {
        name: 'Jugendflagliga MV', year: 2025, isYouth: true,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'lead',
        comment: 'Anfrage zur Nutzung der Scorecard-App im Jugendbereich. Nur Termin (06.02.2025) dokumentiert, kein Abschluss auffindbar.',
        contact: 'Andreas Hantschmann',
      },
    ],
  },
  {
    label: 'AFCVBW',
    contacts: ['Kerstin Nittel'],
    leagues: [
      {
        name: 'AFCVBW (allgemein)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Interesse über Discord signalisiert -> wohl selber gelöst über Gameday? Nur Infomail verschickt (09.01.2026), keine konkrete Anfrage/Zahlen.',
        contact: 'Kerstin Nittel',
      },
    ],
  },
  {
    label: 'Spielverbund Ost',
    contacts: ['Flavio Kleinwächter'],
    leagues: [
      {
        name: 'Spielverbund Ost (allgemein)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Interesse über Discord signalisiert -> gehört zu Melik. Nur Infomail verschickt (09.01.2026), keine konkrete Anfrage/Zahlen.',
        contact: 'Flavio Kleinwächter',
      },
    ],
  },
  {
    label: 'Spielverbund Nord', // virtual: AFCVHH, AFCVN, AFCV Nord (Bremen), AFCVSH
    contacts: [],
    leagues: [
      {
        name: 'Jugend + Erwachsene', year: 2026, isYouth: true,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Haben ihre eigene leaguesphere Instanz.',
        contact: null,
      },
    ],
  },
];

const VIRTUAL_LABELS = new Set(['Spielverbund Ost', 'Spielverbund Nord']);

async function resolveLeaguesphereAssociation(pool, label) {
  if (VIRTUAL_LABELS.has(label)) return null;
  const [rows] = await pool.query(
    'SELECT id, abbr, name FROM gamedays_association WHERE abbr = ? OR name LIKE ? LIMIT 1',
    [label, `%${label}%`]
  );
  return rows[0] || null;
}

async function up() {
  const db = mongoose.connection.db;
  const associationCollection = db.collection('associations');
  const contactCollection = db.collection('contacts');
  const trackedLeagueCollection = db.collection('trackedleagues');

  const pool = getMysqlPool();

  const contactIdByName = new Map(); // dedupe contacts globally by name (e.g. Chris Claussen appears twice)
  let createdAssociations = 0, createdContacts = 0, createdLeagues = 0, skippedLeagues = 0;

  for (const group of GROUPS) {
    const leaguesphereMatch = await resolveLeaguesphereAssociation(pool, group.label);
    const associationName = leaguesphereMatch ? leaguesphereMatch.name : group.label;

    let association = await associationCollection.findOne({ name: associationName });
    if (!association) {
      const doc = {
        name: associationName,
        address: { street: '', city: '', postalCode: '', country: '' },
        leaguesphereAssociationId: leaguesphereMatch ? leaguesphereMatch.id : null,
        customerNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} association: ${associationName}${leaguesphereMatch ? ` (leaguesphere id ${leaguesphereMatch.id})` : ' (virtual — no leaguesphere match found, review manually)'}`);
      if (!DRY_RUN) {
        const result = await associationCollection.insertOne(doc);
        association = { _id: result.insertedId, ...doc };
      } else {
        association = { _id: `dry-run-${associationName}`, ...doc };
      }
      createdAssociations++;
    }

    for (const contactName of group.contacts) {
      if (contactIdByName.has(contactName)) continue;

      let contact = await contactCollection.findOne({ name: contactName });
      if (!contact) {
        const doc = {
          name: contactName,
          email: '', // sheet has no email addresses — backfill manually
          phone: '',
          associationId: association._id.toString(),
          address: { street: '', city: '', postalCode: '', country: '' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} contact: ${contactName} (associationId: ${associationName}) — NO EMAIL, backfill manually`);
        if (!DRY_RUN) {
          const result = await contactCollection.insertOne(doc);
          contact = { _id: result.insertedId, ...doc };
        } else {
          contact = { _id: `dry-run-${contactName}`, ...doc };
        }
        createdContacts++;
      }
      contactIdByName.set(contactName, contact._id);
    }

    for (const league of group.leagues) {
      const exists = await trackedLeagueCollection.findOne({
        associationId: association._id.toString(),
        name: league.name,
        year: league.year,
      });
      if (exists) {
        skippedLeagues++;
        continue;
      }

      const contactId = league.contact ? contactIdByName.get(league.contact) || null : null;
      const doc = {
        associationId: association._id.toString(),
        contactId: contactId,
        name: league.name,
        year: league.year,
        isYouth: league.isYouth,
        estimatedTeamsCount: league.estimatedTeamsCount,
        estimatedGamedaysCount: league.estimatedGamedaysCount,
        comment: league.comment,
        leaguesphereLeagueId: null,
        linkedOfferId: null,
        status: league.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} tracked league: ${league.name} (${league.year}) for ${associationName} — status ${league.status}`);
      if (!DRY_RUN) {
        await trackedLeagueCollection.insertOne(doc);
      }
      createdLeagues++;
    }
  }

  console.log(`\n✓ ${DRY_RUN ? '[dry-run] would create' : 'Created'} ${createdAssociations} associations, ${createdContacts} contacts, ${createdLeagues} tracked leagues (${skippedLeagues} already existed and were skipped).`);
}

async function down() {
  const db = mongoose.connection.db;
  const trackedLeagueCollection = db.collection('trackedleagues');

  const names = GROUPS.flatMap((g) => g.leagues.map((l) => l.name));
  const result = await trackedLeagueCollection.deleteMany({ name: { $in: names } });
  console.log(`✓ Removed ${result.deletedCount} imported tracked leagues. Associations and contacts created by this migration were left in place — remove them manually if desired.`);
}

module.exports = { up, down };
```

- [ ] **Step 2: Dry-run on the test environment**

Per this repo's infrastructure policy, this touches production association/contact data and must be verified on the test environment first. On `servyy-test.lxd` (or the local dev environment pointed at a copy of the test DB):

```bash
npm run build
DRY_RUN=true npm run migrate
```

Expected: log output listing every association/contact/tracked-league it would create, with no `insertOne` calls executed. Review the logged associations for any marked "virtual — no leaguesphere match found, review manually" that should have matched (fix the `GROUPS` label or `resolveLeaguesphereAssociation`'s query if a real association was missed).

- [ ] **Step 3: Run it for real on the test environment**

```bash
npm run migrate
```

Expected: `✓ Created N associations, M contacts, K tracked leagues (0 already existed and were skipped).` Manually spot-check a few created associations/contacts/tracked leagues in the test database.

- [ ] **Step 4: Re-run to confirm idempotency**

```bash
npm run migrate
```

Expected: `✓ Created 0 associations, 0 contacts, 0 tracked leagues (K already existed and were skipped).`

- [ ] **Step 5: Run on production**

Only after Steps 2-4 pass on the test environment: run the same `npm run build && npm run migrate` against production, per this repo's mandatory test-first deployment policy. Confirm the created records in the production Associations/Contacts/detail pages, then retire the "Tracker Kontakte Ligen" sheet.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/migrations/004-import-tracked-leagues.js
git commit -m "feat: import Tracker Kontakte Ligen sheet into tracked leagues"
```

---

## Follow-ups (explicitly out of scope for this plan)

- No e2e Playwright spec was added for the new Association detail page flow — the existing repo doesn't have one per page either; add one under `e2e/` if the team wants end-to-end coverage of this flow specifically.
- The `markRejected` action is only exposed for offers in `sent` status via a plain button; no confirmation dialog was added (matches the existing `markAccepted` UX, which also has none).
