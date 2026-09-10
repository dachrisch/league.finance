# Tracked Leagues: Merging the Sales-Pipeline Sheet into leagues.finance

## Background

The team currently tracks association contacts and per-league sales-pipeline
status ("Angebot gemacht?", "Angebot angenommen?", price notes, payment
notes) in a manually maintained Google Sheet ("Tracker Kontakte Ligen").
This sheet mixes:

- Associations and their contact person(s)
- Leagues under negotiation — some of which already exist in the
  leaguesphere MySQL source this app reads from, others which don't yet (or
  belong to a different leaguesphere instance entirely)
- Free-text negotiation state, price, and payment notes per league

The finance app already has `Association`, `Contact`, `Offer`, and
`Invoice` Mongo models, but:

- `Contact` has no link to `Association` (only reachable indirectly via
  `Offer.contactId`)
- `Offer.leagueIds` is a required, non-empty array of real leaguesphere
  league IDs — there is no way to track a prospective league before it
  exists in leaguesphere, or before a full `Offer` is created
- `Offer.status` has no `rejected` value, so a sent-then-declined offer
  cannot be represented
- There is no per-league pipeline record, no association-contact list view

This design adds the minimum structure to close that gap, deriving
negotiation/payment status from real `Offer`/`Invoice` records wherever one
exists, rather than duplicating hand-maintained state.

## Goals

- Model "an association has several contacts" and "an association has
  several leagues under negotiation, which may or may not exist in
  leaguesphere yet"
- Let leads be tracked before a real `Offer` can be created (no leaguesphere
  league ID, no season, no cost model needed yet)
- Once a real `Offer`/`Invoice` exists for a tracked league, treat those as
  the single source of truth for its status — no parallel hand-maintained
  state to drift
- Provide a "crosscheck" against leaguesphere to find and link the real
  league once it exists there
- Import the sheet's existing ~19 rows once, then retire the sheet

## Non-goals

- Modeling "Spielverbund" (multi-association federations) as a first-class
  concept — a federation is represented as a virtual `Association` with
  `leaguesphereAssociationId: null`, same as any other association
- Reconstructing historical `Offer`/`Invoice` documents for already-closed
  deals found in the sheet — those import as tracked leagues with a
  `closed_historical` status and their outcome preserved as free text
- A background job or cron for crosschecking — it's computed on read, same
  pattern as `computeConfigPrices()`
- Enforcing that a `Contact` or `TrackedLeague`'s `contactId` belongs to the
  same association — contacts can be assigned freely (needed for shared
  reps across a federation)

## Data model

### `Contact` — add one field

```ts
associationId: string | null; // ref Association, nullable
```

One-to-many: an `Association` has many `Contact`s. No join collection.
Existing standalone contact creation (no association) continues to work —
this is additive. `Offer.contactId` is unaffected and still references
`Contact` directly, independent of association.

### `Offer.status` — add one value

```ts
status: 'draft' | 'sending' | 'sent' | 'accepted' | 'rejected';
```

Needed to represent a sent-then-declined offer (e.g. the sheet's
"Regionalliga Hessen": offered 08.04.2026, declined for budget reasons).
This is a real gap independent of the rest of this design.

### New collection: `TrackedLeague`

```ts
interface ITrackedLeague {
  _id: ObjectId;
  associationId: string; // ref Association, required
  contactId: string | null; // ref Contact
  name: string; // free text, e.g. "Regionalliga Hessen"
  year: number; // NOT a hard ref to a Season row
  isYouth: boolean;
  estimatedTeamsCount: string | null; // free text: sheet has "~50", "max. 6/Spieltag"
  estimatedGamedaysCount: string | null;
  comment: string;
  leaguesphereLeagueId: number | null; // set once crosschecked & linked
  linkedOfferId: string | null; // ref Offer, set once promoted
  status: 'lead' | 'contacted' | 'offer_in_progress' | 'rejected_pre_offer' | 'closed_historical';
  createdAt: Date;
  updatedAt: Date;
}
```

`status` is meaningful **only** while `linkedOfferId` is null — it's the
sheet's pre-contract stages. `closed_historical` is for imported rows that
concluded before this tracker existed (see Migration below); it is not a
state the UI transitions a live lead into. Once `linkedOfferId` is set, the
UI ignores `status` and shows the derived stage instead (see below).

`Association` needs no schema change — its existing nullable
`leaguesphereAssociationId` already represents both real and virtual
(federation) associations correctly.

## Derived effective status

A pure function, `computeTrackedLeagueEffectiveStatus` in
`src/server/lib/trackedLeagueStatus.ts`, folds in the linked `Offer` and,
if one exists, its `Invoice`:

| Offer.status | Invoice state | Effective stage |
| --- | --- | --- |
| `draft` | — | Offer in draft |
| `sending` / `sent` | — | Awaiting decision |
| `rejected` | — | Rejected |
| `accepted` | no invoice yet | Accepted, awaiting invoice |
| `accepted` | invoice `draft`/`sent` | Invoiced, unpaid |
| `accepted` | invoice `paid` | Paid |

Before `linkedOfferId` exists, the effective stage is just the manual
`TrackedLeague.status`. `finance.trackedLeagues.list` batch-fetches linked
`Offer`/`Invoice` docs and attaches the computed stage to each row — the
client never computes this itself.

