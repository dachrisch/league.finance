# Leagues Finance — Standalone App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a standalone Node.js + React + Vite finance management app that reads team/league/season reference data from LeagueSphere's MySQL and stores all finance data in its own MongoDB.

**Architecture:** Co-located flat structure — `src/server/` (Express + tRPC), `src/client/` (React + Vite), `shared/` (Zod schemas). Google OAuth2 restricts access to `@bumbleflies.de` accounts. MongoDB uses `mongodb-memory-server` for dev/test, Docker-provided container for prod. All DB calls happen in tRPC routers; the calculation engine is a pure function.

**Tech Stack:** TypeScript 5, Express 4, tRPC v11, React 19, Vite 6, Mongoose 8, mysql2, Passport.js (google-oauth20), JWT, Zod, Vitest, mongodb-memory-server, Docker

---

## File Map

```
leagues.finance/
  shared/
    schemas/
      user.ts             Zod schemas for User
      financialConfig.ts  Zod schemas for FinancialConfig + inputs
      discount.ts         Zod schemas for Discount + inputs
      financialSettings.ts Zod schemas for FinancialSettings
      teams.ts            Zod schemas for League/Season/Team (MySQL shapes)
    types/
      index.ts            Re-exports all inferred types
  src/
    server/
      db/
        mysql.ts          mysql2 connection pool (read-only LS DB)
        mongo.ts          Mongoose connect (memory-server or real URI)
      models/
        User.ts           Mongoose User model
        FinancialConfig.ts Mongoose FinancialConfig model
        Discount.ts       Mongoose Discount model
        FinancialSettings.ts Mongoose FinancialSettings singleton model
      middleware/
        auth.ts           JWT extraction helper (used in tRPC context)
      lib/
        financeCalculator.ts  Pure cost calculation logic (no DB)
        __tests__/
          financeCalculator.test.ts  Vitest unit tests
      routers/
        auth.ts           tRPC auth.me; Express /auth/google routes
        teams.ts          tRPC teams.leagues / .seasons / .byLeagueSeason
        finance/
          settings.ts     tRPC finance.settings.get / .update
          configs.ts      tRPC finance.configs.list / .get / .create / .update / .delete
          discounts.ts    tRPC finance.discounts.add / .remove
          dashboard.ts    tRPC finance.dashboard (aggregated + pending)
          calculate.ts    tRPC finance.calculate (per-config breakdown)
        index.ts          Merged AppRouter export
      trpc.ts             initTRPC, createContext, publicProcedure, protectedProcedure, adminProcedure
      index.ts            Express app entry point
    client/
      lib/
        trpc.ts           tRPC client + React Query provider setup
      components/
        ProtectedRoute.tsx Guards routes requiring auth
        SummaryCards.tsx  Gross / Discount / Net summary cards
        ConfigsTable.tsx  Active configs table
        PendingTable.tsx  Unconfigured league/seasons table
        DiscountForm.tsx  Inline add-discount form
        DiscountList.tsx  Discount list with delete
      pages/
        LoginPage.tsx     Google sign-in button
        DashboardPage.tsx Dashboard with summary + tables
        ConfigDetailPage.tsx Config detail + discount management
        ConfigNewPage.tsx  Create config form (pre-fill from query params)
        SettingsPage.tsx  Global rates + user role management
      App.tsx             React Router routes
      main.tsx            React entry point
  index.html              Vite HTML shell
  vite.config.ts
  tsconfig.json           IDE / client TypeScript config
  tsconfig.server.json    Server TypeScript config (CommonJS output)
  vitest.config.ts
  .env.example
  .gitignore
  Dockerfile
  docker-compose.yml
  package.json
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vitest.config.ts`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.env.example`
- Create: `.gitignore`

- [x] **Step 1: Write `package.json`**

```json
{
  "name": "leagues-finance",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.server.json --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^8.9.0",
    "mysql2": "^3.11.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.16",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.1.0",
    "mongodb-memory-server": "^10.1.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-tsconfig-paths": "^5.1.0",
    "vitest": "^2.1.0"
  }
}
```

- [x] **Step 2: Write `tsconfig.json`** (used by Vite and IDE)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@client/*": ["src/client/*"],
      "@shared/*": ["shared/*"]
    }
  },
  "include": ["src/client/**/*", "shared/**/*", "vite.config.ts", "index.html"]
}
```

- [x] **Step 3: Write `tsconfig.server.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"]
    }
  },
  "include": ["src/server/**/*", "shared/**/*"]
}
```

- [x] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [x] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      '/trpc': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
```

- [x] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Leagues Finance</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 7: Write `.env.example`**

```
# Google OAuth (read from client_secret_*.json)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT signing secret (generate with: openssl rand -hex 32)
JWT_SECRET=change_me_in_production

# LeagueSphere MySQL (read-only)
LS_DB_HOST=s207.goserver.host
LS_DB_NAME=...
LS_DB_USER=...
LS_DB_PASSWORD=...

# MongoDB (leave unset to use in-memory server for dev)
# MONGO_URI=mongodb://localhost:27017/leagues_finance

NODE_ENV=development
PORT=3000
```

- [x] **Step 8: Write `.gitignore`**

```
node_modules/
dist/
.env
*.local
.DS_Store
```

- [x] **Step 9: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [x] **Step 10: Verify TypeScript config is valid**

```bash
npm run typecheck
```

Expected: exits 0 (no source files yet means no errors).

- [x] **Step 11: Commit**

```bash
git init
git add package.json tsconfig.json tsconfig.server.json vitest.config.ts vite.config.ts index.html .env.example .gitignore
git commit -m "chore: project scaffold — Vite + Express + tRPC setup"
```

---

### Task 2: Shared Zod schemas

**Files:**
- Create: `shared/schemas/user.ts`
- Create: `shared/schemas/teams.ts`
- Create: `shared/schemas/financialSettings.ts`
- Create: `shared/schemas/financialConfig.ts`
- Create: `shared/schemas/discount.ts`
- Create: `shared/types/index.ts`

- [x] **Step 1: Write `shared/schemas/user.ts`**

```ts
import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'viewer']);

export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  googleId: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  createdAt: z.date(),
});

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
});
```

- [x] **Step 2: Write `shared/schemas/teams.ts`**

```ts
import { z } from 'zod';

export const LeagueSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const SeasonSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
});
```

- [x] **Step 3: Write `shared/schemas/financialSettings.ts`**

```ts
import { z } from 'zod';

export const FinancialSettingsSchema = z.object({
  defaultRatePerTeamSeason: z.number().min(0),
  defaultRatePerTeamGameday: z.number().min(0),
});

