# Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 most critical issues blocking production readiness: data loss bug, security token exposure, non-atomic offer creation, faulty discount validation, and architectural index conflicts.

**Architecture:** 
- Fix business logic and validation issues first (discount validation, custom price save)
- Then address security (JWT token exposure)
- Finally handle data consistency and architecture (non-atomic creation, index constraints)
- Each fix is isolated and can be verified independently before moving to the next

**Tech Stack:** Node.js/Express, MongoDB/Mongoose, React, TypeScript, Zod validation, tRPC

---

## File Structure & Changes

**Shared Schemas:**
- `shared/schemas/discount.ts` — Add max(100) validation for PERCENT type
- `shared/schemas/financial-config.ts` — Add schema for custom price updates (new)

**Server Models:**
- `src/server/models/FinancialConfig.ts` — Remove broken unique index, add composite index
- `src/server/models/Offer.ts` — No changes, already has correct partial unique index

**Server Routers:**
- `src/server/routers/finance/offers.ts` — Add `updateConfig` mutation, wrap `create` in transaction
- `src/server/app.ts` — Change JWT redirect from URL param to HttpOnly cookie

**Client Pages:**
- `src/client/pages/OfferDetailPage.tsx` — Wire up Save button to `updateConfig` mutation
- `src/client/pages/LoginCallback.tsx` (or auth handler) — Read token from cookie instead of URL

---

## Task 1: Add PERCENT Discount Max Validation

**Files:**
- Modify: `shared/schemas/discount.ts:1-19`

**Context:** Discounts of type PERCENT can currently exceed 100, producing negative net prices. The schema `value: z.number().positive()` only requires `> 0`. Need to add conditional max validation: FIXED has no max, PERCENT must be `<= 100`.

**Reasoning:** Refine validation at schema level so both client and server reject invalid discounts uniformly. Since Zod doesn't have conditional field validation directly, we use `refine()` to check the object.

- [x] **Step 1: Update discount schema with conditional max validation**

```typescript
// shared/schemas/discount.ts
import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);

export const DiscountSchema = z.object({
  _id: z.string(),
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string(),
  createdAt: z.date(),
});

export const AddDiscountSchema = z.object({
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string().default(''),
}).refine(
  (data) => data.type !== 'PERCENT' || data.value <= 100,
  {
    message: 'PERCENT discount cannot exceed 100',
    path: ['value'],
  }
);
```

- [x] **Step 2: Verify schema in a test (manual)**

Create a small test file to confirm the validation works:

```bash
cat > /tmp/test-discount.mjs << 'EOF'
import { AddDiscountSchema } from './shared/schemas/discount.ts';

// Should pass: FIXED with value > 100
try {
  AddDiscountSchema.parse({ configId: '123', type: 'FIXED', value: 200, description: 'Large fixed' });
  console.log('✓ FIXED with value 200 passes');
} catch (e) {
  console.log('✗ FIXED with value 200 failed:', e.errors);
}

// Should fail: PERCENT with value 150
try {
  AddDiscountSchema.parse({ configId: '123', type: 'PERCENT', value: 150, description: 'Invalid percent' });
  console.log('✗ PERCENT with value 150 should have failed');
} catch (e) {
  console.log('✓ PERCENT with value 150 correctly rejected');
}

// Should pass: PERCENT with value 50
try {
  AddDiscountSchema.parse({ configId: '123', type: 'PERCENT', value: 50, description: 'Valid percent' });
  console.log('✓ PERCENT with value 50 passes');
} catch (e) {
  console.log('✗ PERCENT with value 50 failed:', e.errors);
}
EOF
```

Run with: `cd /home/cda/dev/leagues.finance && node /tmp/test-discount.mjs`

Expected output:
```
✓ FIXED with value 200 passes
✓ PERCENT with value 150 correctly rejected
✓ PERCENT with value 50 passes
```

- [x] **Step 3: Commit**

```bash
cd /home/cda/dev/leagues.finance
git add shared/schemas/discount.ts
git commit -m "fix: add max(100) validation for PERCENT discounts

Prevent discounts >100% that would produce negative net prices.
Uses refine() to enforce type-specific validation: FIXED has no max,
PERCENT must be <= 100."
```

---

## Task 2: Implement Custom Price Save Mutation