## Crosscheck

Computed on read, matching the `computeConfigPrices()` pattern — nothing
about a match or non-match is persisted.

1. For a `TrackedLeague` with no `leaguesphereLeagueId`, resolve `year` to
   a real Season: find the season where `Number(season.name) === year`
   (via the existing `teams.seasons` data). If no such season exists yet
   (e.g. "2027 vermutlich" and 2027 hasn't been created in leaguesphere),
   there's nothing to suggest — expected, not an error.
2. If a season is found, query leagues the same way
   `finance.leagues.listBySeason` already does, scoped to
   `association.leaguesphereAssociationId` when set (omitted for virtual
   associations).
3. Name-match `TrackedLeague.name` against the results: case-insensitive
   exact match first, then substring fallback. Return up to 3 candidates.

Exposed as `finance.trackedLeagues.crosscheck({ associationId, year })` —
one batched call per association+year rendered in the UI, not one call per
row. The user confirms a match by setting `leaguesphereLeagueId` via
`update`.

## API surface

New router `finance.trackedLeagues`:

- `list({ associationId })` — all tracked leagues for an association across
  years, each with `effectiveStatus` attached
- `create` / `update` / `delete` — standard CRUD, Zod schemas
  `CreateTrackedLeagueSchema` / `UpdateTrackedLeagueSchema` mirroring the
  `Contact` schema pattern
- `crosscheck({ associationId, year })` — batched leaguesphere-match
  suggestions (see above)
- `linkToOffer({ ids: string[], offerId })` — one atomic mutation setting
  `linkedOfferId` on multiple tracked leagues at once, used when promoting
  a selection to a real offer (avoids partial linkage on failure)

## UI

**`ContactForm.tsx`**: add an optional Association select. Standalone
contact creation (no association) is unaffected.

**New Association detail page**, `/associations/:id`, reached by clicking
a row in `AssociationList` (today there is only a flat list + edit modal,
no drill-down):

- Association header (name, address, customer number, leaguesphere link)
- **Contacts** section: `Contact.find({ associationId })`, inline add/edit
  reusing `ContactForm` with the association preselected
- **Tracked Leagues** section, grouped by year: name, youth badge, contact,
  estimated teams/gamedays, comment, and a status badge — either the manual
  pre-offer stage or the derived Offer/Invoice stage (linking to that
  Offer). Unlinked rows with a crosscheck match show an inline "Matches
  *Regionalliga Hessen* — Link" affordance.
- Checkbox selection + **"Create Offer from selected"**: enabled only when
  the selection shares one contact, one year, and all rows have a resolved
  `leaguesphereLeagueId`. Navigates to the existing Offer wizard with Step1
  (association/contact/season) and Step2 (leagueIds) pre-filled; on
  successful offer creation, calls `linkToOffer` for the selected rows.
- "+ Add Tracked League" — how new leads get entered going forward,
  replacing the spreadsheet.

## Migration / import

One-time migration, `004-import-tracked-leagues.js`, following the
existing up/down convention (raw Mongo driver, like `002`). Sheet data is
transcribed into the migration file itself — no live Sheets API call.

- **Association resolution**: the sheet's "Verband" column uses
  leaguesphere abbreviations (AFVBy, AFVH, AFVD, AFCVNRW, ...) which match
  the `abbr` field from `teams.associations()`. Resolve each abbreviation
  to `{ id, name }`, then find-or-create the Mongo `Association` by
  `leaguesphereAssociationId`, using the real name. Composite rows
  ("Spielverbund Ost", "Spielverbund Nord") become virtual associations
  (`leaguesphereAssociationId: null`).
- **Contacts**: multi-name cells ("Niko Tzioras / Lynn Hoffer") split on
  `/` into separate `Contact` docs, each with `associationId` set. The
  sheet has no email addresses; `Contact.email` is required by the Zod
  schema, but this migration writes via the raw driver (bypassing Mongoose
  validation) with `email: ''` as a placeholder, logged clearly so these
  get backfilled by hand. The one unnamed contact ("?") is skipped.
- **Historical/closed rows**: rows where "Angebot angenommen? = Ja" or the
  sheet shows a concluded rejection import with `status: 'closed_historical'`,
  concatenating the sheet's free-text Kommentar/Preis/Bezahlt columns
  verbatim into `comment`. We are not reconstructing real historical
  `Offer`/`Invoice` documents. Active/pending rows get `lead`, `contacted`,
  or `offer_in_progress` based on the Angebot-gemacht/Ausstehend columns.
- Dry-run mode (log intended writes without applying) since this touches
  production association/contact data. Run against `servyy-test.lxd` first,
  per the test-first infrastructure policy, then production.

## Testing

- `src/server/lib/__tests__/trackedLeagueStatus.test.ts` — one case per row
  of the derived-status table above
- `shared/schemas/__tests__/trackedLeague.test.ts` — Zod validation,
  mirroring `contact.test.ts`
- `src/server/routers/finance/__tests__/trackedLeagues.test.ts` — CRUD +
  `crosscheck` (against a seeded/mocked MySQL pool) + `linkToOffer`, using
  `mongodb-memory-server` like the other router tests
