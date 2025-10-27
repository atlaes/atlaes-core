# VBL Unified Platform

A unified backend architecture supporting 4 German pension refund platforms: VBL, GPR, RPT, and DIY.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: Hono.js with TypeScript
- **Database**: PostgreSQL 15 with Drizzle ORM
- **Cache**: Redis 7
- **Infrastructure**: SST v3 (AWS)
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd vbl-unified-platform
   pnpm install
   ```

2. **Run the setup script:**

   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Start development:**
   ```bash
   pnpm dev
   ```

### Manual Setup

If you prefer manual setup:

1. **Start Docker services:**

   ```bash
   pnpm docker:up
   ```

2. **Run database migrations:**

   ```bash
   pnpm db:migrate
   ```

3. **Start all services:**
   ```bash
   pnpm dev
   ```

## 📊 Available Services

| Service             | URL                              | Description          |
| ------------------- | -------------------------------- | -------------------- |
| **Frontend**        | http://localhost:3000            | Next.js VBL frontend |
| **Backend API**     | http://localhost:3001            | Hono.js backend      |
| **Database Studio** | `pnpm db:studio`                 | Drizzle Studio GUI   |
| **Health Check**    | http://localhost:3001/api/health | API health status    |

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start all services
pnpm web:dev          # Start only frontend
pnpm sst:dev          # Start only SST backend

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open database GUI
pnpm db:push          # Push schema changes

# Docker
pnpm docker:up        # Start Docker services
pnpm docker:down       # Stop Docker services
pnpm docker:reset     # Reset Docker services

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Run Prettier
pnpm type-check       # Run TypeScript check

# Build & Deploy
pnpm build            # Build all packages
pnpm sst:deploy       # Deploy to AWS

# Utilities
pnpm setup            # One-command setup
pnpm reset            # Reset development environment
pnpm clean            # Clean build artifacts
```

## 📁 Project Structure

```
vbl-unified-platform/
├── apps/
│   ├── web/                   # Next.js VBL frontend
│   └── admin/                 # Admin dashboard (future)
├── packages/
│   ├── functions/             # Hono backend + Lambda functions
│   │   ├── src/
│   │   │   ├── shared/         # Reusable services (70%)
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   ├── users/      # User management
│   │   │   │   ├── documents/  # Document handling
│   │   │   │   └── signature/  # Signature system
│   │   │   ├── vbl/            # VBL-specific (30%)
│   │   │   │   ├── calculator/ # Eligibility calculator
│   │   │   │   ├── lettershop/ # Lettershop integration
│   │   │   │   └── workflow/   # Workflow engine
│   │   │   └── drizzle/        # Database schemas
│   │   └── package.json
│   ├── core/                  # Shared business logic
│   ├── ui/                    # Shared UI components
│   └── types/                 # TypeScript types
├── scripts/                   # Development scripts
├── docker-compose.yml         # Local development services
├── sst.config.ts             # SST infrastructure config
└── package.json              # Root package.json
```

## 🗄️ Database Schema

### Shared Schema (70% reusability)

- `users` - User accounts and authentication
- `profiles` - User profile information
- `documents` - Document metadata and OCR data
- `signatures` - Hand-drawn signatures
- `audit_logs` - Compliance and audit trails

### VBL Schema (Platform-specific)

- `applications` - VBL refund applications
- `calculation_logs` - Eligibility calculation audit
- `workflow_states` - Application workflow tracking

## 🔧 Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://vbl_user:vbl_password@localhost:5432/vbl_development
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001

# AWS Configuration
AWS_PROFILE=atlaes
AWS_REGION=eu-central-1
```

## ☁️ AWS Configuration

This project is configured to automatically use the `atlaes` AWS profile for all SST operations.

### AWS Profile Setup

1. **Configure AWS CLI with the atlaes profile:**

   ```bash
   aws configure --profile atlaes
   ```

2. **Verify the profile works:**

   ```bash
   aws sts get-caller-identity --profile atlaes
   ```

3. **The project automatically uses the atlaes profile** - no manual configuration needed!

### Manual AWS Environment Setup (Optional)

If you need to manually set AWS environment variables:

```bash
# Source the AWS environment script
source setup-aws-env.sh

# Or manually export
export AWS_PROFILE=atlaes
export AWS_REGION=eu-central-1
```

### SST Commands

All SST commands now automatically use the `atlaes` profile:

```bash
pnpm sst:dev      # Development mode
pnpm sst:deploy   # Deploy to AWS
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## 🚀 Deployment

### Development

```bash
pnpm sst:deploy
```

### Production

```bash
NODE_ENV=production pnpm sst:deploy
```

## 📋 Development Phases

- ✅ **Phase 1**: Infrastructure Setup (Current)
- 🔄 **Phase 2**: Authentication System
- 🔄 **Phase 3**: VBL Calculator Engine
- 🔄 **Phase 4**: Document Management & OCR
- 🔄 **Phase 5**: Payment Processing
- 🔄 **Phase 6**: Signature System
- 🔄 **Phase 7**: Lettershop Integration
- 🔄 **Phase 8**: Admin Dashboard
- 🔄 **Phase 9**: Testing & Security
- 🔄 **Phase 10**: Production Deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by ATLAES GmbH.

## 🆘 Troubleshooting

### Common Issues

**Docker services won't start:**

```bash
pnpm docker:down
pnpm docker:up
```

**Database connection issues:**

```bash
pnpm docker:reset
pnpm db:migrate
```

**Port conflicts:**

- Frontend (3000): Change in `apps/web/package.json`
- Backend (3001): Change in `packages/functions/src/utils/env.ts`
- PostgreSQL (5432): Change in `docker-compose.yml`
- Redis (6379): Change in `docker-compose.yml`

**Permission issues on scripts:**

```bash
chmod +x scripts/*.sh
```

## 📞 Support

For technical support, contact the development team or create an issue in the repository.
