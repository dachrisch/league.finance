---
name: backfilling-tracked-leagues-from-sheet
description: Use when a Google Sheet tracking association contacts and per-league sales-pipeline status (e.g. "Tracker Kontakte Ligen") needs importing or re-syncing into leagues.finance's Association/Contact/TrackedLeague collections, or when a TrackedLeague/Association/Contact is missing an address or a historical Offer and old offer/contract documents might exist somewhere in Google Drive.
---

# Backfilling Tracked Leagues From a Sheet

## Overview

Covers two related but differently-shaped backfills:

- **Procedure 1 — sheet import/re-sync**: a one-time (or occasionally
  re-run) snapshot import, written as an idempotent Mongo migration under
  `src/server/db/migrations/`, because the sheet's rows are a fixed set at
  any given moment.
- **Procedure 2 — Drive document lookup**: NOT a migration. Documents in
  Drive are fluid — searched fresh every run, matches and extracted data
  vary — so this is a reusable runtime script
  (`src/server/scripts/applyDriveBackfill.ts`) driven by an agent each time,
  never a file with hardcoded snapshot data checked into git.

Never write to the live database directly in either case — a migration is
reviewable and dry-runnable; the runtime script takes a human-confirmed
proposal file and is dry-runnable the same way. See `docs/ARCHITECTURE.md`
for how `Association`/`Contact`/`TrackedLeague`/`Offer`/`FinancialConfig`
connect, and `docs/superpowers/specs/2026-09-10-tracked-leagues-design.md`
for why this shape was chosen.

**Reference implementation for Procedure 1:** `src/server/db/migrations/004-import-tracked-leagues.js`.
**Reference implementation for Procedure 2:** `src/server/scripts/applyDriveBackfill.ts`
and `src/server/lib/offerBundleConfigs.ts`.

## Procedure 1: Sheet import / re-sync

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

   `closed_historical` doesn't reconstruct real `Offer`/`Invoice` documents
   from the sheet's text alone — the comment field carries the historical
   outcome as text instead. If a supporting document later turns up in
   Drive, Procedure 2 below can promote it to a real linked `Offer`.

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

## Procedure 2: Backfilling addresses and historical offers from Drive documents

Two things can be missing that only a document — not the sheet — can supply:
an `Association`/`Contact` postal address (the sheet never had one), and a
real `Offer`/`FinancialConfig` for a `TrackedLeague` sitting in
`closed_historical` or `offer_in_progress` with only a vague price note
("unbekannt, nur PDF-Angebot"). Documents for these are **scattered across
Drive with no known folder** — treat every match as unconfirmed until a
human says otherwise.

1. **Search, per association and per contact name**, using the Drive tools
   (`search_files`, then `read_file_content` — it handles PDFs directly).
   Cast a wide net (association name, contact name, league name) rather
   than guessing a folder.

2. **Extract only what a document states unambiguously.** An address or
   price is either clearly stated for *that* association/contact/league, or
   it doesn't count — never infer from a loosely related document.

3. **Group historical leagues into Offer bundles**, not one Offer per
   league. Several sheet rows say outright that leagues shared one deal
   ("Teil eines gemeinsamen Angebots", or the same contract/invoice date
   repeated across rows, as with the five AFCVNRW 2026 leagues). One
   `Offer.leagueIds` bundles them; each still gets its own
   `FinancialConfig`. Every league in a bundle needs a resolved
   `leaguesphereLeagueId` first (Procedure 1's crosscheck, or
   `finance.trackedLeagues.crosscheck`) — `Offer.leagueIds` requires real
   numeric IDs.

4. **Write a proposal JSON** shaped for `applyDriveBackfill.ts`:
   ```json
   {
     "addressUpdates": [
       { "collection": "associations", "id": "...", "address": { "street": "...", "city": "...", "postalCode": "...", "country": "..." }, "source": "Angebot_AFVH_2026.pdf" }
     ],
     "offerBundles": [
       {
         "associationId": "...", "contactId": "...", "seasonId": 2026, "status": "accepted", "costModel": "SEASON",
         "leagues": [
           { "leaguesphereLeagueId": 12, "trackedLeagueId": "...", "customPrice": 1740 },
           { "leaguesphereLeagueId": 13, "trackedLeagueId": "...", "customPrice": 2175 }
         ],
         "source": "Vertrag_AFCVNRW_2026.pdf"
       }
     ]
   }
   ```
   Use `customPrice` for a document-stated flat amount — it overrides the
   formula in `computeConfigPrices()` outright, which is exactly right for
   a real contracted price instead of a computed estimate.

5. **Stop and show the full proposal to a human before running anything.**
   List every match, what was extracted, its source document, and anything
   left unresolved (no document found, price unclear). This is not
   optional — the search is unscoped, so false matches are expected, not
   an edge case.

6. **Apply it**: `npx tsx src/server/scripts/applyDriveBackfill.ts
   --input=./proposal.json --dry-run` against the test environment first,
   review the log, run for real, re-run once to confirm it now skips
   everything (address already set / `TrackedLeague` already linked), then
   repeat against production.

## Common mistakes

- Hardcoding the sheet's data from memory instead of re-fetching it (Procedure 1) —
  the whole point of this skill is that the source keeps changing.
- Coercing free-text estimate fields (`"~50"`) into numbers — they stay
  strings.
- Treating a `-` in the Liga column as a real league name.
- Forgetting a label in `VIRTUAL_LABELS` — it'll get logged as "no
  leaguesphere match found" and create a real-looking but unlinked
  association instead of a clearly virtual one.
- Skipping the `DRY_RUN` pass or the test-environment run, in either procedure.
- (Procedure 2) Creating one `Offer` per league when the source documents
  describe one shared deal — check for bundling language before writing
  the proposal.
- (Procedure 2) Writing `applyDriveBackfill.ts` input straight from search
  results without the human-confirmation stop — the search has no known
  folder to scope it, so unconfirmed matches will be wrong sometimes.