export const UpdateFinancialSettingsSchema = FinancialSettingsSchema;
```

- [x] **Step 4: Write `shared/schemas/financialConfig.ts`**

```ts
import { z } from 'zod';

export const CostModelSchema = z.enum(['SEASON', 'GAMEDAY']);

export const FinancialConfigSchema = z.object({
  _id: z.string(),
  leagueId: z.number(),
  seasonId: z.number(),
  costModel: CostModelSchema,
  baseRateOverride: z.number().nullable(),
  expectedTeamsCount: z.number().int().min(0),
  expectedGamedaysCount: z.number().int().min(0),
  expectedTeamsPerGameday: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateFinancialConfigSchema = z.object({
  leagueId: z.number(),
  seasonId: z.number(),
  costModel: CostModelSchema,
  baseRateOverride: z.number().nullable().default(null),
  expectedTeamsCount: z.number().int().min(0).default(0),
  expectedGamedaysCount: z.number().int().min(0).default(0),
  expectedTeamsPerGameday: z.number().int().min(0).default(0),
});

export const UpdateFinancialConfigSchema = CreateFinancialConfigSchema.partial().omit({
  leagueId: true,
  seasonId: true,
});
```

- [x] **Step 5: Write `shared/schemas/discount.ts`**

```ts
import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);

export const DiscountSchema = z.object({
  _id: z.string(),
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string(),
  createdAt: z.date(),
});

export const AddDiscountSchema = z.object({
  configId: z.string(),
  type: DiscountTypeSchema,
  value: z.number().positive(),
  description: z.string().default(''),
});
```

- [x] **Step 6: Write `shared/types/index.ts`**

```ts
import { z } from 'zod';
import { UserSchema, UserRoleSchema, JwtPayloadSchema } from '../schemas/user';
import { LeagueSchema, SeasonSchema, TeamSchema } from '../schemas/teams';
import { FinancialSettingsSchema, UpdateFinancialSettingsSchema } from '../schemas/financialSettings';
import { FinancialConfigSchema, CostModelSchema, CreateFinancialConfigSchema, UpdateFinancialConfigSchema } from '../schemas/financialConfig';
import { DiscountSchema, DiscountTypeSchema, AddDiscountSchema } from '../schemas/discount';

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;

export type FinancialSettings = z.infer<typeof FinancialSettingsSchema>;
export type UpdateFinancialSettingsInput = z.infer<typeof UpdateFinancialSettingsSchema>;

export type CostModel = z.infer<typeof CostModelSchema>;
export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;
export type CreateFinancialConfigInput = z.infer<typeof CreateFinancialConfigSchema>;
export type UpdateFinancialConfigInput = z.infer<typeof UpdateFinancialConfigSchema>;

export type DiscountType = z.infer<typeof DiscountTypeSchema>;
export type Discount = z.infer<typeof DiscountSchema>;
export type AddDiscountInput = z.infer<typeof AddDiscountSchema>;
```

- [x] **Step 7: Commit**

```bash
git add shared/
git commit -m "feat: shared Zod schemas and inferred types"
```

---

### Task 3: Database connections

**Files:**
- Create: `src/server/db/mysql.ts`
- Create: `src/server/db/mongo.ts`

- [x] **Step 1: Write `src/server/db/mysql.ts`**

```ts
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.LS_DB_HOST!,
      database: process.env.LS_DB_NAME!,
      user: process.env.LS_DB_USER!,
      password: process.env.LS_DB_PASSWORD!,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}
