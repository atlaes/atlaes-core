# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the `packages/functions` package — the Hono.js backend for the Atlaes/VBL Unified Platform. See the root `CLAUDE.md` for monorepo-wide context.

## Commands (run from this directory)

```bash
# Development
pnpm dev                 # tsx watch mode on src/index.ts (port 3001)
pnpm build               # esbuild bundle via build.js
pnpm type-check          # tsc --noEmit

# Testing (requires Docker PostgreSQL running: pnpm docker:up from root)
pnpm test                # Vitest watch mode
pnpm test:run            # Single run
pnpm test:coverage       # With v8 coverage
pnpm vitest run src/services/gpr-calculation.test.ts  # Single file

# Database
pnpm db:generate         # Generate Drizzle migrations from schema
pnpm db:push             # Push schema to DB (drizzle-kit push:pg)
pnpm db:studio           # Drizzle Studio GUI
```

## Architecture

### Request Flow

```
Hono app (src/index.ts)
  → Global middleware (cors → security → logger → rate-limiter → error-handler)
    → Route handlers (src/routes/*.ts)
      → Services (src/services/*.ts)
        → Drizzle ORM (src/utils/db.ts → src/drizzle/schema/)
```

### Key Directories

- `src/routes/` — Hono route handlers. Each file exports a `Hono` instance mounted at `/api/<name>`. Tests co-located as `*.test.ts`.
- `src/services/` — Business logic. Calculation engines (vbl-calculation, gpr-calculation), application services (gpr-application, claims-application), user service, Mindee OCR integration. Tests co-located.
- `src/middleware/` — auth (JWT Bearer), cors, error-handler, logger, rate-limiter, security headers.
- `src/utils/` — env (Zod-validated config), db (Drizzle + postgres.js), auth (AuthService: JWT tokens, magic links, password hashing), logger, s3.
- `src/drizzle/schema/` — Multi-schema PostgreSQL: `shared` (users, profiles, documents, signatures), `vbl` (applications), `gpr` (applications, pending_sessions), `claims` (claims, claim_documents, workflow_states). All use `pgSchema()` for schema namespacing.
- `src/data/` — Static JSON data (contributions).
- `src/test/` — Test infrastructure: `globalSetup.ts` (env vars), `setup.ts` (DB connection lifecycle), `helpers.ts` (createTestUser, cleanupAllTestData, generateTestToken), `fixtures.ts`.
- `src/integration/` — Integration tests (user-journey).

### Auth Pattern

JWT-based with magic link and Google/Apple OAuth. The `authMiddleware` verifies Bearer tokens and sets `c.get('user')` (type `AuthUser` with `id`, `email`, `emailVerified`). Use `optionalAuthMiddleware` for routes that work with or without auth. Auth utilities are in `src/utils/auth.ts` (`AuthService` class).

### Environment Config

`src/utils/env.ts` validates all env vars via Zod at startup. In SST production, database credentials are injected via `SST_RESOURCE_AtlaesDatabase`. Locally, falls back to `DATABASE_URL` or default Docker credentials. The `.env` file lives at the repo root (`../../.env` relative to this package).

### Database Access

Single Drizzle instance exported from `src/utils/db.ts`. Uses `postgres` (postgres.js) driver, not `pg`. Schema uses Drizzle's `pgSchema()` for PostgreSQL schema namespacing (shared, vbl, gpr, claims — not the default `public` schema).

### Build

`build.js` uses esbuild to bundle `src/index.ts` targeting Node 20, with most dependencies externalized. Also copies `src/data/` to `dist/data/`.

## Testing Conventions

- Tests require a running PostgreSQL instance (Docker).
- Tests run sequentially (`fileParallelism: false`, `isolate: false`) for DB isolation.
- `globalSetup.ts` sets `NODE_ENV=test` and `JWT_SECRET` before module loading.
- `setup.ts` manages DB connection lifecycle (beforeAll/afterAll).
- Use `createTestUser()` to create a user+profile+tokens, `cleanupAllTestData()` to clean up test email patterns (`test-*@example.com`).
- Use `createTestApp(router)` to mount a single router for isolated route testing.
- Test timeout is 30 seconds.

## Route Naming

Routes are mounted with the `/api/` prefix in `src/index.ts`:
- `/api/health`, `/api/auth`, `/api/users`, `/api/vbl`, `/api/gpr`, `/api/claims`, `/api/documents`, `/api/signatures`
