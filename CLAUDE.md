# CLAUDE.md — Atlaes / VBL Unified Platform

## Project Overview

Unified backend architecture supporting 4 German pension refund platforms (VBL, GPR, RPT, DIY).
Monorepo managed with pnpm workspaces. Proprietary software owned by ATLAES GmbH.

## Monorepo Structure

```
apps/
  web/          # Vite + React landing/marketing site
  vbl/          # Next.js 14 (App Router) — VBL frontend
  gpr/          # Next.js 14 (App Router) — GPR frontend
packages/
  functions/    # Hono.js backend + Lambda functions (@vbl/functions)
  core/         # Shared business logic
  ui/           # Shared UI components
  types/        # Shared TypeScript types
resources/      # SST infrastructure definitions (network, database, storage, services, web)
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) for VBL/GPR, Vite + React for web
- **Backend**: Hono.js on Node.js 20, deployed via SST v3 (AWS Lambda)
- **Database**: PostgreSQL 15 with Drizzle ORM, multi-schema (shared, gpr, claims)
- **Cache**: Redis 7
- **Validation**: Zod (env vars, request bodies via @hono/zod-validator)
- **Auth**: JWT (magic link + Google OAuth), middleware in `packages/functions/src/middleware/auth.ts`
- **Styling**: Tailwind CSS
- **State**: Zustand (GPR), React Hook Form + Zod resolvers
- **Infrastructure**: SST v3 on AWS (eu-central-1), profile `atlaes`

## Commands (run from repo root)

```bash
# Setup
pnpm install && pnpm docker:up && pnpm db:migrate   # or: pnpm setup

# Development
pnpm dev              # Starts Docker + SST backend + GPR frontend
pnpm dev:all          # Starts Docker + SST + web + vbl + gpr
pnpm sst:dev          # Backend only (SST dev mode)
pnpm web:dev          # Web (Vite) only
pnpm vbl:dev          # VBL frontend only
pnpm gpr:dev          # GPR frontend only

# Database
pnpm db:generate      # Generate Drizzle migrations from schema changes
pnpm db:migrate       # Apply migrations (drizzle-kit push:pg)
pnpm db:studio        # Drizzle Studio GUI

# Code quality
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm type-check       # tsc --noEmit

# Testing (from packages/functions/)
pnpm test             # Vitest watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
# Single file: pnpm vitest run src/services/gpr-calculation.test.ts

# Build & Deploy
pnpm build            # Build all packages
pnpm sst:deploy       # Deploy to AWS (staging)
```

## Ports

| Service    | Port |
|------------|------|
| VBL (Next) | 3000 |
| Backend    | 3001 |
| GPR (Next) | 3002 |
| Drizzle Studio | 3002 (on-demand) |
| PostgreSQL | 5432 |
| Redis      | 6379 |

## Database Schemas

Defined in `packages/functions/src/drizzle/schema/`:
- `shared.ts` — users, profiles, documents, signatures, audit_logs
- `gpr.ts` — GPR applications, pending sessions
- `claims.ts` — claims, claim documents, workflow states

## Backend Conventions (packages/functions)

- Entry point: `src/index.ts` (Hono server)
- Routes in `src/routes/`, services in `src/services/`
- Middleware: auth, cors, error-handler, logger, rate-limiter (in `src/middleware/`)
- Env validation via Zod in `src/utils/env.ts`; supports SST resource injection in prod
- Tests use Vitest with real PostgreSQL. Helpers: `createTestUser()`, `cleanupTestUser()` from `src/test/helpers.ts`
- Build: esbuild via custom `build.js`

## Code Style

- Prettier: single quotes, trailing commas (es5), semicolons, 2-space indent, 80 char width, LF endings
- ESLint with TypeScript parser + prettier plugin
- Husky + lint-staged for pre-commit hooks

## SST / AWS

- Config: `sst.config.ts` — app name `atlaes`, region `eu-central-1`
- Resources split into: network, database, storage, services, web (in `resources/`)
- Staging deploys all resources; other stages deploy web only
- AWS profile: `atlaes` (set automatically by scripts)
- Production API: `https://api.atlaes.de`, Staging: `https://staging.api.atlaes.de`

## Docker

```bash
pnpm docker:up        # Start PostgreSQL + Redis
pnpm docker:down      # Stop
pnpm docker:reset     # Stop, remove volumes, restart (destroys data)
pnpm reset            # docker:reset + db:migrate
```

Default credentials: `vbl_user` / `vbl_password` / `vbl_development`