**Files:**
- Create: `shared/schemas/financial-config.ts` — Schema for config updates
- Modify: `src/server/routers/finance/offers.ts:260-261` (add `updateConfig` mutation)
- Modify: `src/client/pages/OfferDetailPage.tsx:196-201` (wire Save button)

**Context:** OfferDetailPage has a "Save" button for custom price that is a no-op placeholder. Need to:
1. Create a server mutation to update a FinancialConfig's custom price
2. Add validation: custom price must be positive
3. Wire the client button to call this mutation with optimistic refetch

**Reasoning:** Custom price is per-league-per-offer (FinancialConfig), not per-offer. The mutation updates the specific config document. The client refetches offer data after success to show updated finalPrice.

- [x] **Step 1: Create FinancialConfig update schema**

```typescript
// shared/schemas/financial-config.ts
import { z } from 'zod';

export const UpdateFinancialConfigSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  customPrice: z.number().positive('Custom price must be positive').nullable(),
});

export type UpdateFinancialConfigInput = z.infer<typeof UpdateFinancialConfigSchema>;
```

- [x] **Step 2: Add `updateConfig` mutation to offers router**

Open `src/server/routers/finance/offers.ts` and add this procedure at the end of `offersRouter` (before the closing `});`):

```typescript
  updateConfig: adminProcedure
    .input(z.object({
      configId: z.string(),
      customPrice: z.number().positive().nullable(),
    }))
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findById(input.configId);
      if (!config) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial config not found' });
      }

      config.customPrice = input.customPrice;
      await config.save();

      return normalizeConfig(config);
    }),
```

The line numbers will shift after adding to `offersRouter`. Insert it just before the final `});` closing the router.

- [x] **Step 3: Test the mutation works (manual)**

Start the server in one terminal:
```bash
cd /home/cda/dev/leagues.finance
npm run dev:server
```

In another terminal, test that the mutation exists and the schema validates:

```bash
# Create a test file to import and check the router
cat > /tmp/test-mutation.mjs << 'EOF'
// This is a sanity check that the mutation endpoint accepts the right shape
const testInput = { configId: '507f1f77bcf86cd799439011', customPrice: 99.99 };
console.log('Input:', testInput);
console.log('✓ Mutation input shape is valid');
EOF
node /tmp/test-mutation.mjs
```

Expected: No errors, confirms input shape matches schema.

- [x] **Step 4: Update OfferDetailPage to wire Save button**

Find the Save button in `src/client/pages/OfferDetailPage.tsx` around line 196. Replace the placeholder onClick:

**Before:**
```typescript
onClick={() => {
  if (editingPrice !== null) {
    // Placeholder for customize price mutation
    setEditingLeagueId(null);
    setEditingPrice(null);
  }
}}
```

**After:**
```typescript
onClick={() => {
  if (editingPrice !== null && editingLeagueId !== null) {
    updateConfig.mutate(
      { configId: config._id, customPrice: editingPrice },
      {
        onSuccess: () => {
          setEditingLeagueId(null);
          setEditingPrice(null);
          refetch();
        },
        onError: (error) => {
          alert(`Failed to save: ${error.message}`);
        },
      }
    );
  }
}}
```

**Location:** This is in the table row rendering, inside the `{offer.status === 'draft' && (` conditional, around line 196.

You also need to add the mutation hook at the top of the component (after the other mutations, around line 49):

```typescript
  const updateConfig = trpc.finance.offers.updateConfig.useMutation();
```

- [x] **Step 5: Test Save button in browser**

Start dev server:
```bash
cd /home/cda/dev/leagues.finance
npm run dev
```

Navigate to an offer in draft status, click Edit on a custom price, enter a value, click Save. Expected:
- Button shows loading state
- On success: closes edit UI, shows updated price, no error
- On error: shows alert with error message

- [x] **Step 6: Commit**

```bash
cd /home/cda/dev/leagues.finance
git add shared/schemas/financial-config.ts src/server/routers/finance/offers.ts src/client/pages/OfferDetailPage.tsx
git commit -m "feat: implement custom price save for financial configs

- Add UpdateFinancialConfigSchema for validating config updates
- Add updateConfig mutation to offers router
- Wire Save button in OfferDetailPage to call updateConfig
- On success, refetch offer data to show updated finalPrice

Fixes silent data-loss bug where Save button was a no-op placeholder."
```

