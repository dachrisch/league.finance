# Server (`src/server/`) — API, domain logic, persistence

Express app assembled in `app.ts` (started by `index.ts`), tRPC context/procedures in
`trpc.ts`, routers in `routers/`, Mongoose models in `models/`, business logic in `lib/` and
`services/`, background jobs in `jobs/`, database connections and migrations in `db/`.

## tRPC router map (`routers/index.ts`)

`appRouter` (type `AppRouter`) is the client/server contract. Top-level namespaces:
`health`, `auth`, `teams`, `google`, and `finance`. Everything domain-specific is nested
under **`finance`**: `settings`, `configs`, `discounts`, `dashboard`, `calculate`,
`associations`, `offers`, `offersDrive`, `invoices`, `invoicesDrive`, `contacts`, `leagues`,
`trackedLeagues`, `seasons`. So the offer-listing endpoint is `finance.offers.list`, not
`offers.list`.

Only `teams`, `finance.leagues` and `finance.seasons` read from MySQL; the rest are
MongoDB-backed. `finance.associations` manages app-side `Association` documents (the
leaguesphere associations are exposed through `teams.associations`).

## Data & persistence

- **MySQL** (`db/mysql.ts`, `LS_DB_*` env vars): read-only legacy LeagueSphere data —
  seasons, teams, associations, leagues.
- **MongoDB** (`db/mongo.ts`, Mongoose): primary store for configs, discounts, settings,
  associations, offers and invoices. If `MONGO_URI` is unset the server starts an in-memory
  `mongodb-memory-server`. `supportsTransactions()` returns false in dev/test.
- **Migrations**: plain JS scripts in `db/migrations/`. `npm run migrate` runs their
  compiled copies in `dist/`, so build first.
- **Background jobs** (`jobs/queue.ts`): Drive PDF/file work goes through Bull queues
  (`offerDriveQueue`, `invoiceDriveQueue`). With `NODE_ENV=development` these are an
  in-memory mock; otherwise they use Redis (`REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`).

## Auth

- Passport `passport-google-oauth20` in `app.ts`; success signs a JWT and sets it as an
  HttpOnly `auth_token` cookie (`secure` in production, `sameSite: 'strict'`). `trpc.ts`
  reads a bearer token from the `Authorization` header first, falling back to that cookie,
  and verifies with `JWT_SECRET` using HS256. There is no client token-storage helper.
- Google Drive operations use the signed-in user's OAuth access token (`ctx.accessToken`),
  not a service account. If it is missing, `google.listFolders` throws `UNAUTHORIZED`;
  `DriveService.listFolders` preserves a Google 401/403 status so `google.ts` can map it to
  `UNAUTHORIZED` (prompting re-login) instead of a 500.

## Domain data shapes & gotchas

- **Seasons are SQL rows, not Mongo docs.** `teams.seasons` returns `{ id, name, slug }`
  (typed to the shared `Season` type). The `name` is the year string (e.g. `"2026"`) — there
  is **no `year` field and no `_id`**. Pick the current season by `Number(season.name)`
  descending and filter offers by `season.id`. Assuming a Mongo-style `{ _id, year }` shape
  caused the v0.6.10 dashboard "Tracking Season undefined" bug.
- **Leagues**: `finance.leagues.listBySeason({ seasonId, associationId? })` is the
  season-scoped listing and returns `{ _id, name, slug, type }` (note `_id`, not `id`). A
  `finance.leagues.listAll` also exists but is unscoped (used by the offer wizards).
  `teams.associations({ seasonId? })` returns leaguesphere associations `{ id, abbr, name }`,
  unscoped when `seasonId` is omitted.
- **Offer pricing is never stored on the Offer document.** It lives in separate
  `FinancialConfig` records and is computed on read by `computeConfigPrices()`
  (`lib/configPricing.ts`); passing a raw config yields `finalPrice === undefined`, which
  renders as `0,00 €`.
  - `finance.offers.list` → each offer has a derived `totalPrice` **and** a per-league
    `leaguePrices: [{ leagueId, finalPrice }]` breakdown; it does **not** embed
    `financialConfigs`.
  - `finance.offers.get` → returns fully priced `configs` separately from the offer.
- **Offer lines win over configs.** Once `Offer.lines` (label/detail/amount/kind; logic in
  `shared/lib/offerLines.ts`) is non-empty it is the offer's price:
  `totalPrice = offerLinesTotal(lines)` (optional lines excluded, discounts negative).
  Offers without lines still price from `FinancialConfig`s. `generateLines` seeds lines from
  configs; `setLines` replaces them — both are draft-only.
- **Two ways an invoice enters the app.** `finance.invoices.create` issues a *new* invoice:
  it generates the number (`YYYYMMDD-NN`, next after the day's highest suffix), dates it
  today and appends the header + position rows to the legacy Sheets ledger (`SheetsService`).
  `finance.invoices.recordExisting` tracks an invoice already issued outside the app
  (legacy sheet + Apps Script PDF): it keeps the given number/dates/status/Drive link and
  **never** touches the Sheets ledger or renders a PDF — using `create` for those would
  duplicate their ledger rows.
- **PDF layout is pinned to the legacy design.** `PdfService` places content at absolute A4
  points via `INVOICE_LAYOUT` (measured from the Apps Script-issued PDFs) and `OFFER_LAYOUT`
  (measured from `Angebot_20260319-2`). The logo is inlined as base64
  (`assets/bumbleflies-logo.ts`) because `tsc` does not copy binaries into `dist`; layout
  tests spy on pdfkit's `text`/`image` calls. `previewPdf` renders without changing status;
  `fileOfferInDrive` queues `FileOfferJob`, which generates/uploads the PDF and marks the
  offer `sent` — `draft` → `sending` → `sent`, or back to `draft` with
  `driveMetadata.failureReason` if the job fails.

## Testing

- Vitest with `mongodb-memory-server`; colocate tests under `__tests__/`.
  `vitest.config.ts` blocks production MySQL (`LS_DB_*` = `test-blocked`) and loads
  `src/test/setup.ts` / `setupServer.ts`.
- Calculator/pricing tests live in `lib/__tests__/`, router tests in `routers/__tests__/`,
  model tests in `models/__tests__/`, job tests in `jobs/__tests__/`, and PDF/Drive/Sheets
  tests in `services/__tests__/`.