```

- [x] **Step 2: Write `src/server/db/mongo.ts`**

```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log('MongoDB connected:', uri);
  } else {
    mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('MongoDB in-memory server started');
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
```

- [x] **Step 3: Commit**

```bash
git add src/server/db/
git commit -m "feat: MySQL pool and MongoDB connection helpers"
```

---

### Task 4: Mongoose models

**Files:**
- Create: `src/server/models/User.ts`
- Create: `src/server/models/FinancialSettings.ts`
- Create: `src/server/models/FinancialConfig.ts`
- Create: `src/server/models/Discount.ts`

- [x] **Step 1: Write `src/server/models/User.ts`**

```ts
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  googleId: string;
  displayName: string;
  role: 'admin' | 'viewer';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = model<IUser>('User', UserSchema);
```

- [x] **Step 2: Write `src/server/models/FinancialSettings.ts`**

```ts
import { Schema, model, Document } from 'mongoose';

export interface IFinancialSettings extends Document {
  defaultRatePerTeamSeason: number;
  defaultRatePerTeamGameday: number;
}

const FinancialSettingsSchema = new Schema<IFinancialSettings>({
  defaultRatePerTeamSeason: { type: Number, default: 0, min: 0 },
  defaultRatePerTeamGameday: { type: Number, default: 0, min: 0 },
});

export const FinancialSettings = model<IFinancialSettings>('FinancialSettings', FinancialSettingsSchema);

/** Returns the singleton, creating it if absent. */
export async function getOrCreateSettings(): Promise<IFinancialSettings> {
  const existing = await FinancialSettings.findOne();
  if (existing) return existing;
  return FinancialSettings.create({});
}
```

- [x] **Step 3: Write `src/server/models/FinancialConfig.ts`**

```ts
import { Schema, model, Document } from 'mongoose';

export interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialConfigSchema = new Schema<IFinancialConfig>(
  {
    leagueId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    costModel: { type: String, enum: ['SEASON', 'GAMEDAY'], required: true },
    baseRateOverride: { type: Number, default: null },
    expectedTeamsCount: { type: Number, default: 0 },
    expectedGamedaysCount: { type: Number, default: 0 },
    expectedTeamsPerGameday: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });

export const FinancialConfig = model<IFinancialConfig>('FinancialConfig', FinancialConfigSchema);
```

- [x] **Step 4: Write `src/server/models/Discount.ts`**

```ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IDiscount extends Document {
  configId: Types.ObjectId;
  type: 'FIXED' | 'PERCENT';
  value: number;
  description: string;
  createdAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'FinancialConfig', required: true },
    type: { type: String, enum: ['FIXED', 'PERCENT'], required: true },
    value: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Discount = model<IDiscount>('Discount', DiscountSchema);
```

- [x] **Step 5: Commit**

```bash
git add src/server/models/
git commit -m "feat: Mongoose models for User, FinancialConfig, Discount, FinancialSettings"
```

---

### Task 5: tRPC init + context

**Files:**
- Create: `src/server/trpc.ts`

- [x] **Step 1: Write `src/server/trpc.ts`**

```ts
import { initTRPC, TRPCError } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../shared/types';

export interface Context {
  user: JwtPayload | null;
}

export function createContext({ req }: trpcExpress.CreateExpressContextOptions): Context {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return { user: null };

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return { user: payload };
  } catch {
    return { user: null };
  }
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

- [x] **Step 2: Commit**

```bash
git add src/server/trpc.ts
git commit -m "feat: tRPC init with JWT context, protected and admin procedures"
```

---

### Task 6: Google OAuth + Express entry

**Files:**
- Create: `src/server/routers/auth.ts`
- Create: `src/server/index.ts`

- [x] **Step 1: Write `src/server/routers/auth.ts`**

```ts
import { router, protectedProcedure } from '../trpc';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),
});
```

- [x] **Step 2: Write `src/server/index.ts`**

```ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import * as trpcExpress from '@trpc/server/adapters/express';
import { connectMongo } from './db/mongo';
import { User } from './models/User';
import { appRouter } from './routers/index';
import { createContext } from './trpc';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value ?? '';

      if (!email.endsWith('@bumbleflies.de')) {
        return done(null, false, { message: 'Domain not allowed' });
      }

      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'admin' : 'viewer';

      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          googleId: profile.id,
          email,
          displayName: profile.displayName,
          $setOnInsert: { role },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );

      done(null, user);
    }
  )
);

app.use(passport.initialize());

// OAuth routes (not tRPC)
app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=domain' }),
  (req, res) => {
    const user = req.user as InstanceType<typeof User>;
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    // Redirect to client with token in query string (client stores in localStorage)
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

// tRPC handler
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({ router: appRouter, createContext })
);

const PORT = Number(process.env.PORT ?? 3000);

connectMongo().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
```

- [x] **Step 3: Commit**

```bash
git add src/server/routers/auth.ts src/server/index.ts
git commit -m "feat: Google OAuth2 strategy, Express app entry, JWT issuance"
```

---

### Task 7: Teams tRPC router

**Files:**
- Create: `src/server/routers/teams.ts`

- [x] **Step 1: Write `src/server/routers/teams.ts`**

```ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { getMysqlPool } from '../db/mysql';

export const teamsRouter = router({
  leagues: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<any[]>('SELECT id, name, slug FROM gamedays_league ORDER BY name');
    return rows;
  }),

  seasons: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<any[]>('SELECT id, name, slug FROM gamedays_season ORDER BY name DESC');
    return rows;
  }),

  byLeagueSeason: protectedProcedure
    .input(z.object({ leagueId: z.number(), seasonId: z.number() }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      // SeasonLeagueTeam is a many-to-many through table
      const [rows] = await pool.query<any[]>(
        `SELECT t.id, t.name, t.description, t.location
         FROM gamedays_team t
         JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
         JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
         WHERE slt.league_id = ? AND slt.season_id = ?
           AND t.location != 'dummy'
         ORDER BY t.name`,
        [input.leagueId, input.seasonId]
      );
      return rows;
    }),
});
```

- [x] **Step 2: Commit**

```bash
git add src/server/routers/teams.ts
git commit -m "feat: teams tRPC router — leagues, seasons, byLeagueSeason from MySQL"
```

---

### Task 8: Finance calculation engine (TDD)

**Files:**
- Create: `src/server/lib/financeCalculator.ts`
- Create: `src/server/lib/__tests__/financeCalculator.test.ts`

- [x] **Step 1: Write the failing tests first**

Create `src/server/lib/__tests__/financeCalculator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateCosts } from '../financeCalculator';

const base = {
  expectedTeamsCount: 0,
  expectedGamedaysCount: 0,
  expectedTeamsPerGameday: 0,
  discounts: [] as Array<{ type: 'FIXED' | 'PERCENT'; value: number }>,
};

describe('calculateCosts — SEASON model', () => {
  it('computes gross as teamCount × baseRate', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      participation: [],
      expectedTeamsCount: 3,
    });
    expect(result.gross).toBe(100);
    expect(result.net).toBe(100);
    expect(result.discount).toBe(0);
    expect(result.liveParticipationCount).toBe(2);
    expect(result.expectedGross).toBe(150); // 3 × 50
  });

  it('applies a FIXED discount to gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [{ type: 'FIXED', value: 10 }],
    });
    expect(result.gross).toBe(50);
    expect(result.discount).toBe(10);
    expect(result.net).toBe(40);
  });

  it('applies a PERCENT discount to gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 100,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [{ type: 'PERCENT', value: 20 }],
    });
    expect(result.gross).toBe(100);
    expect(result.discount).toBe(20);
    expect(result.net).toBe(80);
  });

  it('stacks multiple discounts', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 100,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [
        { type: 'FIXED', value: 10 },
        { type: 'PERCENT', value: 10 },
      ],
    });
    expect(result.discount).toBe(20); // 10 + 10% of 100
    expect(result.net).toBe(80);
  });

  it('returns per-team details', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      participation: [],
    });
    expect(result.details).toHaveLength(2);
    expect(result.details![0]).toMatchObject({ teamId: 1, gross: 50 });
  });
});

describe('calculateCosts — GAMEDAY model', () => {
  it('computes gross from participation data', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'GAMEDAY',
      baseRate: 25,
      teams: [],
      participation: [
        { gamedayId: 1, teamIds: [1, 2, 3] },
        { gamedayId: 2, teamIds: [1, 2] },
      ],
      expectedGamedaysCount: 2,
      expectedTeamsPerGameday: 3,
    });
    expect(result.gross).toBe(125); // (3 + 2) × 25
    expect(result.liveParticipationCount).toBe(5);
    expect(result.expectedGross).toBe(150); // 2 × 3 × 25
    expect(result.details).toBeNull();
  });

  it('applies a FIXED discount to total gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'GAMEDAY',
      baseRate: 25,
      teams: [],
      participation: [{ gamedayId: 1, teamIds: [1, 2] }],
      discounts: [{ type: 'FIXED', value: 15 }],
    });
    expect(result.gross).toBe(50);
    expect(result.discount).toBe(15);
    expect(result.net).toBe(35);
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/server/lib/__tests__/financeCalculator.test.ts
```

Expected: FAIL — `Cannot find module '../financeCalculator'`

- [x] **Step 3: Implement `src/server/lib/financeCalculator.ts`**

```ts
export interface CalculationTeam {
  id: number;
  name: string;
}

export interface ParticipationEntry {
  gamedayId: number;
  teamIds: number[];
}

export interface CalculationDiscount {
  type: 'FIXED' | 'PERCENT';
  value: number;
}

export interface CalculationInput {
  costModel: 'SEASON' | 'GAMEDAY';
  baseRate: number;
  teams: CalculationTeam[];
  participation: ParticipationEntry[];
  discounts: CalculationDiscount[];
  expectedTeamsCount?: number;
  expectedGamedaysCount?: number;
  expectedTeamsPerGameday?: number;
}

export interface CalculationDetail {
  teamId: number;
  teamName: string;
  gross: number;
  discount: number;
  net: number;
}

export interface CalculationResult {
  gross: number;
  discount: number;
  net: number;
  baseRate: number;
  expectedGross: number;
  expectedParticipationCount: number;
  liveParticipationCount: number;
  details: CalculationDetail[] | null;
}

function applyDiscounts(gross: number, discounts: CalculationDiscount[]): number {
  return discounts.reduce((total, d) => {
    if (d.type === 'FIXED') return total + d.value;
    return total + (gross * d.value) / 100;
  }, 0);
}

export function calculateCosts(input: CalculationInput): CalculationResult {
  const {
    costModel,
    baseRate,
    teams,
    participation,
    discounts,
    expectedTeamsCount = 0,
    expectedGamedaysCount = 0,
    expectedTeamsPerGameday = 0,
  } = input;

  if (costModel === 'SEASON') {
    const details: CalculationDetail[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      gross: baseRate,
      discount: 0,
      net: baseRate,
    }));

    const gross = teams.length * baseRate;
    const discount = applyDiscounts(gross, discounts);

    return {
      gross,
      discount,
      net: gross - discount,
      baseRate,
      expectedGross: expectedTeamsCount * baseRate,
      expectedParticipationCount: expectedTeamsCount,
      liveParticipationCount: teams.length,
      details,
    };
  }

  // GAMEDAY model
  const liveParticipationCount = participation.reduce((sum, p) => sum + p.teamIds.length, 0);
  const gross = liveParticipationCount * baseRate;
  const discount = applyDiscounts(gross, discounts);

  return {
    gross,
    discount,
    net: gross - discount,
    baseRate,
    expectedGross: expectedGamedaysCount * expectedTeamsPerGameday * baseRate,
    expectedParticipationCount: expectedGamedaysCount * expectedTeamsPerGameday,
    liveParticipationCount,
    details: null,
  };
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/server/lib/__tests__/financeCalculator.test.ts
```

Expected: all 8 tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/server/lib/
git commit -m "feat: finance calculation engine with full test coverage (TDD)"
```

---

### Task 9: Finance settings + configs routers

**Files:**
- Create: `src/server/routers/finance/settings.ts`
- Create: `src/server/routers/finance/configs.ts`

- [x] **Step 1: Write `src/server/routers/finance/settings.ts`**

```ts
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { UpdateFinancialSettingsSchema } from '../../../../shared/schemas/financialSettings';
import { getOrCreateSettings } from '../../models/FinancialSettings';

export const settingsRouter = router({
  get: protectedProcedure.query(async () => {
    const settings = await getOrCreateSettings();
    return {
      defaultRatePerTeamSeason: settings.defaultRatePerTeamSeason,
      defaultRatePerTeamGameday: settings.defaultRatePerTeamGameday,
    };
  }),

  update: adminProcedure
    .input(UpdateFinancialSettingsSchema)
    .mutation(async ({ input }) => {
      const settings = await getOrCreateSettings();
      settings.defaultRatePerTeamSeason = input.defaultRatePerTeamSeason;
      settings.defaultRatePerTeamGameday = input.defaultRatePerTeamGameday;
      await settings.save();
      return {
        defaultRatePerTeamSeason: settings.defaultRatePerTeamSeason,
        defaultRatePerTeamGameday: settings.defaultRatePerTeamGameday,
      };
    }),
});
```

- [x] **Step 2: Write `src/server/routers/finance/configs.ts`**

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateFinancialConfigSchema, UpdateFinancialConfigSchema } from '../../../../shared/schemas/financialConfig';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';

export const configsRouter = router({
  list: protectedProcedure.query(async () => {
    return FinancialConfig.find().sort({ createdAt: -1 }).lean();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const config = await FinancialConfig.findById(input.id).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });
      const discounts = await Discount.find({ configId: input.id }).lean();
      return { config, discounts };
    }),

  create: adminProcedure
    .input(CreateFinancialConfigSchema)
    .mutation(async ({ input }) => {
      try {
        const config = await FinancialConfig.create(input);
        return config.toObject();
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A config for this league/season already exists.',
          });
        }
        throw err;
      }
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateFinancialConfigSchema }))
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' }).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });
      return config;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await Discount.deleteMany({ configId: input.id });
      await FinancialConfig.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
```

- [x] **Step 3: Commit**

```bash
git add src/server/routers/finance/
git commit -m "feat: finance settings and configs tRPC routers"
```

---

### Task 10: Finance discounts + dashboard + calculate routers

**Files:**
- Create: `src/server/routers/finance/discounts.ts`
- Create: `src/server/routers/finance/dashboard.ts`
- Create: `src/server/routers/finance/calculate.ts`

- [x] **Step 1: Write `src/server/routers/finance/discounts.ts`**

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../../trpc';
import { AddDiscountSchema } from '../../../../shared/schemas/discount';
import { Discount } from '../../models/Discount';
import { FinancialConfig } from '../../models/FinancialConfig';

export const discountsRouter = router({
  add: adminProcedure
    .input(AddDiscountSchema)
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findById(input.configId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Config not found' });
      const discount = await Discount.create(input);
      return discount.toObject();
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await Discount.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
```

- [x] **Step 2: Write `src/server/routers/finance/dashboard.ts`**

```ts
import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';

export const dashboardRouter = router({
  summary: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const settings = await getOrCreateSettings();
    const configs = await FinancialConfig.find().lean();

    let totalGross = 0;
    let totalDiscount = 0;
    const configStats = [];

    for (const config of configs) {
      const discounts = await Discount.find({ configId: config._id }).lean();
      const discountInputs = discounts.map((d) => ({ type: d.type, value: d.value }));

      const baseRate =
        config.baseRateOverride ??
        (config.costModel === 'SEASON'
          ? settings.defaultRatePerTeamSeason
          : settings.defaultRatePerTeamGameday);

      let teams: Array<{ id: number; name: string }> = [];
      let participation: Array<{ gamedayId: number; teamIds: number[] }> = [];

      if (config.costModel === 'SEASON') {
        const [rows] = await pool.query<any[]>(
          `SELECT t.id, t.name FROM gamedays_team t
           JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
           JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
           WHERE slt.league_id = ? AND slt.season_id = ? AND t.location != 'dummy'`,
          [config.leagueId, config.seasonId]
        );
        teams = rows;
      } else {
        const [gamedays] = await pool.query<any[]>(
          'SELECT id FROM gamedays_gameday WHERE league_id = ? AND season_id = ?',
          [config.leagueId, config.seasonId]
        );
        for (const gd of gamedays) {
          const [playing] = await pool.query<any[]>(
            `SELECT DISTINCT gr.team_id as id FROM gamedays_gameresult gr
             JOIN gamedays_gameinfo gi ON gi.id = gr.gameinfo_id
             JOIN gamedays_team t ON t.id = gr.team_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy'`,
            [gd.id]
          );
          const [officiating] = await pool.query<any[]>(
            `SELECT DISTINCT gi.officials_id as id FROM gamedays_gameinfo gi
             JOIN gamedays_team t ON t.id = gi.officials_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy' AND gi.officials_id IS NOT NULL`,
            [gd.id]
          );
          const teamIds = [
            ...new Set([
              ...playing.map((r) => r.id),
              ...officiating.map((r) => r.id),
            ]),
          ].filter(Boolean);
          participation.push({ gamedayId: gd.id, teamIds });
        }
      }

      const stats = calculateCosts({
        costModel: config.costModel,
        baseRate,
        teams,
        participation,
        discounts: discountInputs,
        expectedTeamsCount: config.expectedTeamsCount,
        expectedGamedaysCount: config.expectedGamedaysCount,
        expectedTeamsPerGameday: config.expectedTeamsPerGameday,
      });

      totalGross += stats.gross;
      totalDiscount += stats.discount;
      configStats.push({ config, stats });
    }

    // Pending: league/season combos with gamedays but no config
    const configuredPairs = new Set(
      configs.map((c) => `${c.leagueId}:${c.seasonId}`)
    );
    const [gamedayRows] = await pool.query<any[]>(
      `SELECT gd.league_id, gd.season_id, l.name as league_name, s.name as season_name, COUNT(gd.id) as gameday_count
       FROM gamedays_gameday gd
       JOIN gamedays_league l ON l.id = gd.league_id
       JOIN gamedays_season s ON s.id = gd.season_id
       GROUP BY gd.league_id, gd.season_id, l.name, s.name`
    );

    const pending = gamedayRows
      .filter((r) => !configuredPairs.has(`${r.league_id}:${r.season_id}`))
      .map((r) => ({
        leagueId: r.league_id,
        seasonId: r.season_id,
        leagueName: r.league_name,
        seasonName: r.season_name,
        gamedayCount: Number(r.gameday_count),
      }));

    return {
      totalGross,
      totalDiscount,
      totalNet: totalGross - totalDiscount,
      configStats,
      pending,
    };
  }),
});
```

- [x] **Step 3: Write `src/server/routers/finance/calculate.ts`**

```ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';

export const calculateRouter = router({
  forConfig: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const config = await FinancialConfig.findById(input.configId).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const settings = await getOrCreateSettings();
      const discounts = await Discount.find({ configId: input.configId }).lean();
      const discountInputs = discounts.map((d) => ({ type: d.type, value: d.value }));

      const baseRate =
        config.baseRateOverride ??
        (config.costModel === 'SEASON'
          ? settings.defaultRatePerTeamSeason
          : settings.defaultRatePerTeamGameday);

      let teams: Array<{ id: number; name: string }> = [];
      let participation: Array<{ gamedayId: number; teamIds: number[] }> = [];

      if (config.costModel === 'SEASON') {
        const [rows] = await pool.query<any[]>(
          `SELECT t.id, t.name FROM gamedays_team t
           JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
           JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
           WHERE slt.league_id = ? AND slt.season_id = ? AND t.location != 'dummy'`,
          [config.leagueId, config.seasonId]
        );
        teams = rows;
      } else {
        const [gamedays] = await pool.query<any[]>(
          'SELECT id FROM gamedays_gameday WHERE league_id = ? AND season_id = ?',
          [config.leagueId, config.seasonId]
        );
        for (const gd of gamedays) {
          const [playing] = await pool.query<any[]>(
            `SELECT DISTINCT gr.team_id as id FROM gamedays_gameresult gr
             JOIN gamedays_gameinfo gi ON gi.id = gr.gameinfo_id
             JOIN gamedays_team t ON t.id = gr.team_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy'`,
            [gd.id]
          );
          const [officiating] = await pool.query<any[]>(
            `SELECT DISTINCT gi.officials_id as id FROM gamedays_gameinfo gi
             JOIN gamedays_team t ON t.id = gi.officials_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy' AND gi.officials_id IS NOT NULL`,
            [gd.id]
          );
          const teamIds = [
            ...new Set([...playing.map((r) => r.id), ...officiating.map((r) => r.id)]),
          ].filter(Boolean);
          participation.push({ gamedayId: gd.id, teamIds });
        }
      }

      return calculateCosts({
        costModel: config.costModel,
        baseRate,
        teams,
        participation,
        discounts: discountInputs,
        expectedTeamsCount: config.expectedTeamsCount,
        expectedGamedaysCount: config.expectedGamedaysCount,
        expectedTeamsPerGameday: config.expectedTeamsPerGameday,
      });
    }),
});
```

- [x] **Step 4: Commit**

```bash
git add src/server/routers/finance/
git commit -m "feat: discounts, dashboard, and calculate tRPC routers"
```

---

### Task 11: Wire AppRouter + verify server starts

**Files:**
- Create: `src/server/routers/index.ts`

- [x] **Step 1: Write `src/server/routers/index.ts`**

```ts
import { router } from '../trpc';
import { authRouter } from './auth';
import { teamsRouter } from './teams';
import { settingsRouter } from './finance/settings';
import { configsRouter } from './finance/configs';
import { discountsRouter } from './finance/discounts';
import { dashboardRouter } from './finance/dashboard';
import { calculateRouter } from './finance/calculate';