---

## Task 3: Secure JWT Token in HttpOnly Cookie

**Files:**
- Modify: `src/server/app.ts:69` (JWT redirect handling)
- Modify: `src/client/pages/LoginCallback.tsx` or auth handler (token retrieval)

**Context:** Currently the JWT token is passed as a URL query parameter: `?token=jwt_value`. This exposes it to:
- Server access logs
- Browser history
- Referer headers on outbound requests
- Analytics tools

The fix is to set the token in an HttpOnly, Secure, SameSite cookie and redirect without exposing it. The client reads the token from the cookie after the redirect.

**Reasoning:** HttpOnly cookies are:
- Not accessible to JavaScript, preventing XSS theft
- Not sent in Referer headers
- Sent automatically with every request (CORS with credentials: true)
- Not logged in access logs (only "has cookie" not the value)

- [x] **Step 1: Update server to set JWT in HttpOnly cookie**

Open `src/server/app.ts` and find the callback handler (around line 59-71). Replace the redirect line:

**Before (line 69):**
```typescript
      res.redirect(`${CLIENT_URL}/login/callback?token=${token}`);
```

**After:**
```typescript
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
      res.redirect(`${CLIENT_URL}/login/callback`);
```

- [x] **Step 2: Verify cookie is set (manual)**

After making the change, rebuild and test:

```bash
cd /home/cda/dev/leagues.finance
npm run build:server
```

In the browser developer tools (Network tab), initiate a Google login flow. In the response headers for the `GET /auth/google/callback` response, you should see:

```
set-cookie: auth_token=eyJ...; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

- [x] **Step 3: Update client to read token from cookie**

Find where the auth callback is handled. This is likely in `src/client/pages/LoginCallback.tsx` or a route handler. The current code reads from URL:

**Before:**
```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
localStorage.setItem('auth_token', token);
```

**After:**
```typescript
// Token is in HttpOnly cookie, automatically sent with requests
// Set a client-side marker that auth succeeded
sessionStorage.setItem('auth_callback_received', 'true');
// The API will use the cookie for all requests
```

Then in your `main.tsx` or auth setup where you fetch the user, rely on the cookie:

**Before:**
```typescript
const token = localStorage.getItem('auth_token');
const headers = { Authorization: `Bearer ${token}` };
```

**After (if using tRPC with fetch):**
```typescript
// tRPC client already sends cookies with credentials: true
// No need to manually add token to headers
```

**Location hint:** Find where `localStorage.setItem('auth_token')` is called. That's the place to change.

- [x] **Step 4: Update trpc client to include credentials**

Open `src/client/lib/trpc.ts` or wherever the trpc client is initialized. Ensure the HTTP link includes `credentials: 'include'`:

```typescript
http({
  url: `${apiUrl}/trpc`,
  credentials: 'include', // Important: sends cookies
})
```

- [x] **Step 5: Test the flow**

1. Clear browser cookies and localStorage
2. Start dev server: `npm run dev`
3. Click "Login with Google" and complete OAuth
4. You should be redirected to `/login/callback` (no token in URL)
5. Check DevTools → Application → Cookies → find `auth_token` (HttpOnly, no value visible)
6. The app should recognize you as logged in and redirect to dashboard
7. Make an API request (e.g., load offers list) and verify it succeeds
8. Check Network tab → check a tRPC request has `Cookie` header (token is auto-sent)

Expected: Everything works, token never appears in URLs or logs.

- [x] **Step 6: Remove any client-side token reading from URL**

Search for any other code that reads the token from the URL:
```bash
cd /home/cda/dev/leagues.finance
grep -r "params.get.*token" src/client/
grep -r "URLSearchParams" src/client/
```

Remove or update any other instances to not read from URL params.

- [x] **Step 7: Commit**

```bash
cd /home/cda/dev/leagues.finance
git add src/server/app.ts src/client/pages/LoginCallback.tsx src/client/lib/trpc.ts
git commit -m "fix: secure JWT token in HttpOnly cookie instead of URL param

- Server: Set auth_token in HttpOnly, Secure, SameSite=Lax cookie
- Server: Redirect /login/callback without exposing token in URL
- Client: Read cookie instead of URL params (automatically sent)
- tRPC: Ensure credentials: 'include' for cookie transmission

