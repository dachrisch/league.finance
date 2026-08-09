# Season- and Association-Scoped League Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope every league dropdown to the selected season (fixing the Config pages and Dashboard, which currently show every league ever created), and let leagues be filtered by leaguesphere regional association — automatically in the Offer wizard once a linked billing Association is chosen, and manually via a dropdown on the Config pages and Dashboard.

**Architecture:** Two small read-only MySQL query changes (`leaguesRouter.listBySeason` gains an optional `associationId` filter; new `teamsRouter.associations` lists leaguesphere associations for a season or unscoped) plus one Mongo schema field (`Association.leaguesphereAssociationId`, linking a billing association to its leaguesphere counterpart). Everything else is wiring: five consumer surfaces (`AssociationForm`, the Offer wizard, `ConfigNewPage`, `ConfigDetailPage`, `DashboardPage`) switch from the old unscoped `teams.leagues` query to the season-scoped one, which is then deleted.

**Tech Stack:** TypeScript, React 19, tRPC v11, Mongoose (MongoDB), mysql2 (read-only MySQL), Vitest, Testing Library.

## Global Constraints

- Read-only MySQL access only — never write to `gamedays_*` tables (per `README.md` "Domain Notes": MySQL is leaguesphere's legacy data, read-only).
- Season `name` IS the year (e.g. `"2026"`); there is no separate `year` field anywhere.
- `leaguesRouter.listBySeason` already returns leagues shaped `{ _id, name, slug, type }` (aliased `l.id as _id`) — this shape is relied on by the Offer wizard today and must not change. New call sites that need `{ id, name, slug }` (matching `shared/schemas/teams.ts` `LeagueSchema`, used by `dashboardUtils.ts` and the Config pages) must map `_id` → `id` locally; do not change the query's own output shape.
- Follow existing code style: inline styles (no CSS modules beyond the ones that already exist), no new abstractions for one-off transforms (map inline, don't add a shared adapter file for a 3-line transform).
- Branch `feat/season-association-league-filter` is already checked out in `/home/cda/dev/leagues.finance` with the approved design spec committed at `docs/superpowers/specs/2026-08-09-season-and-association-scoped-league-selection-design.md`. All commands below assume cwd `/home/cda/dev/leagues.finance`.

---

### Task 1: Link Mongo `Association` to a leaguesphere association

**Files:**
- Modify: `src/server/models/Association.ts`
- Modify: `src/server/routers/finance/associations.ts`
- Modify: `src/client/lib/schemas.ts`
- Test: `src/server/routers/finance/__tests__/associations.test.ts`

**Interfaces:**
- Produces: `IAssociation.leaguesphereAssociationId: number | null` (Mongo field), accepted by `associationsRouter.create` and `associationsRouter.update` inputs, and by the client `AssociationInputSchema`/`AssociationInput` type. `normalizeAssociation` already spreads the full document, so no change needed there — the field flows through `list`/`get`/`create`/`update` automatically.

- [ ] **Step 1: Write the failing test**

Add to `src/server/routers/finance/__tests__/associations.test.ts` (inside the existing `describe('Associations Router', ...)` block, alongside the other `it(...)` cases):

```ts
  it('creates and updates an association with a linked leaguesphere association', async () => {
    const caller = associationsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

    const created = await caller.create({
      name: 'AFCV NRW e.V.',
      description: 'Test',
      email: 'nrw@league.local',
      phone: '555-9999',
      address: {
        street: '1 League St',
        city: 'League City',
        postalCode: '99999',
        country: 'Test Country',
      },
      leaguesphereAssociationId: 3,
    });
    expect(created.leaguesphereAssociationId).toBe(3);

    const updated = await caller.update({
      id: created._id,
      data: { leaguesphereAssociationId: null },
    });
    expect(updated?.leaguesphereAssociationId).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/routers/finance/__tests__/associations.test.ts`
Expected: FAIL — `leaguesphereAssociationId` is stripped by the zod input schema (unrecognized key) or is `undefined` on the returned doc.

- [ ] **Step 3: Add the field to the Mongo model**

In `src/server/models/Association.ts`, add the field to both the interface and schema:

```ts
export interface IAssociation extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  leaguesphereAssociationId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssociationSchema = new Schema<IAssociation>(
  {
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    leaguesphereAssociationId: { type: Number, required: false, default: null },
  },
  { timestamps: true }
);
```

- [ ] **Step 4: Accept the field in the router's `create`/`update` input schemas**

In `src/server/routers/finance/associations.ts`, extend both zod input objects:

```ts
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.object({
          street: z.string(),
          city: z.string(),
          postalCode: z.string(),
          country: z.string(),
        }),
        leaguesphereAssociationId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.create(input);
      return normalizeAssociation(association);
    }),
```

```ts
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          address: z.object({
            street: z.string(),
            city: z.string(),
            postalCode: z.string(),
            country: z.string(),
          }).optional(),
          leaguesphereAssociationId: z.number().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const association = await Association.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' });
      if (!association) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return normalizeAssociation(association);
    }),
```

Leave every other procedure in this file unchanged.

- [ ] **Step 5: Add the field to the client-side schema**

In `src/client/lib/schemas.ts`, extend `AssociationInputSchema`:

```ts
export const AssociationInputSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  address: AddressSchema,
  leaguesphereAssociationId: z.number().nullable().optional(),
});
```

(`AssociationSchema` extends this, so it picks up the field automatically — no separate edit needed there.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/server/routers/finance/__tests__/associations.test.ts`
Expected: PASS (6 tests, including the new one)

- [ ] **Step 7: Commit**

```bash
git add src/server/models/Association.ts src/server/routers/finance/associations.ts src/client/lib/schemas.ts src/server/routers/finance/__tests__/associations.test.ts
git commit -m "feat: link billing Association to a leaguesphere association"
```

---

### Task 2: Filter `leaguesRouter.listBySeason` by association

**Files:**
- Modify: `src/server/routers/finance/leagues.ts`
- Test: Create `src/server/routers/finance/__tests__/leagues.test.ts`

**Interfaces:**
- Produces: `leaguesRouter.listBySeason` input becomes `{ seasonId: number | string, associationId?: number }`. Output shape is unchanged: `{ _id: number, name: string, slug: string, type: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `src/server/routers/finance/__tests__/leagues.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaguesRouter } from '../leagues';
import { getMysqlPool } from '../../../db/mysql';

vi.mock('../../../db/mysql');

describe('leaguesRouter.listBySeason', () => {
  const caller = leaguesRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

  it('queries only by season when no associationId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6 });

    expect(result).toEqual([{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('association_id');
    expect(params).toEqual([6]);
  });

  it('joins through team association when associationId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6, associationId: 3 });

    expect(result).toEqual([{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('gamedays_team');
    expect(sql).toContain('t.association_id = ?');
    expect(params).toEqual([6, 3]);
  });

  it('returns an empty array when the associationId matches no teams', async () => {
    const query = vi.fn().mockResolvedValue([[]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6, associationId: 999 });

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/routers/finance/__tests__/leagues.test.ts`
Expected: FAIL — `associationId` input is rejected (unrecognized key, since the current schema is `z.object({ seasonId: ... })` only) or the SQL never contains `gamedays_team`/`association_id`.

- [ ] **Step 3: Implement the filter**

Replace the body of `src/server/routers/finance/leagues.ts`:

```ts
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../../trpc';
import { getMysqlPool } from '../../db/mysql';

export const leaguesRouter = router({
  listBySeason: protectedProcedure
    .input(z.object({
      seasonId: z.union([z.number(), z.string()]),
      associationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const seasonId = typeof input.seasonId === 'string' ? parseInt(input.seasonId) : input.seasonId;

      if (isNaN(seasonId)) return [];

      const params: number[] = [seasonId];
      let joinClause = '';
      let whereClause = 'WHERE slt.season_id = ?';

      if (input.associationId != null) {
        joinClause = `
         JOIN gamedays_seasonleagueteam_teams st ON st.seasonleagueteam_id = slt.id
         JOIN gamedays_team t ON t.id = st.team_id`;
        whereClause += ' AND t.association_id = ?';
        params.push(input.associationId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT l.id as _id, l.name, l.slug, 'Regional' as type
         FROM gamedays_league l
         JOIN gamedays_seasonleagueteam slt ON slt.league_id = l.id
         ${joinClause}
         ${whereClause}
         ORDER BY l.name`,
        params
      );

      return rows;
    }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/server/routers/finance/__tests__/leagues.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/routers/finance/leagues.ts src/server/routers/finance/__tests__/leagues.test.ts
git commit -m "feat: filter leaguesRouter.listBySeason by leaguesphere association"
```

---

### Task 3: Add `teamsRouter.associations` query

**Files:**
- Modify: `shared/schemas/teams.ts`
- Modify: `shared/types/index.ts`
- Modify: `src/server/routers/teams.ts`
- Test: Create `src/server/routers/__tests__/teams.test.ts`

**Interfaces:**
- Produces: shared type `LeaguesphereAssociation = { id: number; abbr: string; name: string }` (named to avoid collision with the unrelated Mongo `Association` type in `src/client/lib/schemas.ts`). Produces `teamsRouter.associations` — input `{ seasonId?: number }`, output `LeaguesphereAssociation[]`.
- Consumes: `getMysqlPool` from `../db/mysql` (already imported in this file).

- [ ] **Step 1: Write the failing test**

Create `src/server/routers/__tests__/teams.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { teamsRouter } from '../teams';
import { getMysqlPool } from '../../db/mysql';

vi.mock('../../db/mysql');

describe('teamsRouter.associations', () => {
  const caller = teamsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

  it('returns every leaguesphere association when no seasonId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.associations({});

    expect(result).toEqual([{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('season_id');
    expect(params).toBeUndefined();
  });

  it('scopes to associations with teams playing in the given season', async () => {
    const query = vi.fn().mockResolvedValue([[{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.associations({ seasonId: 6 });

    expect(result).toEqual([{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('slt.season_id = ?');
    expect(params).toEqual([6]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/routers/__tests__/teams.test.ts`
Expected: FAIL — `teamsRouter.associations` does not exist yet.

- [ ] **Step 3: Add the shared type**

In `shared/schemas/teams.ts`, append:

```ts
export const LeaguesphereAssociationSchema = z.object({
  id: z.number(),
  abbr: z.string(),
  name: z.string(),
});
```

In `shared/types/index.ts`, add the import and export:

```ts
import { LeagueSchema, SeasonSchema, TeamSchema, LeaguesphereAssociationSchema } from '../schemas/teams';
```

```ts
export type LeaguesphereAssociation = z.infer<typeof LeaguesphereAssociationSchema>;
```
(add this line next to the existing `export type Team = z.infer<typeof TeamSchema>;`)

- [ ] **Step 4: Implement the query**

In `src/server/routers/teams.ts`, add the import and the new procedure (leave `leagues`, `seasons`, `byLeagueSeason` untouched for now — `leagues` is removed in Task 12 once nothing references it):

```ts
import type { League, Season, LeaguesphereAssociation } from '../../../shared/types';
```

```ts
  associations: protectedProcedure
    .input(z.object({ seasonId: z.number().optional() }))
    .query(async ({ input }): Promise<LeaguesphereAssociation[]> => {
      const pool = getMysqlPool();

      if (input.seasonId == null) {
        const [rows] = await pool.query<RowDataPacket[]>(
          'SELECT id, abbr, name FROM gamedays_association ORDER BY name'
        );
        return rows as unknown as LeaguesphereAssociation[];
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT a.id, a.abbr, a.name
         FROM gamedays_association a
         JOIN gamedays_team t ON t.association_id = a.id
         JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
         JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
         WHERE slt.season_id = ?
         ORDER BY a.name`,
        [input.seasonId]
      );
      return rows as unknown as LeaguesphereAssociation[];
    }),
```

Add this as a new key inside `teamsRouter = router({ ... })`, alongside `leagues`, `seasons`, `byLeagueSeason`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/server/routers/__tests__/teams.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add shared/schemas/teams.ts shared/types/index.ts src/server/routers/teams.ts src/server/routers/__tests__/teams.test.ts
git commit -m "feat: add teamsRouter.associations for season-scoped leaguesphere associations"
```

---

### Task 4: `AssociationForm` — link to a leaguesphere association

**Files:**
- Modify: `src/client/components/AssociationForm.tsx`
- Test: Modify `src/client/components/__tests__/AssociationForm.test.tsx`

**Interfaces:**
- Consumes: `trpc.teams.associations.useQuery({})` → `LeaguesphereAssociation[]` (from Task 3).
- Produces: `AssociationForm` now submits `leaguesphereAssociationId: number | null` as part of its `AssociationInput` payload (field added to the schema in Task 1).

- [ ] **Step 1: Write the failing test**

Add to `src/client/components/__tests__/AssociationForm.test.tsx`. First, mock the trpc hook at the top of the file (after the existing imports):

```ts
import { trpc } from '../../lib/trpc';

vi.mock('../../lib/trpc', () => ({
  trpc: {
    teams: {
      associations: {
        useQuery: vi.fn(),
      },
    },
  },
}));
```

Then add a `beforeEach` (alongside the existing one) and a new test:

```ts
  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.mocked(trpc.teams.associations.useQuery).mockReturnValue({
      data: [{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }],
    } as any);
  });

  it('submits the linked leaguesphere association when selected', async () => {
    const successSubmit = vi.fn(() => Promise.resolve());
    render(<AssociationForm onSubmit={successSubmit} />);

    fireEvent.change(screen.getByLabelText(/Association Name/i), { target: { value: 'Test Association' } });
    fireEvent.change(screen.getByLabelText(/Street/i), { target: { value: 'Teststrasse 1' } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Berlin' } });
    fireEvent.change(screen.getByLabelText(/Linked leaguesphere association/i), { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Association/i }));

    await waitFor(() => {
      expect(successSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ leaguesphereAssociationId: 3 })
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/client/components/__tests__/AssociationForm.test.tsx`
Expected: FAIL — no element with label "Linked leaguesphere association" exists yet.

- [ ] **Step 3: Add the field to the form**

In `src/client/components/AssociationForm.tsx`:

1. Add the import at the top:

```tsx
import { trpc } from '../lib/trpc';
```

2. Change the initial state to include the new field:

```tsx
  const [formData, setFormData] = useState<AssociationInput>(initialData || {
    name: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Germany',
    },
    leaguesphereAssociationId: null,
  });
```

3. Add the query and a change handler, next to the other handlers:

```tsx
  const { data: leaguesphereAssociations = [] } = trpc.teams.associations.useQuery({});

  const handleLeaguesphereAssociationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, leaguesphereAssociationId: value ? Number(value) : null }));
  };
```

4. Add the `<select>` in the JSX, right after the "Association Name" field's closing `</div>` (before the "Street" field):

```tsx
      <div>
        <label htmlFor="leaguesphereAssociationId" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Linked leaguesphere association
        </label>
        <select
          id="leaguesphereAssociationId"
          value={formData.leaguesphereAssociationId?.toString() ?? ''}
          onChange={handleLeaguesphereAssociationChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        >
          <option value="">— none —</option>
          {leaguesphereAssociations.map((a) => (
            <option key={a.id} value={a.id}>{a.abbr} — {a.name}</option>
          ))}
        </select>
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/client/components/__tests__/AssociationForm.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/AssociationForm.tsx src/client/components/__tests__/AssociationForm.test.tsx
git commit -m "feat: link an association to its leaguesphere counterpart from AssociationForm"
```

---

### Task 5: Add a pure helper for filtering contracts by allowed league IDs

**Files:**
- Modify: `src/client/lib/dashboardUtils.ts`
- Test: Modify `src/client/lib/__tests__/dashboardUtils.test.ts`

**Interfaces:**
- Produces: `filterContractsByLeagueIds<T extends { id: number }>(items: T[], allowedIds: Set<number> | null): T[]` — used by `DashboardPage` (Task 11) to narrow the Missing Contracts grid by the association filter, without duplicating filtering logic inline in the page.

- [ ] **Step 1: Write the failing test**

Add to `src/client/lib/__tests__/dashboardUtils.test.ts`:

```ts
import { filterContractsByLeagueIds } from '../dashboardUtils';
```
(add to the existing import block at the top of the file)

```ts
describe('filterContractsByLeagueIds', () => {
  const ITEMS = [
    { id: 16, name: 'RL Bayern' },
    { id: 29, name: 'Bayern U16' },
  ];

  it('returns items unchanged when allowedIds is null', () => {
    expect(filterContractsByLeagueIds(ITEMS, null)).toEqual(ITEMS);
  });

  it('keeps only items whose id is in allowedIds', () => {
    expect(filterContractsByLeagueIds(ITEMS, new Set([29]))).toEqual([{ id: 29, name: 'Bayern U16' }]);
  });

  it('returns an empty array when allowedIds matches nothing', () => {
    expect(filterContractsByLeagueIds(ITEMS, new Set([999]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/client/lib/__tests__/dashboardUtils.test.ts`
Expected: FAIL — `filterContractsByLeagueIds` is not exported.

- [ ] **Step 3: Implement the helper**

Add to `src/client/lib/dashboardUtils.ts`, after `buildMissingContracts`:

```ts
/** Narrows a list of `{id}` items to only those in `allowedIds`. `null` means "no filter". */
export function filterContractsByLeagueIds<T extends { id: number }>(
  items: T[],
  allowedIds: Set<number> | null
): T[] {
  if (allowedIds == null) return items;
  return items.filter(item => allowedIds.has(item.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/client/lib/__tests__/dashboardUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/dashboardUtils.ts src/client/lib/__tests__/dashboardUtils.test.ts
git commit -m "feat: add filterContractsByLeagueIds helper for dashboard association filter"
```

---

### Task 6: Offer wizard state — "show all leagues" toggle

**Files:**
- Modify: `src/client/components/Offer/types.ts`
- Modify: `src/client/hooks/useOfferCreation.ts`
- Test: Modify `src/client/hooks/__tests__/useOfferCreation.test.ts`

**Interfaces:**
- Produces: `Step2State.showAllLeagues: boolean` (default `false`), `useOfferCreation().toggleShowAllLeagues(): void`. Consumed by `OfferCreateWizard`/`OfferEditWizard` (Task 8) to decide whether to pass `associationId` to `listBySeason`, and by `Step2`/`LeagueSelectorSection` (Task 7) to render the filter banner.

- [ ] **Step 1: Write the failing test**

Add to `src/client/hooks/__tests__/useOfferCreation.test.ts`:

```ts
  it('should toggle showAllLeagues, defaulting to false', () => {
    const { result } = renderHook(() => useOfferCreation());

    expect(result.current.step2.showAllLeagues).toBe(false);

    act(() => {
      result.current.toggleShowAllLeagues();
    });
    expect(result.current.step2.showAllLeagues).toBe(true);

    act(() => {
      result.current.toggleShowAllLeagues();
    });
    expect(result.current.step2.showAllLeagues).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/client/hooks/__tests__/useOfferCreation.test.ts`
Expected: FAIL — `toggleShowAllLeagues` is not a function on the hook's return value.

- [ ] **Step 3: Add the state and action**

In `src/client/components/Offer/types.ts`, add the field to `Step2State`:

```ts
export interface Step2State {
  pricing: PricingConfig;
  selectedLeagueIds: string[];
  leagueSearchTerm: string;
  leagueFilterType?: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
  leaguePrices: Record<string, number | null>;
  showAllLeagues: boolean;
}
```

In `src/client/hooks/useOfferCreation.ts`:

1. Add `showAllLeagues: false` to `initialState.step2`:

```ts
  step2: {
    pricing: {
      costModel: 'flatFee',
      baseRateOverride: undefined,
      expectedTeamsCount: 0,
    },
    selectedLeagueIds: [],
    leagueSearchTerm: '',
    leagueFilterType: 'All',
    leaguePrices: {},
    showAllLeagues: false,
  },
```

2. Add the action, next to `updateLeagueFilter`:

```ts
  const toggleShowAllLeagues = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step2: { ...prev.step2, showAllLeagues: !prev.step2.showAllLeagues },
    }));
  }, []);
```

3. Add `showAllLeagues: false` to the `step2` object built in `resetWithData` (so editing an existing offer starts filtered, same as creating a new one):

```ts
      step2: {
        pricing: {
          costModel: firstConfig?.costModel === 'GAMEDAY' ? 'perGameDay' : 'flatFee',
          baseRateOverride: firstConfig?.baseRateOverride || undefined,
          expectedTeamsCount: firstConfig?.expectedTeamsCount || 0,
        },
        selectedLeagueIds: (offer.leagueIds || []).map(String),
        leagueSearchTerm: '',
        leagueFilterType: 'All',
        showAllLeagues: false,
        leaguePrices: configs?.reduce((acc: any, c: any) => {
          acc[String(c.leagueId)] = c.customPrice;
          return acc;
        }, {}) || {},
      },
```

4. Export `toggleShowAllLeagues` from the hook's return object, next to `updateLeagueFilter`:

```ts
    updateLeagueFilter,
    toggleShowAllLeagues,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/client/hooks/__tests__/useOfferCreation.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/Offer/types.ts src/client/hooks/useOfferCreation.ts src/client/hooks/__tests__/useOfferCreation.test.ts
git commit -m "feat: add showAllLeagues toggle to offer wizard state"
```

---

### Task 7: `LeagueSelectorSection` / `Step2` — association filter banner

**Files:**
- Modify: `src/client/components/Offer/Step2/LeagueSelectorSection.tsx`
- Modify: `src/client/components/Offer/Step2/Step2.tsx`
- Test: Modify `src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx`

**Interfaces:**
- Produces: `LeagueSelectorSectionProps.associationFilter?: { linked: boolean; filtering: boolean; associationName: string; seasonName: string; onToggle: () => void }`. Same shape added to `Step2Props.associationFilter`, passed straight through to `LeagueSelectorSection`.
- Consumed by: `OfferCreateWizard`/`OfferEditWizard` (Task 8), which compute this object from `wizard.step1`/`wizard.step2.showAllLeagues` and the linked-association lookup added in Task 1/4.

- [ ] **Step 1: Write the failing test**

Add to `src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx`:

```ts
  it('shows a filtered banner and calls onToggle when the association filter is active', () => {
    const onToggle = vi.fn();
    render(
      <LeagueSelectorSection
        {...mockProps}
        associationFilter={{
          linked: true,
          filtering: true,
          associationName: 'AFCV NRW',
          seasonName: '2026',
          onToggle,
        }}
      />
    );

    expect(screen.getByText(/Showing leagues for/i)).toBeInTheDocument();
    expect(screen.getByText('AFCV NRW')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show all leagues/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows an unfiltered banner when the association filter is linked but off', () => {
    render(
      <LeagueSelectorSection
        {...mockProps}
        associationFilter={{
          linked: true,
          filtering: false,
          associationName: 'AFCV NRW',
          seasonName: '2026',
          onToggle: vi.fn(),
        }}
      />
    );

    expect(screen.getByText(/Showing all leagues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filter to AFCV NRW/i })).toBeInTheDocument();
  });

  it('renders no banner when the association is not linked', () => {
    render(<LeagueSelectorSection {...mockProps} />);
    expect(screen.queryByText(/Showing leagues for/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing all leagues/i)).not.toBeInTheDocument();
  });
```

Add `import { fireEvent } from '@testing-library/react';` if not already present (the file currently imports `render, screen` — extend that import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx`
Expected: FAIL — no `associationFilter` prop exists, banner text not found.

- [ ] **Step 3: Implement the banner**

In `src/client/components/Offer/Step2/LeagueSelectorSection.tsx`, add the prop type and destructure it:

```tsx
interface AssociationFilterInfo {
  linked: boolean;
  filtering: boolean;
  associationName: string;
  seasonName: string;
  onToggle: () => void;
}

interface LeagueSelectorSectionProps {
  leagues: League[];
  selectedIds: string[];
  searchTerm: string;
  filterType: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
  onToggleLeague: (id: string) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: any) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  associationFilter?: AssociationFilterInfo;
}

export function LeagueSelectorSection({
  leagues,
  selectedIds,
  searchTerm,
  filterType,
  onToggleLeague,
  onSearchChange,
  onFilterChange,
  onSelectAll,
  onClearAll,
  associationFilter,
}: LeagueSelectorSectionProps) {
```

Then, right above the `{/* Search */}` block, add:

```tsx
          {associationFilter?.linked && (
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px 0' }}>
              {associationFilter.filtering ? (
                <>Showing leagues for <strong>{associationFilter.associationName}</strong> in {associationFilter.seasonName}.</>
              ) : (
                <>Showing all leagues in {associationFilter.seasonName}.</>
              )}
              {' '}
              <button
                type="button"
                className={styles.leagueCounterLink}
                onClick={associationFilter.onToggle}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {associationFilter.filtering ? 'Show all leagues' : `Filter to ${associationFilter.associationName}`}
              </button>
            </p>
          )}

          {/* Search */}
```

- [ ] **Step 4: Pass the prop through `Step2`**

In `src/client/components/Offer/Step2/Step2.tsx`, add `associationFilter?: AssociationFilterInfo` to `Step2Props` (import or re-declare the same shape — since it's only used here and in `LeagueSelectorSection`, re-declare it locally to avoid a shared-types file for a two-consumer type):

```tsx
interface AssociationFilterInfo {
  linked: boolean;
  filtering: boolean;
  associationName: string;
  seasonName: string;
  onToggle: () => void;
}

interface Step2Props {
  summary: {
    associationName: string;
    contactName: string;
    seasonYear?: string;
  };
  pricing: PricingConfig;
  leagues: any[];
  selectedLeagueIds: string[];
  leagueSearchTerm: string;
  leagueFilterType: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
  associationFilter?: AssociationFilterInfo;
  submitError?: string | null;
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
  onPricingChange: (pricing: Partial<PricingConfig>) => void;
  onToggleLeague: (id: string) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: any) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onEditStep1: () => void;
  isSubmitting: boolean;
  isEdit?: boolean;
  isUnified?: boolean;
}
```

Destructure `associationFilter` in the function signature and pass it to `LeagueSelectorSection`:

```tsx
      <LeagueSelectorSection
        leagues={leagues}
        selectedIds={selectedLeagueIds}
        searchTerm={leagueSearchTerm}
        filterType={leagueFilterType}
        associationFilter={associationFilter}
        onToggleLeague={onToggleLeague}
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
      />
```

(add `associationFilter,` to the destructured props list at the top of the `Step2` function too)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/components/Offer/Step2/LeagueSelectorSection.tsx src/client/components/Offer/Step2/Step2.tsx src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx
git commit -m "feat: show association-filter banner in the league selector"
```

---

### Task 8: Wire the Offer wizard to filter by the linked association

**Files:**
- Modify: `src/client/components/Offer/OfferCreateWizard.tsx`
- Modify: `src/client/components/Offer/OfferEditWizard.tsx`

**Interfaces:**
- Consumes: `Association` from `trpc.finance.associations.list` now carries `leaguesphereAssociationId` (Task 1); `wizard.step2.showAllLeagues`/`toggleShowAllLeagues` (Task 6); `leaguesRouter.listBySeason`'s `associationId` param (Task 2); `LeagueSelectorSectionProps.associationFilter` via `Step2Props.associationFilter` (Task 7).
- No test in this task — this repo has no test coverage for the wizard container components (`OfferCreateWizard`/`OfferEditWizard`); the logic being added here is a thin composition of already-tested pieces (Tasks 2, 6, 7). Verify with `npm run typecheck` and the manual walkthrough in Task 13.

- [ ] **Step 1: Update `OfferCreateWizard.tsx`**

Replace the leagues query and add the association-filter computation. Find:

```ts
  // Get leagues for selected season
  const { data: leagues = [] } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: wizard.step1.selectedSeasonId || '' },
    { enabled: !!wizard.step1.selectedSeasonId }
  );
```

Replace with:

```ts
  const selectedAssociation = associations.find(a => a._id === wizard.step1.selectedAssociationId);
  const linkedAssociationId = (selectedAssociation as any)?.leaguesphereAssociationId ?? null;
  const associationFiltering = linkedAssociationId != null && !wizard.step2.showAllLeagues;

  // Get leagues for selected season, optionally narrowed to the linked association
  const { data: leagues = [] } = trpc.finance.leagues.listBySeason.useQuery(
    {
      seasonId: wizard.step1.selectedSeasonId || '',
      associationId: associationFiltering ? linkedAssociationId : undefined,
    },
    { enabled: !!wizard.step1.selectedSeasonId }
  );
```

Then, in the `<Step2 ... />` JSX at the bottom of the file, add the `associationFilter` prop:

```tsx
    <Step2
      summary={summary}
      pricing={wizard.step2.pricing}
      leagues={leagues}
      selectedLeagueIds={wizard.step2.selectedLeagueIds}
      leagueSearchTerm={wizard.step2.leagueSearchTerm}
      leagueFilterType={wizard.step2.leagueFilterType || 'All'}
      associationFilter={linkedAssociationId != null ? {
        linked: true,
        filtering: associationFiltering,
        associationName: summary.associationName,
        seasonName: summary.seasonYear,
        onToggle: wizard.toggleShowAllLeagues,
      } : undefined}
      submitError={submitError}
```
(keep every other existing prop on `Step2` as-is — only inserting `associationFilter` between `leagueFilterType` and `submitError`)

- [ ] **Step 2: Apply the identical change to `OfferEditWizard.tsx`**

Same two edits: replace the `leagues` query block (identical original code, same location) with the same `selectedAssociation`/`linkedAssociationId`/`associationFiltering` computation and updated query, and add the same `associationFilter` prop to its `<Step2 ... />` call (which currently has `leagueFilterType={wizard.step2.leagueFilterType || 'All'}` immediately followed by `submitError={submitError}` — insert `associationFilter={...}` between them, same as above).

- [ ] **Step 3: Verify with typecheck**

Run: `npm run typecheck`
Expected: no errors related to `OfferCreateWizard.tsx`, `OfferEditWizard.tsx`, `Step2.tsx`, or `LeagueSelectorSection.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/client/components/Offer/OfferCreateWizard.tsx src/client/components/Offer/OfferEditWizard.tsx
git commit -m "feat: default offer wizard league list to the linked association"
```

---

### Task 9: `ConfigNewPage` — season-first, association-narrowed league selection

**Files:**
- Modify: `src/client/pages/ConfigNewPage.tsx`

**Interfaces:**
- Consumes: `trpc.finance.leagues.listBySeason` (Task 2, returns `{_id, name, slug, type}[]`), `trpc.teams.associations` (Task 3, returns `{id, abbr, name}[]`).
- No test in this task — no page in `src/client/pages` currently has test coverage in this repo; verify with `npm run typecheck` and the manual walkthrough in Task 13.

- [ ] **Step 1: Replace the leagues query and add the association filter**

In `src/client/pages/ConfigNewPage.tsx`, replace:

```ts
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
```

with:

```ts
  const [leagueId, setLeagueId] = useState(params.get('league') ?? '');
  const [seasonId, setSeasonId] = useState(params.get('season') ?? '');
  const [associationFilterId, setAssociationFilterId] = useState('');

  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: associationOptions = [] } = trpc.teams.associations.useQuery(
    { seasonId: seasonId ? Number(seasonId) : undefined },
    { enabled: !!seasonId }
  );
  const { data: rawLeagues } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId, associationId: associationFilterId ? Number(associationFilterId) : undefined },
    { enabled: !!seasonId }
  );
  const leagues = (rawLeagues ?? []).map(l => ({ id: l._id, name: l.name }));
```

(this moves the `leagueId`/`seasonId`/new `associationFilterId` `useState` declarations up above the queries that now depend on `seasonId` — remove the old, now-duplicate `const [leagueId, setLeagueId] = useState(...)` / `const [seasonId, setSeasonId] = useState(...)` lines further down in the file where they currently sit, right after the `createConfig` mutation)

- [ ] **Step 2: Reorder the form fields and wire the reset-on-change behavior**

Replace the `responsive-grid-2` block containing the League and Season fields with:

```tsx
        <div className="responsive-grid-2">
          <label className="form-group">
            <span className="form-label">Season</span>
            <select
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setLeagueId('');
                setAssociationFilterId('');
              }}
              required
              className="form-control"
            >
              <option value="">— select —</option>
              {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Association (optional filter)</span>
            <select
              value={associationFilterId}
              onChange={(e) => {
                setAssociationFilterId(e.target.value);
                setLeagueId('');
              }}
              disabled={!seasonId}
              className="form-control"
            >
              <option value="">All associations</option>
              {associationOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>

        <label className="form-group">
          <span className="form-label">League</span>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            required
            disabled={!seasonId}
            className="form-control"
          >
            <option value="">{seasonId ? '— select —' : 'Select a season first'}</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
```

This replaces the existing markup:
```tsx
        <div className="responsive-grid-2">
          <label className="form-group">
            <span className="form-label">League</span>
            <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required className="form-control">
              <option value="">— select —</option>
              {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Season</span>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} required className="form-control">
              <option value="">— select —</option>
              {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
```

Everything below this block (Cost Model, Base Rate, etc.) is unchanged.

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`
Expected: no errors related to `ConfigNewPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/ConfigNewPage.tsx
git commit -m "feat: scope ConfigNewPage league selection to season and association"
```

---

### Task 10: `ConfigDetailPage` — season-scoped league lookup

**Files:**
- Modify: `src/client/pages/ConfigDetailPage.tsx`

**Interfaces:**
- Consumes: `trpc.finance.leagues.listBySeason` (Task 2). No UI change — this page only displays a league/season name, it has no selection controls.

- [ ] **Step 1: Replace the leagues query**

In `src/client/pages/ConfigDetailPage.tsx`, replace:

```ts
  const { data, isLoading, refetch } = trpc.finance.configs.get.useQuery({ id: id! });
  const { data: stats } = trpc.finance.calculate.forConfig.useQuery({ configId: id! });
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
```

with:

```ts
  const { data, isLoading, refetch } = trpc.finance.configs.get.useQuery({ id: id! });
  const { data: stats } = trpc.finance.calculate.forConfig.useQuery({ configId: id! });
  const configSeasonId = (data as any)?.config?.seasonId;
  const { data: rawLeagues } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: configSeasonId ?? 0 },
    { enabled: configSeasonId != null }
  );
  const { data: seasons } = trpc.teams.seasons.useQuery();
```

- [ ] **Step 2: Adapt the shape at the point of use**

Below the `if (!data) return ...;` guard, replace:

```ts
  const { config, discounts } = data as any;
  const isAdmin = me?.role === 'admin';

  const league = leagues?.find(l => l.id === config.leagueId);
  const season = seasons?.find(s => s.id === config.seasonId);
```

with:

```ts
  const { config, discounts } = data as any;
  const isAdmin = me?.role === 'admin';

  const leagues = (rawLeagues ?? []).map(l => ({ id: l._id, name: l.name }));
  const league = leagues.find(l => l.id === config.leagueId);
  const season = seasons?.find(s => s.id === config.seasonId);
```

- [ ] **Step 3: Verify with typecheck**

Run: `npm run typecheck`
Expected: no errors related to `ConfigDetailPage.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/client/pages/ConfigDetailPage.tsx
git commit -m "fix: scope ConfigDetailPage league lookup to its season"
```

---

### Task 11: `DashboardPage` — season-scoped leagues + association filter on Missing Contracts

**Files:**
- Modify: `src/client/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `trpc.finance.leagues.listBySeason` (Task 2), `trpc.teams.associations` (Task 3), `filterContractsByLeagueIds` from `dashboardUtils.ts` (Task 5).
- This fixes the bug (found during design) where `buildMissingContracts` was fed an unscoped `leagues` list, so leagues that only ever existed in a prior season were shown as "missing" for the current season.

- [ ] **Step 1: Scope the base leagues query to the current season**

In `src/client/pages/DashboardPage.tsx`, the queries currently run in this order (note `currentSeason` is derived from `seasons` further down, so the leagues query must move below that derivation, or use a two-pass approach). Replace:

```ts
  // TRPC queries
  const { data: offers = [], isLoading: offersLoading } = trpc.finance.offers.list.useQuery();
  const { data: leagues = [], isError: leaguesError, error: leaguesErrorObj } = trpc.teams.leagues.useQuery();
  const { data: seasons = [], isError: seasonsError, error: seasonsErrorObj } = trpc.teams.seasons.useQuery();
  const { data: associations = [], isError: assocError, error: assocErrorObj } = trpc.finance.associations.list.useQuery();
```
```ts
  // Lookup maps
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map(l => [l.id, l])), [leagues]);
  const assocMap = useMemo(() => Object.fromEntries(associations.map(a => [a._id, a])), [associations]);

  // Current season (latest by year). Seasons are { id, name, slug } where name is the year.
  const currentSeason = useMemo(() => selectCurrentSeason(seasons), [seasons]);
```

with:

```ts
  // TRPC queries
  const { data: offers = [], isLoading: offersLoading } = trpc.finance.offers.list.useQuery();
  const { data: seasons = [], isError: seasonsError, error: seasonsErrorObj } = trpc.teams.seasons.useQuery();
  const { data: associations = [], isError: assocError, error: assocErrorObj } = trpc.finance.associations.list.useQuery();

  // Current season (latest by year). Seasons are { id, name, slug } where name is the year.
  const currentSeason = useMemo(() => selectCurrentSeason(seasons), [seasons]);

  const { data: rawLeagues = [], isError: leaguesError, error: leaguesErrorObj } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: currentSeason?.id ?? 0 },
    { enabled: currentSeason != null }
  );
  const leagues = useMemo(() => rawLeagues.map(l => ({ id: l._id, name: l.name })), [rawLeagues]);

  // Association filter for the Missing Contracts grid only (Active Contracts is unaffected).
  const [associationFilterId, setAssociationFilterId] = useState('');
  const { data: associationOptions = [] } = trpc.teams.associations.useQuery(
    { seasonId: currentSeason?.id },
    { enabled: currentSeason != null }
  );
  const { data: rawFilteredLeagues } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: currentSeason?.id ?? 0, associationId: associationFilterId ? Number(associationFilterId) : undefined },
    { enabled: currentSeason != null && associationFilterId !== '' }
  );
  const filteredLeagueIds = useMemo(
    () => associationFilterId === '' ? null : new Set((rawFilteredLeagues ?? []).map(l => l._id)),
    [associationFilterId, rawFilteredLeagues]
  );

  // Lookup maps
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map(l => [l.id, l])), [leagues]);
  const assocMap = useMemo(() => Object.fromEntries(associations.map(a => [a._id, a])), [associations]);
```

Add `useState` to the existing `import { useMemo, useState } from 'react';` at the top of the file (it's already imported for `selectedMissingLeagues` — just confirm it's there, no change needed if so).

- [ ] **Step 2: Import the new helper**

Update the `dashboardUtils` import:

```ts
import {
  selectCurrentSeason,
  computeGrossRevenue,
  buildActiveContracts,
  buildMissingContracts,
  filterContractsByLeagueIds,
} from '../lib/dashboardUtils';
```

- [ ] **Step 3: Apply the filter to the Missing Contracts grid**

Replace:

```ts
  // Missing Contracts: Leagues in current season that have NO offer at all.
  const missingContracts = useMemo(
    () => buildMissingContracts(offers, currentSeason?.id, leagues),
    [offers, currentSeason, leagues]
  );
```

with:

```ts
  // Missing Contracts: Leagues in current season that have NO offer at all.
  const missingContracts = useMemo(
    () => buildMissingContracts(offers, currentSeason?.id, leagues),
    [offers, currentSeason, leagues]
  );
  const visibleMissingContracts = useMemo(
    () => filterContractsByLeagueIds(missingContracts, filteredLeagueIds),
    [missingContracts, filteredLeagueIds]
  );
```

Then, in the "Missing Contracts" `<section>`, replace every use of `missingContracts` in the render (the counts/chips and the `.map(...)`) with `visibleMissingContracts`. Specifically:

- The empty-state check `missingContracts.length === 0 ? (...)` → `visibleMissingContracts.length === 0 ? (...)`.
- `missingContracts.map(league => { ... })` → `visibleMissingContracts.map(league => { ... })`.
- `{missingContracts.length > 0 && <span ...>Action Required</span>}` → `{visibleMissingContracts.length > 0 && <span ...>Action Required</span>}`.

(Leave `activeContracts`/`leagueMap` untouched by this filter — the association filter only narrows which leagues you're offered to *create a new contract for*, not the already-contracted list.)

- [ ] **Step 4: Add the association filter dropdown to the section header**

In the "Missing Contracts" header `<div>` (the one containing the `<h2>Missing Contracts</h2>` and the action buttons), add the filter select before the existing buttons:

```tsx
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <select
                value={associationFilterId}
                onChange={(e) => setAssociationFilterId(e.target.value)}
                className="form-control"
                style={{ width: 'auto' }}
              >
                <option value="">All associations</option>
                {associationOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {selectedMissingLeagues.length > 0 && (
```

(this inserts the `<select>` as the first child of the existing `<div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>` wrapper that already holds the "Create Offer for N Leagues" button and the "Action Required" chip — the rest of that block is unchanged)

- [ ] **Step 5: Verify with typecheck**

Run: `npm run typecheck`
Expected: no errors related to `DashboardPage.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/client/pages/DashboardPage.tsx
git commit -m "fix: scope Dashboard leagues to current season, add association filter to Missing Contracts"
```

---

### Task 12: Remove the now-dead `teamsRouter.leagues` query

**Files:**
- Modify: `src/server/routers/teams.ts`

**Interfaces:**
- Removes `teamsRouter.leagues`. By this point (Tasks 4, 9, 10, 11 complete), nothing in the codebase calls it — verified in Step 1 below.

- [ ] **Step 1: Confirm nothing still calls it**

Run: `grep -rn "teams\.leagues\b" src --include="*.ts*" | grep -v __tests__`
Expected: no output (the query definition itself, `leagues: protectedProcedure...`, lives in `teams.ts` under the key `leagues` inside `teamsRouter`, not matched by this grep since it greps for the call pattern `teams.leagues`, i.e. client usage — confirm there is none left).

- [ ] **Step 2: Remove the query**

In `src/server/routers/teams.ts`, delete the `leagues` procedure:

```ts
  leagues: protectedProcedure.query(async (): Promise<League[]> => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, slug FROM gamedays_league ORDER BY name');
    return rows as unknown as League[];
  }),
```

Remove the now-unused `League` import — change:

```ts
import type { League, Season, LeaguesphereAssociation } from '../../../shared/types';
```
to:
```ts
import type { Season, LeaguesphereAssociation } from '../../../shared/types';
```

- [ ] **Step 3: Verify nothing broke**

Run: `npm run typecheck && npm run typecheck:server && npm test`
Expected: all pass — this confirms no remaining reference to the removed procedure or the removed type import.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/teams.ts
git commit -m "chore: remove dead unscoped teamsRouter.leagues query"
```

---

### Task 13: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated suite**

```bash
npm run typecheck
npm run typecheck:server
npm test
npm run lint
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual walkthrough on the dev server**

```bash
npm run dev
```

Then in a browser:
1. **AssociationsPage** (`/associations`): edit an existing association, confirm the new "Linked leaguesphere association" dropdown lists real leaguesphere associations and saves.
2. **New offer wizard** (`/offers/new`): pick the association just linked above and a season in Step 1; in Step 2, confirm the league list is pre-filtered to that association with the "Showing leagues for … · Show all leagues" banner, and that clicking "Show all leagues" widens the list (and the button flips to "Filter to …").
3. **ConfigNewPage** (`/config/new`): confirm League is disabled until Season is chosen, and that picking an Association narrows the League options.
4. **DashboardPage** (`/dashboard`): confirm "Missing Contracts" no longer lists leagues from a prior season, and that the new Association dropdown narrows that grid.

- [ ] **Step 3: Report status to the user**

Summarize pass/fail for each of the four commands and the four manual checks. Do not mark this plan complete if any automated check fails or any manual check behaves unexpectedly — stop and report instead.
