# Leagues Finance — Standalone App Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

A standalone Node.js + React + Vite application that manages league finances independently from the LeagueSphere Django app. It reads team/league/season reference data from the existing LeagueSphere MySQL database (read-only) and stores all finance data in its own MongoDB instance.

---

## Repository Structure

```
leagues.finance/
  src/
    server/
      routers/       tRPC routers: auth, teams, finance
      models/        Mongoose models: User, FinancialConfig, Discount, Settings
      db/            mysql.ts (LS read-only pool), mongo.ts (finance MongoDB)
      middleware/    JWT auth guard
      index.ts       Express entry point
    client/
      components/    Reusable UI components
      pages/         Dashboard, Config, Settings, Login
      lib/           tRPC client, React Query setup
      main.tsx
  shared/
    schemas/         Zod schemas shared between server and client
    types/           TypeScript types inferred from Zod schemas
  docker-compose.yml
  vite.config.ts
  tsconfig.json      Path aliases: @server, @client, @shared
  package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Express + tRPC |
| Type safety | tRPC + Zod (end-to-end) |
| LS DB (read) | mysql2 (connection pool) |
| Finance DB (write) | MongoDB via Mongoose |
| Dev/test DB | mongodb-memory-server (in-process) |
| Prod DB | Docker Compose MongoDB container |
| Auth | Google OAuth2 via Passport.js + JWT |

---

## Authentication

**Strategy:** Google OAuth2 — "Sign in with Google" button only, no email/password form.

**Domain restriction:** Only `@bumbleflies.de` Google accounts are permitted. After the OAuth callback, the server checks `email.endsWith('@bumbleflies.de')`; any other domain receives a `403`.

**Credentials:** Google Cloud OAuth client credentials JSON (keep out of version control).
- `client_id`: `...`
- `client_secret`: `...`

**Flow:**
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to `/auth/google/callback`
4. Server verifies domain, upserts `User` in MongoDB
5. Server issues a signed JWT (24h expiry)
6. Client stores JWT, redirects to `/dashboard`

**JWT payload:** `{ userId, email, role }`

**Protection:** Express middleware validates `Authorization: Bearer <token>` on all tRPC procedures. Only `/auth/google` and `/auth/google/callback` are public.

**User model (MongoDB):**
```
email        String (unique)
googleId     String (unique)
displayName  String
role         'admin' | 'viewer'
createdAt    Date
```

**Role seeding:** First `@bumbleflies.de` user to register receives `admin`. All subsequent registrations default to `viewer`. An admin can promote other users via the settings page.

---

## Data Layer

### MySQL — LeagueSphere (read-only)

Connection pool via `mysql2`. Credentials loaded from `.env`. Tables accessed:

| Table | Purpose |
|---|---|
| `gamedays_league` | League list |
| `gamedays_season` | Season list |
| `gamedays_team` | Teams (filter out `location = 'dummy'`) |
| `gamedays_seasonleagueteam` + `_teams` | Team memberships per league/season |
| `gamedays_gameday` | Gamedays per league/season |
| `gamedays_gameinfo` | Officiating team per game |
| `gamedays_gameresult` | Playing team per game |

### MongoDB — Finance (read/write)

New database, created on first run. Mongoose models:

**FinancialSettings** (singleton):
```
defaultRatePerTeamSeason   Decimal128
defaultRatePerTeamGameday  Decimal128
```

**FinancialConfig:**
```
leagueId          Number (FK ref to MySQL)
seasonId          Number (FK ref to MySQL)
costModel         'SEASON' | 'GAMEDAY'
baseRateOverride  Decimal128 | null
expectedTeamsCount         Number (for SEASON model)
expectedGamedaysCount      Number (for GAMEDAY model)
expectedTeamsPerGameday    Number (for GAMEDAY model)
createdAt         Date
updatedAt         Date
```
Unique index on `(leagueId, seasonId)`.

**Discount:**
```
configId      ObjectId (ref FinancialConfig)
type          'FIXED' | 'PERCENT'
value         Decimal128
description   String
createdAt     Date
```

**User:** see Auth section above.

### Environments

| Environment | MongoDB |
|---|---|
| Dev / test | `mongodb-memory-server` (in-process, zero Docker) |
| Production | Docker Compose container, credentials from `.env` |

---

## tRPC Routers

All procedures except auth endpoints require a valid JWT.

### `auth` router
- `auth.googleLogin` — initiates Google OAuth redirect
- `auth.me` — returns current user from JWT

### `teams` router (MySQL reads)
- `teams.leagues` — list all leagues
- `teams.seasons` — list all seasons
- `teams.byLeagueSeason({ leagueId, seasonId })` — teams in a league/season (excluding dummy)

### `finance` router (MongoDB reads/writes)
- `finance.settings.get` — global rate defaults
- `finance.settings.update` — update global defaults (admin only)
- `finance.configs.list` — all configs
- `finance.configs.create({ leagueId, seasonId, costModel, ... })` — admin only
- `finance.configs.get({ id })` — single config with discounts
- `finance.configs.update({ id, ... })` — admin only
- `finance.configs.delete({ id })` — admin only
- `finance.discounts.add({ configId, type, value, description })` — admin only
- `finance.discounts.remove({ id })` — admin only
- `finance.dashboard` — aggregated gross/discount/net + pending configs
- `finance.calculate({ configId })` — full cost breakdown for one config

---

## Finance Calculation Logic

Port of `FinanceService.calculate_costs` from Django:

**SEASON model:**
- Fetch all non-dummy teams in league/season from MySQL
- `gross = teamCount × baseRate`
- Apply discounts (FIXED or PERCENT of gross) → `net = gross - discount`

**GAMEDAY model:**
- Fetch all gamedays for league/season from MySQL
- Per gameday: unique non-dummy teams from `gameresult` (playing) + `gameinfo` (officiating)
- `gross = Σ(teamsPerGameday × baseRate)`
- Apply discounts to total gross → `net = gross - discount`

**Base rate resolution:** `baseRateOverride` if set, otherwise global default for the cost model.

**Pending configs:** league/season combinations that have at least one gameday in MySQL but no `FinancialConfig` in MongoDB — surfaced on the dashboard.

---

## UI Pages

| Route | Description |
|---|---|
| `/login` | Google sign-in button |
| `/dashboard` | Summary cards (gross/discount/net) + configs table + pending section |
| `/config/new?league=&season=` | Create config, pre-fills from query params |
| `/config/:id` | Config detail + inline discount management |
| `/settings` | Global rate defaults + user role management (admin only) |

---

## Docker Compose (Production)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [mongo]

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: leagues_finance

volumes:
  mongo_data:
```

---

## Environment Variables

```
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT
JWT_SECRET=...

# LeagueSphere MySQL (read-only)
LS_DB_HOST=s207.goserver.host
LS_DB_NAME=web35_db8
LS_DB_USER=web35_8
LS_DB_PASSWORD=...

# MongoDB (finance)
MONGO_URI=mongodb://localhost:27017/leagues_finance   # overridden in prod
NODE_ENV=development
```

---

## Out of Scope

- No changes to the LeagueSphere Django app or its database schema
- No per-team discount targeting (discounts apply to the full config)
- No gameday designer or other LS features
- No email notifications
- No mobile-specific design (responsive is fine)
