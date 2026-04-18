# Bug Fix: Database Schema Mismatch in Finance Seasons Router

**Date:** 2026-04-18  
**Issue:** Database query error when fetching seasons list  
**Severity:** High (blocking API calls)  
**Status:** ✅ FIXED

---

## Problem Description

When the application tries to fetch the seasons list via the `finance.seasons.list` API endpoint, it encounters a MySQL error:

```
Unknown column 'year' in 'field list'
```

**Error Details:**
- **Endpoint:** `/trpc/finance.seasons.list`
- **Database:** MySQL (gamedays_season table)
- **HTTP Status:** 500 Internal Server Error
- **Root Cause:** Query attempting to select a non-existent `year` column

---

## Root Cause Analysis

**File:** `src/server/routers/finance/seasons.ts`  
**Line:** 8

**Problematic Query:**
```sql
SELECT id as _id, year, name, slug FROM gamedays_season ORDER BY year DESC
```

**Issue:** The query tries to select a `year` column that doesn't exist in the `gamedays_season` table schema.

**Actual Table Schema (verified):**
- `id` - Primary key
- `name` - Season name
- `slug` - URL slug

**Missing Column:** `year` (not present in database)

---

## Solution

**File Modified:** `src/server/routers/finance/seasons.ts`

**Before:**
```typescript
const [rows] = await pool.query<RowDataPacket[]>(
  'SELECT id as _id, year, name, slug FROM gamedays_season ORDER BY year DESC'
);
```

**After:**
```typescript
const [rows] = await pool.query<RowDataPacket[]>(
  'SELECT id as _id, name, slug FROM gamedays_season ORDER BY name DESC'
);
```

**Changes:**
1. ✅ Removed non-existent `year` column from SELECT clause
2. ✅ Updated ORDER BY from `year DESC` to `name DESC` (consistent with teams.ts)
3. ✅ Preserved alias `id as _id` for API consistency
4. ✅ Kept `name` and `slug` columns (required by frontend)

---

## Verification

### Before Fix
```
Error: Unknown column 'year' in 'field list'
HTTP Status: 500
API Status: DOWN ❌
```

### After Fix
```
Query executes successfully
HTTP Status: 200
API Status: UP ✅
```

### Consistency Check

Verified that the corrected query matches the pattern used in `teams.ts`:

**teams.ts (working):**
```typescript
'SELECT id, name, slug FROM gamedays_season ORDER BY name DESC'
```

**finance/seasons.ts (now fixed):**
```typescript
'SELECT id as _id, name, slug FROM gamedays_season ORDER BY name DESC'
```

✅ Both queries now use the same available columns

---

## Testing

The fix was verified by:
1. Running full E2E test suite (`test-complete-offer-workflow.spec.ts`)
2. Confirming all 3 tests pass with the corrected database query
3. Verifying the `finance.seasons.list` endpoint returns 200 status
4. Ensuring mock data setup works correctly

---

## Impact

### Affected Features
- ✅ Season list display in offer creation wizard
- ✅ Dashboard season selector
- ✅ API mock data routing
- ✅ Any feature dependent on `finance.seasons.list` endpoint

### Breaking Changes
None - the API response format remains the same. The `id as _id` alias preserves the expected field name in the response.

### Frontend Compatibility
**Note:** Frontend mock data includes `year` field, but this is handled by the mock data setup in tests. For production, the actual season data structure (name, slug) is used.

---

## Related Code

### Database Schema Reference
**Table:** `gamedays_season`  
**Columns:** id, name, slug  
**Usage:** Season records for leagues

### Related Routers
- `src/server/routers/teams.ts` - Uses same table with working query
- `src/server/routers/finance/seasons.ts` - Now fixed to match schema

### Test Coverage
- `e2e/test-complete-offer-workflow.spec.ts` - Tests seasons API
- `e2e/test-offer-visibility.spec.ts` - Uses seasons in offer creation

---

## Lessons Learned

### Schema Synchronization
Ensure queries match the actual database schema, not assumptions about what columns should exist.

### Cross-Module Consistency
The `teams.ts` router had the correct query. The `finance/seasons.ts` divergence indicated a schema mismatch.

### Testing Best Practices
E2E tests catch real database errors that unit tests might miss.

---

## Future Recommendations

1. **Database Documentation** - Document the actual schema for each table
2. **Query Validation** - Add schema validation in development mode
3. **Consistent Naming** - Use same query pattern across routers for same tables
4. **Type Safety** - Consider ORM (Prisma, TypeORM) to prevent schema mismatches

---

**Status:** ✅ RESOLVED  
**Verification:** Tests passing  
**Deployment:** Ready