export const appRouter = router({
  auth: authRouter,
  teams: teamsRouter,
  finance: router({
    settings: settingsRouter,
    configs: configsRouter,
    discounts: discountsRouter,
    dashboard: dashboardRouter,
    calculate: calculateRouter,
  }),
});

export type AppRouter = typeof appRouter;
```

- [x] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -p tsconfig.server.json --noEmit
```

Expected: exits 0 with no errors.

- [x] **Step 3: Smoke test — server starts**

```bash
cp .env.example .env
# Edit .env: ensure MONGO_URI is unset (will use in-memory)
npm run dev:server
```

Expected output includes:
```
MongoDB in-memory server started
Server running on http://localhost:3000
```

Press Ctrl+C to stop.

- [x] **Step 4: Commit**

```bash
git add src/server/routers/index.ts
git commit -m "feat: merged AppRouter — all tRPC routers wired"
```

---

### Task 12: tRPC client + React shell

**Files:**
- Create: `src/client/lib/trpc.ts`
- Create: `src/client/App.tsx`
- Create: `src/client/main.tsx`

- [x] **Step 1: Write `src/client/lib/trpc.ts`**

```ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/routers/index';

export const trpc = createTRPCReact<AppRouter>();

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        headers() {
          const token = getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

- [x] **Step 2: Write `src/client/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigDetailPage } from './pages/ConfigDetailPage';
import { ConfigNewPage } from './pages/ConfigNewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/config/new" element={<ConfigNewPage />} />
          <Route path="/config/:id" element={<ConfigDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [x] **Step 3: Write `src/client/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTrpcClient } from './lib/trpc';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
const trpcClient = createTrpcClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
```

- [x] **Step 4: Commit**

```bash
git add src/client/lib/trpc.ts src/client/App.tsx src/client/main.tsx
git commit -m "feat: tRPC React client, React Query provider, app shell with routing"
```

---

### Task 13: Auth pages + ProtectedRoute

**Files:**
- Create: `src/client/components/ProtectedRoute.tsx`
- Create: `src/client/pages/LoginPage.tsx`
- Create: `src/client/pages/AuthCallbackPage.tsx`

- [x] **Step 1: Write `src/client/components/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../lib/trpc';

export function ProtectedRoute() {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [x] **Step 2: Write `src/client/pages/LoginPage.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../lib/trpc';

export function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Leagues Finance</h1>
      {error === 'domain' && (
        <p style={{ color: 'red' }}>Only @bumbleflies.de accounts are allowed.</p>
      )}
      <a
        href="/auth/google"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: '#4285f4',
          color: '#fff',
          borderRadius: 4,
          textDecoration: 'none',
          fontWeight: 'bold',
        }}
      >
        Sign in with Google
      </a>
    </div>
  );
}
```

- [x] **Step 3: Write `src/client/pages/AuthCallbackPage.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../lib/trpc';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setToken(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login?error=auth', { replace: true });
    }
  }, [navigate]);

  return <p>Signing you in…</p>;
}
```

- [x] **Step 4: Commit**

```bash
git add src/client/components/ProtectedRoute.tsx src/client/pages/LoginPage.tsx src/client/pages/AuthCallbackPage.tsx
git commit -m "feat: login page, auth callback, protected route guard"
```

---

### Task 14: Dashboard page

**Files:**
- Create: `src/client/components/SummaryCards.tsx`
- Create: `src/client/components/ConfigsTable.tsx`
- Create: `src/client/components/PendingTable.tsx`
- Create: `src/client/pages/DashboardPage.tsx`

- [x] **Step 1: Write `src/client/components/SummaryCards.tsx`**

```tsx
interface Props {
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
}

const cardStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  padding: '1.5rem',
  borderRadius: 8,
  borderLeft: `6px solid ${color}`,
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
});

export function SummaryCards({ totalGross, totalDiscount, totalNet }: Props) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
      <div style={cardStyle('#0d6efd')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Gross Revenue</p>
        <h2 style={{ margin: 0, color: '#0d6efd' }}>{totalGross.toFixed(2)} €</h2>
      </div>
      <div style={cardStyle('#dc3545')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Total Discounts</p>
        <h2 style={{ margin: 0, color: '#dc3545' }}>-{totalDiscount.toFixed(2)} €</h2>
      </div>
      <div style={cardStyle('#198754')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Projected Net</p>
        <h2 style={{ margin: 0, color: '#198754' }}>{totalNet.toFixed(2)} €</h2>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Write `src/client/components/ConfigsTable.tsx`**

```tsx
import { Link } from 'react-router-dom';

interface ConfigRow {
  config: { _id: string; leagueId: number; seasonId: number; costModel: string };
  stats: { gross: number; discount: number; net: number; expectedGross: number; liveParticipationCount: number };
}

interface Props {
  rows: ConfigRow[];
  leagueNames: Record<number, string>;
  seasonNames: Record<number, string>;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export function ConfigsTable({ rows, leagueNames, seasonNames, onDelete, isAdmin }: Props) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#e9ecef', color: '#495057' }}>
        <tr>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>League / Season</th>
          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Model</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Live Gross</th>
          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net</th>
          <th style={{ padding: '8px 12px' }} />
        </tr>
      </thead>
      <tbody>
        {rows.map(({ config, stats }) => (
          <tr key={config._id} style={{ borderBottom: '1px solid #dee2e6' }}>
            <td style={{ padding: '8px 12px' }}>
              <Link to={`/config/${config._id}`}>
                {leagueNames[config.leagueId] ?? config.leagueId} / {seasonNames[config.seasonId] ?? config.seasonId}
              </Link>
            </td>
            <td style={{ padding: '8px 12px' }}>{config.costModel}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.expectedGross.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.gross.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stats.net.toFixed(2)} €</td>
            <td style={{ padding: '8px 12px' }}>
              {isAdmin && (
                <button onClick={() => onDelete(config._id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [x] **Step 3: Write `src/client/components/PendingTable.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';

interface PendingRow {
  leagueId: number;
  seasonId: number;
  leagueName: string;
  seasonName: string;
  gamedayCount: number;
}

interface Props {
  rows: PendingRow[];
}

export function PendingTable({ rows }: Props) {
  const navigate = useNavigate();
  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ color: '#664d03' }}>⚠ Unconfigured League/Seasons</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#fff3cd', color: '#664d03' }}>
          <tr>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>League / Season</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gamedays</th>
            <th style={{ padding: '8px 12px' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.leagueId}:${row.seasonId}`} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '8px 12px' }}>{row.leagueName} / {row.seasonName}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.gamedayCount}</td>
              <td style={{ padding: '8px 12px' }}>
                <button
                  onClick={() => navigate(`/config/new?league=${row.leagueId}&season=${row.seasonId}`)}
                  style={{ padding: '4px 10px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  + Create Config
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [x] **Step 4: Write `src/client/pages/DashboardPage.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { trpc, clearToken } from '../lib/trpc';
import { SummaryCards } from '../components/SummaryCards';
import { ConfigsTable } from '../components/ConfigsTable';
import { PendingTable } from '../components/PendingTable';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data, isLoading, refetch } = trpc.finance.dashboard.summary.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const deleteConfig = trpc.finance.configs.delete.useMutation({ onSuccess: () => refetch() });

  const leagueNames: Record<number, string> = Object.fromEntries((leagues ?? []).map((l) => [l.id, l.name]));
  const seasonNames: Record<number, string> = Object.fromEntries((seasons ?? []).map((s) => [s.id, s.name]));

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>Error loading dashboard.</p>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Financial Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {me?.role === 'admin' && (
            <>
              <button onClick={() => navigate('/config/new')} style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                + New Config
              </button>
              <button onClick={() => navigate('/settings')} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Settings
              </button>
            </>
          )}
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'none', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <SummaryCards totalGross={data.totalGross} totalDiscount={data.totalDiscount} totalNet={data.totalNet} />
      <ConfigsTable
        rows={data.configStats as any}
        leagueNames={leagueNames}
        seasonNames={seasonNames}
        isAdmin={me?.role === 'admin'}
        onDelete={(id) => deleteConfig.mutate({ id })}
      />
      <PendingTable rows={data.pending} />
    </div>
  );
}
```

- [x] **Step 5: Commit**

```bash
git add src/client/components/SummaryCards.tsx src/client/components/ConfigsTable.tsx src/client/components/PendingTable.tsx src/client/pages/DashboardPage.tsx
git commit -m "feat: dashboard page with summary cards, configs table, and pending section"
```

---

### Task 15: Config detail page

**Files:**
- Create: `src/client/components/DiscountForm.tsx`
- Create: `src/client/components/DiscountList.tsx`
- Create: `src/client/pages/ConfigDetailPage.tsx`

- [x] **Step 1: Write `src/client/components/DiscountForm.tsx`**

```tsx
import { useState } from 'react';
import { trpc } from '../lib/trpc';

