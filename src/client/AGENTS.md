# Client (`src/client/`) — React frontend

React 19 + Vite single-page app. Entry point `src/client/main.tsx`, top-level routing in
`App.tsx`, screens in `pages/`, reusable UI in `components/` (the offer wizard lives under
`components/Offer/` with `Step1/` and `Step2/`), hooks in `hooks/`, helpers in `lib/`.

## tRPC & auth

- The typed client is created in `lib/trpc.ts` with `createTRPCReact<AppRouter>()` and an
  `httpBatchLink` to `/trpc`. `AppRouter` is imported from `src/server/routers/index.ts` as a
  **type-only** import — the client/server contract is defined on the server; do not
  redefine it here.
- Every request sends `credentials: 'include'`. The JWT lives in an **HttpOnly `auth_token`
  cookie** set by the server, so there is no client-side token storage or
  `getToken()`/`clearToken()` helper. Logout is handled server-side by clearing the cookie.

## Styling

- Global responsive styles and CSS variables are in `index.css`; the offer wizard uses the
  `styles/OfferWizard.module.css` CSS module. Mimic the existing inline-style + utility-class
  conventions rather than introducing a new styling system.

## Schemas & validation

- Client-side form schemas live in `lib/schemas.ts`. Reusable domain validation belongs in
  `shared/schemas/` — do not duplicate it here. See [`../../shared/AGENTS.md`](../../shared/AGENTS.md).

## Paths & tests

- Path aliases come from `tsconfig.json`: `@client/*` → `src/client/*`, `@shared/*` →
  `shared/*`. There is no `@server/*` alias.
- Unit tests run under Vitest + React Testing Library in jsdom; colocate them in
  `__tests__/` next to the code. Run one with
  `npm run test -- src/client/__tests__/authErrorHandler.test.ts`.
- Playwright E2E specs are **not** here — they live in `e2e/`; see
  [`../../e2e/AGENTS.md`](../../e2e/AGENTS.md).
