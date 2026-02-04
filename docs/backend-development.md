# Backend Development Documentation

## Overview

This document provides comprehensive guidance for developing the Atlaes backend (`packages/functions`). It covers local setup, running the development server, database configuration, testing, and deployment.

**Location**: `packages/functions/`
**Framework**: Hono (lightweight web framework)
**Runtime**: Node.js 20
**Database**: PostgreSQL 15 with Drizzle ORM
**Deployment**: SST (Serverless Stack) on AWS

---

## Quick Start

```bash
# From repository root
pnpm install                    # Install all dependencies
pnpm docker:up                  # Start PostgreSQL + Redis containers
pnpm db:migrate                 # Run database migrations
pnpm dev                        # Start all services (frontend + backend)

# Or just the backend
cd packages/functions
pnpm dev                        # Hot reload dev server on port 3001
```

**Verify it's working:**
```bash
curl http://localhost:3001/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Prerequisites

- **Node.js 20+**
- **pnpm** (package manager)
- **Docker** (for PostgreSQL and Redis)
- **AWS CLI** (for SST deployment, optional for local dev)

---

## Environment Configuration

### Required Environment Variables

Create `/packages/functions/.env`:

```env
# Database
DATABASE_URL=postgresql://vbl_user:vbl_password@localhost:5432/vbl_development

# Cache
REDIS_URL=redis://localhost:6379

# Authentication (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application
NODE_ENV=development
PORT=3001

# Frontend URL (for CORS and magic links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: AWS (for SST deployment)
AWS_PROFILE=atlaes
AWS_REGION=eu-central-1
```

### Environment Validation

The backend uses Zod for environment validation (`src/utils/env.ts`):
- Validates all required variables on startup
- Provides sensible defaults for optional variables
- Supports SST resource injection for production

---

## Development Commands

### Running the Server

| Command | Description |
|---------|-------------|
| `pnpm dev` | Hot reload mode (tsx watch) |
| `pnpm start` | Run compiled code from `dist/` |
| `pnpm sst:dev` | SST development mode (AWS integration) |

### Database Operations

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only, no migration) |
| `pnpm db:studio` | Open Drizzle Studio (port 3002) |

### Building

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build with esbuild |
| `pnpm build:tsc` | TypeScript compilation only |

---

## Database Setup

### Docker Services

The project uses Docker Compose for local services:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: vbl-postgres
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: vbl_user
      POSTGRES_PASSWORD: vbl_password
      POSTGRES_DB: vbl_development

  redis:
    image: redis:7-alpine
    container_name: vbl-redis
    ports: ["6379:6379"]
```

**Commands:**
```bash
pnpm docker:up      # Start containers
pnpm docker:down    # Stop containers
pnpm docker:reset   # Stop, remove volumes, restart
```

### Database Schemas

The database uses multiple PostgreSQL schemas:
- `shared` - Users, profiles, documents, signatures, audit logs
- `gpr` - GPR applications, pending sessions
- `claims` - Claims, claim documents, workflow states

### Drizzle ORM

Schema files are in `src/drizzle/schema/`:
```
src/drizzle/
├── schema/
│   ├── shared.ts      # Shared tables (users, profiles, etc.)
│   ├── gpr.ts         # GPR-specific tables
│   └── claims.ts      # Claims-specific tables
├── migrations/        # Generated migrations
└── index.ts           # Schema exports
```

---

## Project Structure

```
packages/functions/src/
├── index.ts                    # App entry point (Hono server)
├── routes/                     # API route handlers
│   ├── auth.ts                 # Authentication (magic link, OAuth)
│   ├── gpr.ts                  # GPR calculator endpoints
│   ├── claims.ts               # Claims management
│   ├── users.ts                # User management
│   └── health.ts               # Health check
├── services/                   # Business logic
│   ├── user.ts                 # User service
│   ├── gpr-calculation.ts      # Refund calculation
│   ├── gpr-application.ts      # GPR application management
│   └── claims-application.ts   # Claims processing
├── middleware/                 # Express middleware
│   ├── auth.ts                 # JWT authentication
│   ├── cors.ts                 # CORS configuration
│   ├── error-handler.ts        # Global error handling
│   ├── logger.ts               # Request logging
│   └── rate-limiter.ts         # Rate limiting
├── drizzle/                    # Database layer
│   ├── schema/                 # Table definitions
│   └── migrations/             # Migration files
├── utils/                      # Utilities
│   ├── env.ts                  # Environment config
│   ├── db.ts                   # Database connection
│   ├── auth.ts                 # JWT utilities
│   └── logger.ts               # Logging (Pino)
└── test/                       # Test utilities
    ├── setup.ts                # Test environment setup
    ├── helpers.ts              # Test helpers
    └── fixtures.ts             # Test data
```

