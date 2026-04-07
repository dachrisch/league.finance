# Leagues Finance

A standalone financial dashboard for managing league revenues, discounts, and configurations.

## Tech Stack

- **Frontend**: React 19, Vite, tRPC Client, TanStack Query.
- **Backend**: Node.js (tsx), Express, tRPC Server.
- **Databases**: 
  - **MySQL**: Read-only access to legacy LeagueSphere data.
  - **MongoDB**: Primary application data (Mongoose).
- **Auth**: Google OAuth 2.0 + JWT.

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env` and fill in the required secrets (Google OAuth, MySQL credentials).

3. **Development**:
   ```bash
   npm run dev
   ```
   Starts both the backend (port 3000) and frontend (Vite dev server).

## Scripts

- `npm run dev`: Concurrent server and client development.
- `npm run build`: Production build (Vite + Server TSC).
- `npm run test`: Run Vitest suites.
- `npm run typecheck`: Client-side type checking.
- `npm run typecheck:server`: Server-side type checking.