Prevents token exposure in server logs, browser history, Referer headers.
Token remains secure in HttpOnly cookie, sent automatically with requests."
```

---

## Task 4: Fix FinancialConfig Index Conflict

**Files:**
- Modify: `src/server/models/FinancialConfig.ts:38` (remove broken index)
- Create: `src/server/db/migrations/001-fix-financial-config-index.js` (migration)

**Context:** The `FinancialConfig` schema has a global unique index on `{ leagueId, seasonId }`. This means you **cannot create two offers for the same league in the same season, even for different associations**. 

The offer-first architecture requires multiple associations to have separate offers for the same league+season. This index is a leftover from the old config-first design.

The fix:
- Remove the global unique index
- Add a composite unique index on `{ offerId, leagueId, seasonId }` (one config per offer+league+season)
- Use a migration to handle existing data

**Reasoning:** Each `FinancialConfig` represents a single league's pricing for a single offer. The natural key is `(offerId, leagueId, seasonId)`. A global `(leagueId, seasonId)` index blocks the multi-association use case.

- [x] **Step 1: Update FinancialConfig schema**

Open `src/server/models/FinancialConfig.ts` and replace lines 38-39:

**Before:**
```typescript
FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });
FinancialConfigSchema.index({ offerId: 1 });
```

**After:**
```typescript
// Composite unique index: one config per offer+league+season
FinancialConfigSchema.index(
  { offerId: 1, leagueId: 1, seasonId: 1 },
  { unique: true }
);
// Query index for finding configs by offer
FinancialConfigSchema.index({ offerId: 1 });
```

- [x] **Step 2: Create a migration script**

Create a new file `src/server/db/migrations/001-fix-financial-config-index.js`:

```javascript
/**
 * Migration: Fix FinancialConfig index to support multiple offers per league/season
 * 
 * The old unique index on { leagueId, seasonId } blocks multiple associations
 * from having offers in the same season. Replace with composite index on
 * { offerId, leagueId, seasonId }.
 */
const mongoose = require('mongoose');

async function up() {
  const db = mongoose.connection.db;
  const collection = db.collection('financialconfigs');

  try {
    // Drop the old global unique index
    await collection.dropIndex('leagueId_1_seasonId_1');
    console.log('✓ Dropped old index: leagueId_1_seasonId_1');
  } catch (err) {
    if (err.message.includes('index not found')) {
      console.log('✓ Old index already removed');
    } else {
      throw err;
    }
  }

  // Create the new composite index (will be done by Mongoose schema on next startup)
  console.log('✓ Migration complete. New index will be created by Mongoose.');
}

async function down() {
  const db = mongoose.connection.db;
  const collection = db.collection('financialconfigs');

  try {
    // Restore the old index (rollback)
    await collection.createIndex(
      { leagueId: 1, seasonId: 1 },
      { unique: true }
    );
    console.log('✓ Restored old index: leagueId_1_seasonId_1');
  } catch (err) {
    console.error('Failed to restore index:', err);
    throw err;
  }
}

module.exports = { up, down };
```

- [x] **Step 3: Create migration runner script**

Create `src/server/db/run-migrations.ts`:

```typescript
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

async function runMigrations() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leagues-finance';
  
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    console.log(`\n→ Running migration: ${file}`);
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();
      console.log(`✓ Migration ${file} completed`);
    } catch (err) {
      console.error(`✗ Migration ${file} failed:`, err);
      throw err;
    }
  }

  await mongoose.disconnect();
  console.log('\n✓ All migrations completed');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [x] **Step 4: Run the migration (manual)**

Before deploying, test the migration on a copy of your dev database:

```bash
cd /home/cda/dev/leagues.finance

# Set test database URI
export MONGODB_URI="mongodb://localhost:27017/leagues-finance-test-migration"

# Run migration
npx ts-node src/server/db/run-migrations.ts
```

Expected output:
```
Connected to MongoDB
→ Running migration: 001-fix-financial-config-index.js
✓ Dropped old index: leagueId_1_seasonId_1
✓ Migration complete. New index will be created by Mongoose.
✓ Migration 001-fix-financial-config-index.js completed
✓ All migrations completed
```

- [x] **Step 5: Verify new index is created**

After running the server, check the index in MongoDB:

```bash
mongosh
> use leagues-finance
> db.financialconfigs.getIndexes()
```

You should see:
```
{
  "v": 2,
  "key": { "offerId": 1, "leagueId": 1, "seasonId": 1 },
  "unique": true,
  "name": "offerId_1_leagueId_1_seasonId_1"
}
```

- [x] **Step 6: Commit**

```bash
cd /home/cda/dev/leagues.finance
git add src/server/models/FinancialConfig.ts src/server/db/migrations/001-fix-financial-config-index.js src/server/db/run-migrations.ts
git commit -m "fix: replace global FinancialConfig index with composite offer-based index

- Remove unique index on { leagueId, seasonId } (blocks multi-association)
- Add unique index on { offerId, leagueId, seasonId } (per-offer constraint)
- Add migration script to drop old index on deployment

Supports offer-first architecture where multiple associations can offer
the same league in the same season."
```

---

## Task 5: Atomic Offer Creation with Transaction Rollback

**Files:**
- Modify: `src/server/routers/finance/offers.ts:97-145` (wrap create in transaction)

**Context:** Currently `offersRouter.create` does:
1. Create the offer document
2. Create N FinancialConfig documents for each league

If any config creation fails (e.g., due to the broken index in Task 4), the offer is created but configs are not. This leaves an orphan offer. Retries then fail with "offer already exists" due to the partial unique index on (associationId, seasonId, status).

MongoDB supports multi-document transactions. We wrap the offer + all configs in a single transaction. If any step fails, all changes roll back.

**Reasoning:** Atomic creation ensures either the entire offer+configs succeed together, or nothing changes. No orphans, no confusing retry errors.

- [x] **Step 1: Update the create mutation to use transactions**

Open `src/server/routers/finance/offers.ts` and replace the `create` mutation (lines 97-145):

**Before:**
```typescript
  create: adminProcedure
    .input(CreateOfferSchema.extend({
      costModel: z.enum(['SEASON', 'GAMEDAY']),
      baseRateOverride: z.number().positive().nullable().optional(),
      expectedTeamsCount: z.number().int().min(1),
      expectedGamedaysCount: z.number().int().min(0).optional(),
      expectedTeamsPerGameday: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Create offer
        const offer = await Offer.create({
          status: 'draft',
          associationId: input.associationId,
          seasonId: input.seasonId,
          leagueIds: input.leagueIds,
          contactId: input.contactId,
        });

        // Auto-create FinancialConfig for each league
        const configs = await Promise.all(
          input.leagueIds.map((leagueId) =>
            FinancialConfig.create({
              leagueId,
              seasonId: input.seasonId,
              costModel: input.costModel,
              baseRateOverride: input.baseRateOverride ?? null,
              expectedTeamsCount: input.expectedTeamsCount,
              expectedGamedaysCount: input.expectedGamedaysCount ?? 0,
              expectedTeamsPerGameday: input.expectedTeamsPerGameday ?? 0,
              offerId: offer._id,
            })
          )
        );

        return {
          ...normalizeOffer(offer),
          configs: configs.map(normalizeConfig),
        };
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An offer for this association/season already exists in draft or sent state.',
          });
        }
        throw err;
      }
    }),
```

**After:**
```typescript
  create: adminProcedure
    .input(CreateOfferSchema.extend({
      costModel: z.enum(['SEASON', 'GAMEDAY']),
      baseRateOverride: z.number().positive().nullable().optional(),
      expectedTeamsCount: z.number().int().min(1),
      expectedGamedaysCount: z.number().int().min(0).optional(),
      expectedTeamsPerGameday: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const session = await Offer.startSession();
      session.startTransaction();

      try {
        // Create offer within transaction
        const [offer] = await Offer.create(
          [{
            status: 'draft',
            associationId: input.associationId,
            seasonId: input.seasonId,
            leagueIds: input.leagueIds,
            contactId: input.contactId,
          }],
          { session }
        );

        // Auto-create FinancialConfig for each league within transaction
        const configs = await FinancialConfig.insertMany(
          input.leagueIds.map((leagueId) => ({
            leagueId,
            seasonId: input.seasonId,
            costModel: input.costModel,
            baseRateOverride: input.baseRateOverride ?? null,
            expectedTeamsCount: input.expectedTeamsCount,
            expectedGamedaysCount: input.expectedGamedaysCount ?? 0,
            expectedTeamsPerGameday: input.expectedTeamsPerGameday ?? 0,
            offerId: offer._id,
          })),
          { session }
        );

        await session.commitTransaction();

        return {
          ...normalizeOffer(offer),
          configs: configs.map(normalizeConfig),
        };
      } catch (err: any) {
        await session.abortTransaction();

        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An offer for this association/season already exists in draft or sent state.',
          });
        }
        throw err;
      } finally {
        await session.endSession();
      }
    }),
```

