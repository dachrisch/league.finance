# E2E (`e2e/`) — Playwright specs

End-to-end tests are **Playwright** specs (`*.spec.ts`) in this directory. They are separate
from Vitest — `vitest.config.ts` only includes `src/**` and `shared/**`, so unit tests do
not run here.

## Running

- `npm run test:e2e` (all), `npm run test:e2e:ui`, `npm run test:e2e:debug` (Playwright
  Inspector). Single spec: `npx playwright test test-frontend-create-offer.spec.ts`.
- Config is [`../playwright.config.ts`](../playwright.config.ts): `testDir: ./e2e`,
  `baseURL: http://localhost:5173`, Chromium only, `fullyParallel: false`, 2 retries in CI,
  trace/screenshot/video on failure. Playwright auto-starts `npm run dev:server` (port 3000)
  and `npm run dev:client` (port 5173), reusing existing dev servers locally.

## Conventions

- `setup.js` is the global setup; shared helpers and selectors live in `utils.ts`. When UI
  markup changes, update the selectors there (they rely on `data-testid` attributes) and in
  the specs.
- Tests create fresh offers against the dev/test environment — never point them at
  production. The dev servers set `NODE_ENV=development`, so Mongo uses the in-memory
  server and the Drive queue uses its in-memory mock.
- See [`README.md`](README.md) for the full scenario list and troubleshooting notes (the
  human-facing companion to this guide).
