# Agent Instructions: Leagues Finance

## Architecture & Boundaries
- **Client**: `src/client/` (React + Vite + tRPC Client). Entry: `src/client/main.tsx`.
- **Server**: `src/server/` (Express + tRPC Server + tsx). Entry: `src/server/index.ts`.
- **Shared**: `shared/` contains Zod schemas and TypeScript types used by both.
- **Frontend Assets**: Uses `src/client/index.css` for responsive design. Mimic existing styles (inline styles + utility classes).

## Command Shortcuts
- **Dev**: `npm run dev` (Runs server on 3000, Vite dev server proxies `/trpc` and `/auth`).
- **Typecheck**: 
  - `npm run typecheck` (Client only)
  - `npm run typecheck:server` (Server only - uses `tsconfig.server.json`)
- **Build**: `npm run build` (Vite build + Server TSC).
- **Test**: `npm run test` (Vitest).

## Toolchain Quirks
- **TypeScript**: Two separate configs (`tsconfig.json` for client, `tsconfig.server.json` for server). Use the correct one for `tsc`.
- **Server Execution**: Uses `tsx` for direct execution of TypeScript in dev.
- **Proxy**: Vite proxies API requests to `localhost:3000`.

## Data & Persistence
- **MySQL**: Read-only connection to legacy LeagueSphere data. Configured via `LS_DB_*` env vars.
- **MongoDB**: Primary store for configs, discounts, and settings. 
- **Local Dev**: If `MONGO_URI` is unset in `.env`, the server automatically starts an **in-memory MongoDB** (`mongodb-memory-server`).

## Auth Flow
- **Strategy**: Passport.js with `passport-google-oauth20`.
- **Token**: Success redirects issue a JWT. Client uses `getToken()`/`clearToken()` in `src/client/lib/trpc.ts`.

## Testing
- **Suite**: Vitest.
- **Backend Tests**: Often use `mongodb-memory-server` automatically.
- **Patterns**: Check `src/server/lib/__tests__/` for calculator logic tests.
