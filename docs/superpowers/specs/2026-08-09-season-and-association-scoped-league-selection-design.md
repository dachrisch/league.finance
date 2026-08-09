# Season- and Association-Scoped League Selection Design Spec

**Date:** 2026-08-09
**Status:** Approved
**Topic:** Scope league selection to the chosen season everywhere it's still unscoped, and add an optional filter by leaguesphere regional association to narrow long league lists.

## Overview

Two related gaps in league selection across the app:

1. **Year scoping.** `ConfigNewPage`, `ConfigDetailPage`, and `DashboardPage` all fetch leagues via `trpc.teams.leagues` (`src/server/routers/teams.ts`), which returns every league ever created in leaguesphere, regardless of season. This is inconsistent with the Offer wizard, which already scopes leagues to the selected season via `trpc.finance.leagues.listBySeason`. On `ConfigNewPage` a user picks League and Season independently in the same form with no relationship enforced between them. On `DashboardPage`, `buildMissingContracts` (`src/client/lib/dashboardUtils.ts`) receives this unscoped league list, so leagues that only ever existed in prior seasons are incorrectly reported as "missing contracts" for the current season.

2. **Association filter.** leaguesphere already models a `Team.association` relationship (`gamedays_association` table: `abbr`, `name` — a regional sports federation, e.g. "NRW"). leagues.finance separately has its own `Association` Mongo model (`src/server/models/Association.ts`) representing the billing/contact entity an offer is sent to (e.g. "AFCV NRW e.V.") — a different concept, unrelated today. Long per-season league lists (in the Offer wizard's `LeagueSelectorSection`, and in the Config pages) are hard to scan. Linking the two Association concepts lets the app derive a sensible default filter instead of forcing a redundant manual selection.

## Data Model Change

Add one optional field to the Mongo `Association` model:

```ts
// src/server/models/Association.ts
leaguesphereAssociationId: { type: Number, required: false, default: null }
```

This links a billing Association to a leaguesphere `gamedays_association.id`. It is optional — associations created before this change, or ones with no clean leaguesphere counterpart, simply have `null`. `FinancialConfig` is unchanged (`{ leagueId, seasonId, ... }`) — it has no association context and none is added.

## Backend Queries (read-only MySQL)

### `leaguesRouter.listBySeason` — add optional `associationId`

`src/server/routers/finance/leagues.ts`

```ts
listBySeason: protectedProcedure
  .input(z.object({
    seasonId: z.union([z.number(), z.string()]),
    associationId: z.number().optional(),
  }))
  .query(async ({ input }) => {
    // seasonId parsing unchanged
    const params: (number)[] = [seasonId];
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
```

An unmatched `associationId` (no teams from that association in the season) returns `[]`, same as any other empty result — no special-casing needed.

### `teamsRouter.associations` — new query

`src/server/routers/teams.ts`

```ts
associations: protectedProcedure
  .input(z.object({ seasonId: z.number().optional() }))
  .query(async ({ input }) => {
    const pool = getMysqlPool();
    if (input.seasonId == null) {
      // Unscoped: full list, for linking an Association record (not season-specific).
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, abbr, name FROM gamedays_association ORDER BY name'
      );
      return rows;
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
    return rows;
  }),
```

Season-scoped calls (used for the Config-page filter dropdown) only list associations with teams actually playing that season. The unscoped call (used when linking an Association record) lists every leaguesphere association.

## Consumer Wiring

### `AssociationForm.tsx` (`src/client/components/AssociationForm.tsx`)
Add a "Linked leaguesphere association" `<select>`, sourced from `trpc.teams.associations.useQuery({})` (unscoped). Optional field, defaults to "— none —". Submits `leaguesphereAssociationId` alongside existing fields.

### `ConfigNewPage.tsx` / `ConfigDetailPage.tsx`
- Reorder so **Season** is chosen before **League**.
- League `<select>` switches from `trpc.teams.leagues` to `trpc.finance.leagues.listBySeason({ seasonId })`; disabled with a placeholder until a season is selected.
- Add a manual "Association" `<select>` (`trpc.teams.associations.useQuery({ seasonId })`, enabled once a season is picked) that, when set, is passed as `associationId` into `listBySeason` to further narrow the League list. This filter is purely client-side UI state — nothing new is persisted on `FinancialConfig`.

### `DashboardPage.tsx`
Replace `trpc.teams.leagues.useQuery()` with `trpc.finance.leagues.listBySeason.useQuery({ seasonId: currentSeason?.id }, { enabled: currentSeason != null })`. This fixes the `buildMissingContracts` bug: `leagueMap` and the leagues fed into missing-contract detection are now actually scoped to `currentSeason`, so prior-season leagues no longer show up as "missing contracts."

### Offer wizard (`OfferCreateWizard.tsx`, `Step2`, `LeagueSelectorSection.tsx`)
- When the Association selected in Step 1 has a non-null `leaguesphereAssociationId`, Step 2's league query defaults to `listBySeason({ seasonId, associationId: linked })`.
- `LeagueSelectorSection` gains a small filter-state indicator: "Showing leagues for {association name} · Show all leagues in {season}". Clicking it drops `associationId` and refetches the full season list. This is local UI state in the wizard, not persisted.
- If the selected Association has no linked leaguesphere association (`null`), behavior is unchanged from today — full season list, no default filter.

## Error Handling

No new error paths. MySQL query failures surface through tRPC the same way existing `leagues`/`seasons`/`associations` queries already do — `DashboardPage` already renders a dedicated error state for `leaguesError`/`seasonsError`/`assocError`; the modified/added queries follow the same shape. An empty association list (season with no association-linked teams) simply renders an empty/optional filter, not an error state.

## Testing

- `leagues.ts` router: `listBySeason` with and without `associationId`; an `associationId` matching no teams returns `[]`.
- `teams.ts` router: new `associations` query, both scoped (only associations with teams that season) and unscoped (full list) modes.
- `dashboardUtils.test.ts`: regression test that `buildMissingContracts`, given a season-scoped `leagues` array, no longer includes leagues that only existed in a prior season.
- `AssociationForm` component test: save with and without a linked leaguesphere association.
- `Step2`/`LeagueSelectorSection` component test: default-filtered-by-association state on mount, and the "show all leagues" toggle clearing the filter and refetching unfiltered.
- `ConfigNewPage`/`ConfigDetailPage` component test: League select disabled until Season is chosen; Association filter narrows the League options.