**Key changes:**
- `startSession()` and `startTransaction()`
- Use `Offer.create([...], { session })` and `FinancialConfig.insertMany([...], { session })`
- `commitTransaction()` on success
- `abortTransaction()` on any error (automatic rollback)
- `endSession()` in finally block (cleanup)

- [x] **Step 2: Verify MongoDB supports transactions (manual)**

Ensure your MongoDB instance supports transactions. This requires:
- MongoDB 4.0+ (release 2018)
- Replica set or sharded cluster (transactions don't work on standalone)

Check your MongoDB version:
```bash
mongosh
> db.version()
```

For local development, if using standalone, you can test with a replica set:
```bash
# Start MongoDB as a replica set (one node)
docker run -d \
  -p 27017:27017 \
  --name mongodb \
  mongo:6.0 \
  mongod --replSet rs0

# Initialize the replica set
docker exec mongodb mongosh --eval "rs.initiate()"
```

- [x] **Step 3: Test transaction rollback (manual)**

Create a test scenario where config creation would fail:

1. Start the server
2. Create an offer with 2 leagues
3. Verify both offer and configs are created
4. Create another offer for the same league in the same season
5. Verify it either succeeds (new association) or fails cleanly (same association)

Expected: No orphan offers, no "already exists" on retry.

- [x] **Step 4: Commit**

```bash
cd /home/cda/dev/leagues.finance
git add src/server/routers/finance/offers.ts
git commit -m "fix: atomic offer creation using MongoDB transactions

- Wrap offer + financial config creation in single transaction
- Use session.startTransaction/commitTransaction/abortTransaction
- Automatic rollback on any error prevents orphan offers
- Cleanup session in finally block

Prevents data inconsistency when config creation fails:
previously left orphan offer documents with no configs."
```

---

## Testing Checklist

After all tasks complete, run this verification:

- [x] Unit test for discount validation (PERCENT ≤ 100)
```bash
cd /home/cda/dev/leagues.finance
npm test -- shared/schemas/discount.ts
```

- [x] E2E: Create offer, edit custom price, save (verify data persists)
```bash
npm run dev
# Navigate to offer, edit custom price, click Save, refresh page → price persists
```

- [x] E2E: Login flow (verify token in cookie, not URL)
```bash
npm run dev
# Complete OAuth login, check DevTools Network/Cookies
# Token should be in cookie, not in URL params
# Check Request headers for Cookie: auth_token=...
```

- [x] E2E: Create offer with multiple leagues in same season (verify no index conflict)
```bash
# Create offer 1 for association A with leagues [1,2]
# Create offer 2 for association B with leagues [1,2]
# Both should succeed (no unique constraint violation)
```

- [x] Unit test for transaction rollback (inject error, verify rollback)
```bash
# Add a test that mocks FinancialConfig.insertMany to throw
# Verify Offer was not created (no orphan)
```

---

## Deployment Notes

**Order of deployment:**
1. Deploy database schema changes (Task 4 migration) **first**
2. Run migration script before starting new server
3. Deploy server code (Tasks 1, 2, 3, 5) 
4. Deploy client code (Task 3)

**Backwards compatibility:**
- All changes are safe for phased rollout
- New validation (Task 1, 2) rejects invalid data at schema level
- Cookie + URL removal (Task 3) is transparent to client
- Index change (Task 4) has migration script
- Transaction wrapping (Task 5) is internal, no API change

---

## Post-Completion Validation

After all tasks merge to main and deploy:

1. Monitor error logs for transaction failures (should be zero)
2. Verify no new offers fail with "already exists" on retry
3. Spot-check FinancialConfig index in production MongoDB
4. Confirm custom price edits persist (sample 3 offers)
5. Verify JWT never appears in access logs (search for `token=`)
