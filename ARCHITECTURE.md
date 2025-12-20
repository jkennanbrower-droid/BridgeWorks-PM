# BridgeWorks PM - Architecture Overview

## Project Structure

This is a monorepo using **pnpm workspaces** with multiple applications and shared packages.

```
BridgeWorks-PM/
|-- apps/
|   |-- api/          # Express.js API server
|   |-- public/       # Next.js public-facing app
|   |-- staff/        # Next.js staff portal
|   `-- user/         # Next.js user portal
|-- packages/
|   |-- db/           # Prisma database schema and client
|   `-- shared/       # Shared utilities and types
`-- docs/            # Documentation
```

## Applications

### 1. API (`apps/api`)
- **Framework**: Express.js
- **Port**: 3103 (dev)
- **Purpose**: RESTful API backend
- **Features**:
  - Health check endpoints (`/health`, `/health/db`)
  - Database connection pooling
  - Manual .env file loading

**Endpoints**:
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check

### 2. Public App (`apps/public`)
- **Framework**: Next.js 16 (App Router)
- **Port**: 3100 (dev)
- **Purpose**: Public-facing website
- **Features**:
  - Marketing pages
  - R2 file upload functionality
  - Tailwind CSS v4

**API Routes**:
- `POST /api/r2-upload` - Upload files to Cloudflare R2
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check
- `GET /api/db-health` - Database health
- `GET /api/db-proof` - Database connection test

### 3. Staff App (`apps/staff`)
- **Framework**: Next.js 16 (App Router)
- **Port**: 3101 (dev)
- **Purpose**: Staff administration portal
- **Status**: Minimal placeholder (basic page)

**API Routes**:
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check

### 4. User App (`apps/user`)
- **Framework**: Next.js 16 (App Router)
- **Port**: 3102 (dev)
- **Purpose**: User portal/dashboard
- **Status**: Minimal placeholder (basic page)

**API Routes**:
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check

## Shared Packages

### `packages/db`
- Prisma ORM setup
- Database migrations
- Shared database client
- Schema: currently empty (fresh setup)

### `packages/shared`
- Common TypeScript utilities
- Environment variable helpers
- URL generation
- HTTP utilities
- Health check helpers
- Redirect helpers

## Infrastructure

### Database
- **Provider**: Neon (Serverless Postgres)
- **ORM**: Prisma
- **Connection Types**:
  - Pooled (runtime): for app queries
  - Direct (migrations): for schema changes

### Storage
- **Provider**: Cloudflare R2 (S3-compatible)
- **SDK**: AWS SDK for JavaScript v3
- **Features**:
  - File uploads via multipart/form-data
  - Optional upload token authentication
  - File sanitization and size limits (15MB)

### Local Development
- **Reverse Proxy**: Caddy (port 3200)
- **URL Scheme**:
  - Public: `http://localhost:3200`
  - Portal: `http://localhost:3200/portal`
  - Staff: `http://localhost:3200/staff`
  - API: `http://localhost:3200/api`

## Development Commands

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm run dev:all            # public, staff, user (no API)
pnpm run dev:all:with-api   # all apps including API

# Individual apps
pnpm run dev:public         # Port 3100
pnpm run dev:staff          # Port 3101
pnpm run dev:user           # Port 3102
pnpm run dev:api            # Port 3103

# Production builds
pnpm run build:api
pnpm run build:public
pnpm run build:user
pnpm run build:staff
```

## Technology Stack

### Frontend
- **React** 19.2.1
- **Next.js** 16.0.10
- **Tailwind CSS** 4.x
- **TypeScript** 5.x

### Backend
- **Node.js** 22.x
- **Express** 5.2.1
- **PostgreSQL** (via Neon)
- **Prisma** ORM

### DevOps
- **Package Manager**: pnpm 9.15.0
- **Process Manager**: concurrently (for multi-app dev)
- **Environment**: dotenv-cli

## Architecture Patterns

### Monorepo Benefits
- Shared type definitions
- Code reuse across apps
- Atomic commits across multiple apps
- Simplified dependency management

### Current State
- ? Well-structured monorepo
- ? R2 integration working
- ??  Staff and User apps are minimal placeholders
- ??  No authentication/authorization implemented yet
- ??  No routing between apps (requires Caddy or similar)

## Future Considerations

1. **Authentication**: Implement auth across all apps
2. **App Development**: Build out staff and user portals
3. **API Gateway**: Consider consolidating API routes
4. **Testing**: Add test infrastructure
5. **CI/CD**: Set up automated deployments
6. **Monitoring**: Add logging and error tracking
