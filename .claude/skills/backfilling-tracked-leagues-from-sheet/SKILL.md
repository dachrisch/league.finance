---
name: backfilling-tracked-leagues-from-sheet
description: Use when a Google Sheet tracking association contacts and per-league sales-pipeline status (e.g. "Tracker Kontakte Ligen") needs importing or re-syncing into leagues.finance's Association/Contact/TrackedLeague collections — new rows were added since the last import, a similarly-shaped new sheet appears, or the existing import migration needs updating.
---

# Backfilling Tracked Leagues From a Sheet

## Overview

Turns a manually-maintained sales-pipeline sheet into an idempotent Mongo
migration under `src/server/db/migrations/`. Never write to the live
database directly — a migration is reviewable, dry-runnable, and safe to
re-run. See `docs/ARCHITECTURE.md` for how `Association`/`Contact`/
`TrackedLeague`/`Offer` connect, and
`docs/superpowers/specs/2026-09-10-tracked-leagues-design.md` for why this
shape was chosen.

**Reference implementation:** `src/server/db/migrations/004-import-tracked-leagues.js`
— the worked example for everything below. Read it before writing a new one.

## Procedure

1. **Fetch the sheet.** Use the Google Drive tools (`search_files` by title,
   then `read_file_content`) to get the sheet's rows as markdown/CSV text.
   Don't guess column contents from memory — sheets get edited.

2. **Parse each row into a `GROUPS` entry** (one entry per distinct
   "Verband" value), matching the shape in `004-import-tracked-leagues.js`:
   `{ label, contacts: string[], leagues: [{ name, year, isYouth,
   estimatedTeamsCount, estimatedGamedaysCount, status, comment, contact }] }`.
   Column mapping:

   | Sheet column | Field | Notes |
   |---|---|---|
   | Verband | `label` | Leaguesphere abbreviation (e.g. `AFVBy`) or a federation name like "Spielverbund Ost" |
   | Kontakt | `contacts` | Split on `/`, trim each name |
   | Liga | `name` | If `-`, use `"<label> (allgemein)"` instead — never store a bare `-` |
   | Jahr | `year` | Plain number, even if speculative ("2027 vermutlich" → `2027`) |
   | Ist Jugend? | `isYouth` | `Ja` → `true`, else `false` |
   | Anzahl Teams / Anzahl Spieltage | `estimatedTeamsCount` / `estimatedGamedaysCount` | Free-text strings — keep `"~50"`, `"max. 6/Spieltag"` etc. verbatim, don't coerce to numbers |
   | Kommentar, Preis, Bezahlt? | `comment` | Concatenate into one free-text field |

3. **Map pipeline stage to `status`** (see design spec section "Migration /
   import"):

   | Sheet state | `status` |
   |---|---|
   | No offer made yet | `lead` |
   | Offer made, decision pending ("Ausstehend") | `offer_in_progress` |
   | Rejected before any offer was ever sent | `rejected_pre_offer` |
   | Offer accepted and/or invoiced, already resolved before this tracker existed | `closed_historical` |

   `closed_historical` is a dead end deliberately — don't try to
   reconstruct real `Offer`/`Invoice` documents for old, already-closed
   deals. The comment field carries the historical outcome as text.

4. **Resolve each `label` to a real leaguesphere association** using the
   same query as `resolveLeaguesphereAssociation()` in the reference
   migration: `SELECT id, abbr, name FROM gamedays_association WHERE abbr = ?
   OR name LIKE ?`. A federation label (multiple real associations, e.g.
   "Spielverbund Ost") won't resolve — that's expected; add it to a
   `VIRTUAL_LABELS` set so it's created as an `Association` with
   `leaguesphereAssociationId: null` instead of logged as unmatched.

5. **Write the migration** as the next sequential number in
   `src/server/db/migrations/`, reusing `up()`/`down()` from the reference
   file almost verbatim — only `GROUPS` and `VIRTUAL_LABELS` change. Keep
   the idempotency checks as-is: find-or-create `Association`/`Contact` by
   name, skip a `TrackedLeague` if one already exists for the same
   `associationId` + `name` + `year`. This means re-running against an
   updated sheet is safe — only genuinely new/changed rows get inserted.
   Keep the `DRY_RUN` env var support.

6. **Dry-run on the test environment first**: `npm run build && DRY_RUN=true
   npm run migrate`, review the log output, then run for real, then repeat
   on production — per this repo's mandatory test-first infrastructure
   policy (see `CLAUDE.md`). Re-run once more to confirm it reports 0
   new records (idempotency check).

## Common mistakes

- Hardcoding the sheet's data from memory instead of re-fetching it — the
  whole point of this skill is that the sheet keeps changing.
- Coercing free-text estimate fields (`"~50"`) into numbers — they stay
  strings.
- Treating a `-` in the Liga column as a real league name.
- Forgetting a label in `VIRTUAL_LABELS` — it'll get logged as "no
  leaguesphere match found" and create a real-looking but unlinked
  association instead of a clearly virtual one.
- Skipping the `DRY_RUN` pass or the test-environment run.
