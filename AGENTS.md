# Agent Instructions: Leagues Finance

## Deployment
- **Production URL**: https://finance.leaguesphere.app/ (deployed via the `container` repo).

## Architecture & Boundaries
- **Client**: `src/client/` (React + Vite + tRPC Client). Entry: `src/client/main.tsx`.
- **Server**: `src/server/` (Express + tRPC Server + tsx). Entry: `src/server/index.ts`.
- **Shared**: `shared/` contains Zod schemas (`shared/schemas`), types (`shared/types`), and helpers (`shared/lib`) used by both.
- **Frontend Assets**: Uses `src/client/index.css` for responsive design. Mimic existing styles (inline styles + utility classes).

### tRPC router map (`src/server/routers/index.ts`)
The single `appRouter` is the client/server contract; its type (`AppRouter`) drives client-side inference. Top-level namespaces: `health`, `auth`, `teams`, `google`, and everything domain-specific nested under **`finance`**: `settings`, `configs`, `discounts`, `dashboard`, `calculate`, `associations`, `offers`, `offersDrive`, `contacts`, `leagues`, `seasons`. So an endpoint like the one that computes offer pricing is `finance.offers.list`, not `offers.list`. `teams`/`finance.leagues`/`finance.seasons` read from the MySQL source; the rest are MongoDB-backed.

## Command Shortcuts
- **Dev**: `npm run dev` (Runs server on 3000, Vite dev server proxies `/trpc` and `/auth`).
- **Typecheck**: 
  - `npm run typecheck` (Client only)
  - `npm run typecheck:server` (Server only - uses `tsconfig.server.json`)
- **Build**: `npm run build` (Vite build + Server TSC).
- **Test**: `npm run test` (Vitest). Single file/pattern: `npm run test -- src/server/lib/__tests__/configPricing.test.ts` or `npm run test -- -t "computes prices"`. Watch mode: `npm run test:watch`.
- **E2E**: `npm run test:e2e` (Playwright; specs in `e2e/`). `test:e2e:ui` / `test:e2e:debug` for interactive runs.
- **Mongo migrations**: `npm run migrate` runs compiled migrations from `src/server/db/migrations/` (build first — it reads from `dist/`).

## Toolchain Quirks
- **TypeScript**: Two separate configs (`tsconfig.json` for client, `tsconfig.server.json` for server). Use the correct one for `tsc`.
- **Server Execution**: Uses `tsx` for direct execution of TypeScript in dev.
- **Proxy**: Vite proxies API requests to `localhost:3000`.

## Data & Persistence
- **MySQL**: Read-only connection to legacy LeagueSphere data. Configured via `LS_DB_*` env vars.
- **MongoDB**: Primary store for configs, discounts, and settings. 
- **Local Dev**: If `MONGO_URI` is unset in `.env`, the server automatically starts an **in-memory MongoDB** (`mongodb-memory-server`).

## Domain Data Shapes & Gotchas
- **Seasons & leagues are SQL rows, not Mongo docs.** `teams.seasons` / `teams.leagues` return `{ id, name, slug }` (typed to the shared `Season`/`League` types). The season **`name` is the year string** (e.g. `"2026"`) — there is **no `year` field and no `_id`**. Pick the current season by `Number(season.name)` (descending) and filter offers by `season.id`. (Assuming a Mongo-style `{ _id, year }` shape caused the v0.6.10 dashboard "Tracking Season undefined" bug.)
- **Offer pricing is never stored on the Offer document.** It lives in separate `FinancialConfig` records and is computed on read via `computeConfigPrices()` (`src/server/lib/configPricing.ts`) — passing a raw config yields `finalPrice === undefined`, which renders as `0,00 €`. Endpoint contract:
  - `finance.offers.list` → each offer carries a derived `totalPrice` **and** a per-league `leaguePrices: [{ leagueId, finalPrice }]` breakdown. It does **not** embed `financialConfigs`.
  - `finance.offers.get` → returns `configs` (fully priced) separately from the offer.

## Auth Flow
- **Strategy**: Passport.js with `passport-google-oauth20`.
- **Token**: Success redirects issue a JWT. Client uses `getToken()`/`clearToken()` in `src/client/lib/trpc.ts`.
- **Google Drive calls use the logged-in user's OAuth access token** (`ctx.accessToken`), not a service account. When that token is missing/expired, `google.listFolders` throws **`UNAUTHORIZED`** (not a 500) so the UI can prompt a re-login — `DriveService.listFolders` preserves the Google `401/403` status for this mapping.

## Testing
- **Suite**: Vitest.
- **Backend Tests**: Often use `mongodb-memory-server` automatically.
- **Patterns**: Check `src/server/lib/__tests__/` for calculator logic tests.
