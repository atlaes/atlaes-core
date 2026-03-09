# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VBL is a Next.js 14 frontend app for German pension refund applications (VBL = Versorgungsanstalt des Bundes und der Laender). It is part of the Atlaes monorepo (`apps/vbl`), which also contains `apps/web` (marketing site) and `apps/gpr` (another pension platform). The backend lives in `packages/functions` (Hono.js API).

## Commands

```bash
# Development (from monorepo root)
pnpm vbl:dev              # Start VBL Next.js dev server (port 3000)
pnpm dev                  # Start all services (Docker + SST + GPR)
pnpm dev:all              # Start everything including VBL

# Development (from apps/vbl)
pnpm dev                  # Next.js dev server
pnpm build                # Production build
pnpm lint                 # ESLint

# Backend (from monorepo root)
pnpm sst:dev              # SST dev mode (uses AWS profile "atlaes")
pnpm docker:up            # Start Postgres + Redis containers

# Database (from monorepo root)
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Push schema to Postgres
pnpm db:studio            # Drizzle Studio GUI

# Backend tests (from packages/functions)
pnpm test                 # Vitest (watch mode)
pnpm test:run             # Single run
pnpm test:coverage        # With coverage

# E2E tests (from apps/vbl)
npx playwright test                        # Run all e2e tests
npx playwright test e2e/onboarding.spec.ts # Run single spec
```

## Architecture

### Monorepo Structure

- **pnpm workspaces** with `apps/*` and `packages/*`
- **SST v3** for AWS infrastructure (region: `eu-central-1`, AWS profile: `atlaes`)
- VBL deploys as `sst.aws.Nextjs` to `vbl.atlaes.de` (prod) / `staging.vbl.atlaes.de` (staging)

### Frontend (apps/vbl)

- **Next.js 14 App Router** with `force-dynamic` rendering (no static generation)
- **Tailwind CSS** for styling; custom primary color palette in `tailwind.config.js`
- **Path alias**: `@/*` maps to project root (e.g., `@/components/...`, `@/lib/...`)
- **Auth**: `AuthContext` wraps the app via `Providers` component. Uses localStorage for JWT tokens (accessToken/refreshToken) with automatic refresh on 401.
- **API client**: Axios instance in `lib/api.ts` configured with `NEXT_PUBLIC_API_URL` base URL. All API calls go through this client which auto-attaches Bearer tokens.
- **Onboarding flow**: Multi-step form managed by `OnboardingContext` with 3 main steps (Account, Payment, Submit Details) and 6 sub-steps for details (Identity, Membership, Address, Bank Details, Signature, Review).
- **VBL Calculator**: Multi-step eligibility calculator in `components/vbl/` with qualification steps and job detail entry. Calculator logic hook in `hooks/useVBLCalculator.tsx`.

### Backend (packages/functions)

- **Hono.js** REST API running on port 3001
- **PostgreSQL 15** via Drizzle ORM with schemas: `shared`, `vbl`, `gpr`, `claims`
- **Redis 7** for caching
- Routes: `/api/auth`, `/api/claims`, `/api/documents`, `/api/signatures`, `/api/vbl`, `/api/gpr`, `/api/health`
- Auth methods: email/password, Google OAuth, Apple Sign-In, magic links
- Document processing via Mindee OCR; file storage on S3

### Key Data Flow

1. User enters via calculator or direct onboarding (`/calculator/onboarding/page.tsx`)
2. Auth handled via magic link or OAuth (tokens stored in localStorage)
3. Onboarding context collects identity, membership, address, bank details, signature
4. API calls in `lib/onboarding-api.ts` handle document upload, signature upload, claim creation/submission

## Code Style

- **Prettier**: single quotes, trailing commas (es5), semicolons, 2-space indent, 80 char width, LF line endings
- **ESLint**: extends `eslint:recommended` + `@typescript-eslint/recommended` + `prettier`
- **Pre-commit hook**: Husky runs lint-staged (ESLint fix + Prettier on staged files)
- Components use `'use client'` directive for client components; avoid unnecessary server components due to `force-dynamic` setting