interface Props {
  configId: string;
  onAdded: () => void;
}

export function DiscountForm({ configId, onAdded }: Props) {
  const [type, setType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const addDiscount = trpc.finance.discounts.add.useMutation({ onSuccess: onAdded });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addDiscount.mutate({ configId, type, value: Number(value), description });
    setValue('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <select value={type} onChange={(e) => setType(e.target.value as 'FIXED' | 'PERCENT')} style={{ padding: '6px 10px' }}>
        <option value="FIXED">Fixed (€)</option>
        <option value="PERCENT">Percentage (%)</option>
      </select>
      <input type="number" min="0" step="0.01" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} required style={{ padding: '6px 10px', width: 100 }} />
      <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '6px 10px', flex: 1 }} />
      <button type="submit" style={{ padding: '6px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        + Add
      </button>
    </form>
  );
}
```

- [x] **Step 2: Write `src/client/components/DiscountList.tsx`**

```tsx
import { trpc } from '../lib/trpc';

interface Discount {
  _id: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  description: string;
}

interface Props {
  discounts: Discount[];
  isAdmin: boolean;
  onRemoved: () => void;
}

export function DiscountList({ discounts, isAdmin, onRemoved }: Props) {
  const removeDiscount = trpc.finance.discounts.remove.useMutation({ onSuccess: onRemoved });

  if (discounts.length === 0) return <p style={{ color: '#aaa' }}>No discounts.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {discounts.map((d) => (
        <li key={d._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
          <span>
            {d.type === 'FIXED' ? `${d.value.toFixed(2)} €` : `${d.value}%`}
            {d.description ? ` — ${d.description}` : ''}
          </span>
          {isAdmin && (
            <button onClick={() => removeDiscount.mutate({ id: d._id })} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [x] **Step 3: Write `src/client/pages/ConfigDetailPage.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { DiscountForm } from '../components/DiscountForm';
import { DiscountList } from '../components/DiscountList';

export function ConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data, isLoading, refetch } = trpc.finance.configs.get.useQuery({ id: id! });
  const { data: stats } = trpc.finance.calculate.forConfig.useQuery({ configId: id! });

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>Config not found.</p>;

  const { config, discounts } = data as any;
  const isAdmin = me?.role === 'admin';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', color: '#0d6efd' }}>
        ← Back to Dashboard
      </button>

      <h1>Config: League {config.leagueId} / Season {config.seasonId}</h1>
      <p><strong>Model:</strong> {config.costModel}</p>
      <p><strong>Base Rate Override:</strong> {config.baseRateOverride != null ? `${config.baseRateOverride} €` : 'Using global default'}</p>

      {stats && (
        <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>GROSS</p>
            <h3 style={{ margin: 0 }}>{stats.gross.toFixed(2)} €</h3>
          </div>
          <div style={{ flex: 1, padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>DISCOUNT</p>
            <h3 style={{ margin: 0, color: '#dc3545' }}>-{stats.discount.toFixed(2)} €</h3>
          </div>
          <div style={{ flex: 1, padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>NET</p>
            <h3 style={{ margin: 0, color: '#198754' }}>{stats.net.toFixed(2)} €</h3>
          </div>
        </div>
      )}

      <h3>Discounts</h3>
      <DiscountList discounts={discounts} isAdmin={isAdmin} onRemoved={refetch} />
      {isAdmin && <div style={{ marginTop: '1rem' }}><DiscountForm configId={id!} onAdded={refetch} /></div>}

      {stats?.details && (
        <>
          <h3 style={{ marginTop: '2rem' }}>Per-Team Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#e9ecef' }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Team</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {stats.details.map((d: any) => (
                <tr key={d.teamId} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '8px 12px' }}>{d.teamName}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{d.gross.toFixed(2)} €</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{d.net.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add src/client/components/DiscountForm.tsx src/client/components/DiscountList.tsx src/client/pages/ConfigDetailPage.tsx
git commit -m "feat: config detail page with discount management and cost breakdown"
```

---

### Task 16: Config new page

**Files:**
- Create: `src/client/pages/ConfigNewPage.tsx`

- [x] **Step 1: Write `src/client/pages/ConfigNewPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function ConfigNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: settings } = trpc.finance.settings.get.useQuery();
  const createConfig = trpc.finance.configs.create.useMutation({
    onSuccess: (config) => navigate(`/config/${(config as any)._id}`),
  });

  const [leagueId, setLeagueId] = useState(params.get('league') ?? '');
  const [seasonId, setSeasonId] = useState(params.get('season') ?? '');
  const [costModel, setCostModel] = useState<'SEASON' | 'GAMEDAY'>('SEASON');
  const [baseRateOverride, setBaseRateOverride] = useState('');
  const [expectedTeamsCount, setExpectedTeamsCount] = useState('0');
  const [expectedGamedaysCount, setExpectedGamedaysCount] = useState('0');
  const [expectedTeamsPerGameday, setExpectedTeamsPerGameday] = useState('0');

  const defaultRate = costModel === 'SEASON'
    ? settings?.defaultRatePerTeamSeason
    : settings?.defaultRatePerTeamGameday;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createConfig.mutate({
      leagueId: Number(leagueId),
      seasonId: Number(seasonId),
      costModel,
      baseRateOverride: baseRateOverride ? Number(baseRateOverride) : null,
      expectedTeamsCount: Number(expectedTeamsCount),
      expectedGamedaysCount: Number(expectedGamedaysCount),
      expectedTeamsPerGameday: Number(expectedTeamsPerGameday),
    });
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', color: '#0d6efd' }}>
        ← Back
      </button>
      <h1>New Finance Config</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          League
          <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }}>
            <option value="">— select —</option>
            {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label>
          Season
          <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} required style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }}>
            <option value="">— select —</option>
            {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Cost Model
          <select value={costModel} onChange={(e) => setCostModel(e.target.value as 'SEASON' | 'GAMEDAY')} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }}>
            <option value="SEASON">Cost per team in season (Flat)</option>
            <option value="GAMEDAY">Cost per team per gameday</option>
          </select>
        </label>
        <label>
          Base Rate Override (€)
          <input type="number" min="0" step="0.01" placeholder={`System default: ${defaultRate ?? '—'} €`} value={baseRateOverride} onChange={(e) => setBaseRateOverride(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
        </label>
        {costModel === 'SEASON' && (
          <label>
            Expected Teams Count
            <input type="number" min="0" value={expectedTeamsCount} onChange={(e) => setExpectedTeamsCount(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
          </label>
        )}
        {costModel === 'GAMEDAY' && (
          <>
            <label>
              Expected Gamedays
              <input type="number" min="0" value={expectedGamedaysCount} onChange={(e) => setExpectedGamedaysCount(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
            </label>
            <label>
              Expected Teams per Gameday
              <input type="number" min="0" value={expectedTeamsPerGameday} onChange={(e) => setExpectedTeamsPerGameday(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
            </label>
          </>
        )}
        <button type="submit" disabled={createConfig.isPending} style={{ padding: '10px 24px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {createConfig.isPending ? 'Creating…' : 'Create Config'}
        </button>
        {createConfig.isError && <p style={{ color: 'red' }}>{createConfig.error.message}</p>}
      </form>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add src/client/pages/ConfigNewPage.tsx
git commit -m "feat: new config page with pre-fill from query params and dynamic rate hint"
```

---

### Task 17: Settings page

**Files:**
- Create: `src/client/pages/SettingsPage.tsx`

- [x] **Step 1: Write `src/client/pages/SettingsPage.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: settings, refetch } = trpc.finance.settings.get.useQuery();
  const updateSettings = trpc.finance.settings.update.useMutation({ onSuccess: () => refetch() });

  const [ratePerSeason, setRatePerSeason] = useState('');
  const [ratePerGameday, setRatePerGameday] = useState('');

  useEffect(() => {
    if (settings) {
      setRatePerSeason(String(settings.defaultRatePerTeamSeason));
      setRatePerGameday(String(settings.defaultRatePerTeamGameday));
    }
  }, [settings]);

  if (me?.role !== 'admin') return <p>Access denied.</p>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateSettings.mutate({
      defaultRatePerTeamSeason: Number(ratePerSeason),
      defaultRatePerTeamGameday: Number(ratePerGameday),
    });
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', color: '#0d6efd' }}>
        ← Back
      </button>
      <h1>Settings</h1>

      <h2>Global Rate Defaults</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Default Rate per Team per Season (€)
          <input type="number" min="0" step="0.01" value={ratePerSeason} onChange={(e) => setRatePerSeason(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
        </label>
        <label>
          Default Rate per Team per Gameday (€)
          <input type="number" min="0" step="0.01" value={ratePerGameday} onChange={(e) => setRatePerGameday(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginTop: 4 }} />
        </label>
        <button type="submit" disabled={updateSettings.isPending} style={{ padding: '10px 24px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {updateSettings.isPending ? 'Saving…' : 'Save'}
        </button>
        {updateSettings.isSuccess && <p style={{ color: '#198754' }}>Saved.</p>}
      </form>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add src/client/pages/SettingsPage.tsx
git commit -m "feat: settings page — global rate defaults (admin only)"
```

---

### Task 18: Docker Compose + Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [x] **Step 1: Write `Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [x] **Step 2: Update `src/server/index.ts` to serve Vite build in production**

Add these lines before the tRPC handler mount in `src/server/index.ts`:

```ts
import path from 'path';

// Serve Vite build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
  });
}
```

Note: Place this block AFTER the tRPC handler so `/trpc` routes are matched first.

Actually place it AFTER the tRPC handler:

```ts
// tRPC handler (already present)
app.use('/trpc', trpcExpress.createExpressMiddleware({ router: appRouter, createContext }));

// Serve built client in production (add these lines)
if (process.env.NODE_ENV === 'production') {
  const clientDir = path.join(__dirname, '../../client');
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}
```

- [x] **Step 3: Write `docker-compose.yml`**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      NODE_ENV: production
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: leagues_finance
    restart: unless-stopped

volumes:
  mongo_data:
```

- [x] **Step 4: Update `.env.example` with prod MongoDB URI**

Add to `.env.example`:
```
# Production MongoDB (set this when running with Docker Compose)
# MONGO_URI=mongodb://mongo:27017/leagues_finance
```

- [x] **Step 5: Verify full build succeeds**

```bash
npm run build
```

Expected: Vite builds `dist/client/`, `tsc` compiles server to `dist/`.

- [x] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example src/server/index.ts
git commit -m "feat: Dockerfile and Docker Compose for production deployment"
```

---

### Task 19: End-to-end smoke test

- [x] **Step 1: Start full dev stack**

```bash
cp .env.example .env
# Ensure MONGO_URI is commented out (uses in-memory)
npm run dev
```

Expected: Vite on `http://localhost:5173`, Express on `http://localhost:3000`

- [x] **Step 2: Verify login redirect**

Open `http://localhost:5173`. Expected: redirects to `/login` and shows "Sign in with Google" button.

- [x] **Step 3: Verify tRPC is reachable**

```bash
curl http://localhost:3000/trpc/finance.settings.get
```

Expected: `{"error":{"code":-32001,...,"message":"UNAUTHORIZED"}}` — correct, no token sent.

- [x] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS (finance calculator suite).

- [x] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: end-to-end smoke test verified — ready for OAuth callback URL registration"
```

---

## Notes for Deployment

1. **Google OAuth callback URL** — before going live, add the production callback URL to Google Cloud Console under `Authorized redirect URIs` for project `league-finance`.
2. **JWT_SECRET** — generate a strong secret: `openssl rand -hex 32`
3. **MongoDB URI** — set `MONGO_URI=mongodb://mongo:27017/leagues_finance` in production `.env`
4. **LS DB credentials** — copy from `secret_main.yaml` into production `.env`
