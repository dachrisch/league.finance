# Agent Instructions: Leagues Finance

Standalone financial dashboard for league revenues, discounts, offers and invoices.
Production: https://finance.leaguesphere.app/ (deployed via the `container` repo).
Human-facing overview: [`README.md`](README.md).

## Component map — read the relevant guide before changing code there

- **Client** (React 19 + Vite + tRPC client): [`src/client/AGENTS.md`](src/client/AGENTS.md)
- **Server** (Express + tRPC via tsx, Mongoose models, services, Bull jobs): [`src/server/AGENTS.md`](src/server/AGENTS.md)
- **Shared** (Zod schemas, inferred types, cross-side helpers): [`shared/AGENTS.md`](shared/AGENTS.md)
- **E2E** (Playwright specs): [`e2e/AGENTS.md`](e2e/AGENTS.md)
- **Domain entity relationships** (`Association` → `Contact` → `TrackedLeague` → `Offer` → `FinancialConfig` → `Invoice`, and how to navigate that chain in the UI): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Build & verify (commands verified against `package.json`)

- **Dev**: `npm run dev` — concurrently starts the API (port 3000) and the Vite dev server.
- **Typecheck**: `npm run typecheck` (client, `tsc --noEmit`) and `npm run typecheck:server` (`tsc -p tsconfig.server.json --noEmit`).
- **Build**: `npm run build` — `vite build && tsc -p tsconfig.server.json`.
- **Lint**: `npm run lint` (oxlint). CI (`part_node_build.yaml`) runs lint before build and tests — make sure it passes before pushing.
- **Unit tests**: `npm run test` (Vitest). Single file: `npm run test -- src/server/lib/__tests__/configPricing.test.ts`; name filter: `npm run test -- -t "computes prices"`. Watch mode: `npm run test:watch`.
- **E2E**: `npm run test:e2e` (plus `test:e2e:ui` / `test:e2e:debug`) — see [`e2e/AGENTS.md`](e2e/AGENTS.md).
- **Mongo migrations**: `npm run migrate` runs compiled migrations from `dist/` — run `npm run build` first.

## Toolchain

- Two TypeScript configs: `tsconfig.json` (client, `bundler` resolution) and `tsconfig.server.json` (server, `nodenext`, emits to `dist/`). Use the right one with `tsc`.
- The dev API runs TypeScript directly through `tsx watch src/server/index.ts`.
- Vite proxies `/trpc` and `/auth` to `http://localhost:3000` (see `vite.config.ts`).

## Safety / conventions

- Legacy MySQL is **read-only** source data (teams, seasons, leagues). Never write to it; the app's own state lives in MongoDB.
- Vitest deliberately blocks production MySQL by setting `LS_DB_*` to `test-blocked` (`vitest.config.ts`). Keep tests pointed at test/in-memory data.
- Secrets belong in `.env` (gitignored) or environment variables. Never commit credentials.
