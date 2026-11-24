# Shared (`shared/`) — cross-side contract

Code imported by both the client and the server:

- `schemas/` — Zod schemas; the **source of truth** for domain validation.
- `types/` — `types/index.ts` re-exports types derived from those schemas with `z.infer`
  (e.g. `Season`, `User`, `JwtPayload`, `FinancialConfig`, `Discount`). Add or extend the
  schema first, then infer the type.
- `lib/` — pure helpers used by both sides, e.g. `offerLines.ts` (offer-line totals and
  validation), `invoiceDescriptions.ts`, `extraction.ts`.

## Rules

- Both TypeScript configs include `shared/**/*` and alias `@shared/*` to it, so this
  directory is compiled into both client and server builds. Keep it runtime-agnostic — no
  Node-only or browser-only APIs.
- Import via `@shared/*` (the client also uses `@client/*`); see
  [`../tsconfig.json`](../tsconfig.json) and
  [`../tsconfig.server.json`](../tsconfig.server.json).
- Unit tests are colocated in each folder's `__tests__/` and are picked up by Vitest
  (`include` covers `shared/**/*.test.ts`). Run one with
  `npm run test -- shared/lib/__tests__/offerLines.test.ts`.