---

## Testing

### Test Framework

- **Vitest** for unit and integration tests
- Uses real PostgreSQL database (same as development)
- Tests run sequentially for database isolation

### Running Tests

| Command | Description |
|---------|-------------|
| `pnpm test` | Watch mode |
| `pnpm test:run` | Run once |
| `pnpm test:coverage` | With coverage report |
| `pnpm test:ui` | Vitest UI dashboard |

### Test Structure

```
src/
├── services/
│   ├── gpr-calculation.test.ts     # 19 tests
│   ├── gpr-application.test.ts     # 26 tests
│   └── claims-application.test.ts  # 38 tests
├── routes/
│   ├── auth.test.ts                # 19 tests
│   ├── gpr.test.ts                 # 24 tests
│   └── claims.test.ts              # 31 tests
└── integration/
    └── user-journey.test.ts        # 7 tests
```

**Total: 164 tests**

### Writing Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, cleanupTestUser } from '../test/helpers';

describe('MyService', () => {
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const testUser = await createTestUser();
    userId = testUser.userId;
    token = testUser.token;
  });

  afterAll(async () => {
    await cleanupTestUser(userId);
  });

  it('should do something', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

---

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/magic-link/request` - Request magic link email
- `POST /api/auth/magic-link/verify` - Verify magic link token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/logout` - Logout (protected)

### GPR (German Pension Refund)
- `POST /api/gpr/calculate-simple` - Calculate refund estimate
- `POST /api/gpr/session` - Save pending session
- `GET /api/gpr/session/:email` - Get pending session
- `GET /api/gpr/applications` - List user applications (protected)
- `POST /api/gpr/migrate-session` - Migrate session to application

### Claims
- `POST /api/claims` - Create new claim (protected)
- `GET /api/claims` - List user claims (protected)
- `GET /api/claims/:id` - Get claim details (protected)
- `PUT /api/claims/:id` - Update claim (protected)
- `DELETE /api/claims/:id` - Delete draft claim (protected)
- `PUT /api/claims/:id/steps/:stepName` - Update step completion
- `POST /api/claims/:id/workflow` - Transition workflow state
- `GET /api/claims/:id/validate` - Validate for submission
- `POST /api/claims/:id/submit` - Submit claim

---

## Deployment

### SST Configuration

The backend deploys to AWS using SST:

```bash
# Deploy to staging
pnpm sst:deploy

# Deploy to production
NODE_ENV=production pnpm sst:deploy
```

**Production URLs:**
- API: `https://api.atlaes.de`
- Staging: `https://staging.api.atlaes.de`

### CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) handles:
- Linting and type checking
- Running tests
- Building Docker image
- Deploying to AWS

---

## Troubleshooting

### Common Issues

**Database connection fails:**
```bash
# Ensure Docker is running
pnpm docker:up

# Check container status
docker ps

# View PostgreSQL logs
docker logs vbl-postgres
```

**JWT errors in tests:**
- Ensure `JWT_SECRET` is set in `.env`
- The test setup automatically configures test secrets

**Port already in use:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Migration issues:**
```bash
# Reset database (WARNING: destroys data)
pnpm docker:reset
pnpm db:migrate
```

---

## Development Tips

1. **Use Drizzle Studio** for visual database inspection: `pnpm db:studio`

2. **Hot reload** is enabled by default with `pnpm dev` - changes apply instantly

3. **Test a specific file**: `pnpm vitest run src/services/gpr-calculation.test.ts`

4. **Debug logging**: Set `LOG_LEVEL=debug` in `.env` for verbose output

5. **API testing**: Use the health endpoint to verify server is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | Application entry point |
| `src/utils/env.ts` | Environment configuration |
| `src/utils/db.ts` | Database connection |
| `vitest.config.mts` | Test configuration |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `Dockerfile` | Production container image |
| `build.js` | Custom esbuild configuration |

---

*Last updated: December 2024*
