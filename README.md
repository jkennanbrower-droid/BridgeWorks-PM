# BridgeWorks PM

A modern project management platform built with Next.js, Express, and PostgreSQL.

## ? Quick Start

### Prerequisites
- Node.js 22.x
- pnpm 9.15.0
- PostgreSQL (via Neon)
- Cloudflare R2 account (optional, for file uploads)

### Setup

**Windows note:** For best results, clone/open this repo from a path **without spaces** (e.g. `C:\dev\BridgeWorksPM`).
Some Next.js dev tooling (Turbopack source maps) can misbehave when the workspace path contains spaces.

1. **Install dependencies**
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
`-- docs/             # Additional documentation
```

2. **Configure environment variables**
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your actual credentials
   ```
   
   See [SECURITY.md](./SECURITY.md) for detailed setup instructions.

3. **Run database migrations**
   ```bash
   pnpm run db:migrate
   pnpm run db:generate
   ```

4. **Start development servers**
   ```bash
   # All apps (no API)
   pnpm run dev:all
   
   # All apps including API
   pnpm run dev:all:with-api
   
   # Individual apps
   pnpm run dev:public  # Port 3100
   pnpm run dev:staff   # Port 3101
   pnpm run dev:user    # Port 3102
   pnpm run dev:api     # Port 3103
   ```

## ? Project Structure

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
`-- docs/             # Additional documentation
```

## ?? Architecture

This is a **monorepo** using pnpm workspaces with:
- **3 Next.js applications** (public, staff, user)
- **1 Express.js API** server
- **2 shared packages** (db, shared)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## ? Security

- Never commit `.env.local` or files containing secrets
- Use `.env.local.template` as a reference
- See [SECURITY.md](./SECURITY.md) for complete security guidelines

## ? Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design
- [SECURITY.md](./SECURITY.md) - Security guidelines and best practices
- [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - Recent cleanup and security audit results
- [docs/local-dev.md](./docs/local-dev.md) - Local development setup

## ?? Available Scripts

### Development
- `pnpm run dev:all` - Start all Next.js apps
- `pnpm run dev:all:with-api` - Start all apps including API
- `pnpm run dev:public` - Start public app only
- `pnpm run dev:staff` - Start staff app only
- `pnpm run dev:user` - Start user app only
- `pnpm run dev:api` - Start API only

### Building
- `pnpm run build:public` - Build public app
- `pnpm run build:staff` - Build staff app
- `pnpm run build:user` - Build user app
- `pnpm run build:api` - Build API

## ? Technology Stack

### Frontend
- React 19.2.1
- Next.js 16.0.10
- Tailwind CSS 4.x
- TypeScript 5.x

### Backend
- Node.js 22.x
- Express 5.2.1
- PostgreSQL (Neon)
- Prisma ORM

### Infrastructure
- Cloudflare R2 (object storage)
- pnpm workspaces (monorepo)
- Caddy (reverse proxy for local dev)

## ? Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all apps build successfully
4. Submit a pull request

## ? License

ISC

## ? Links

- [GitHub Repository](https://github.com/jkennanbrower-droid/BridgeWorks-PM)

## Deploying to Render (Public App)

This repo uses `pnpm` (there is no `package-lock.json`), so `npm ci` will fail on Render unless you switch to pnpm.

- **Build Command**: `npm run render:build:public`
- **Start Command**: `npm run render:start:public`

Note: the build script forces installing `devDependencies` (`pnpm install --prod=false`) because Next/Tailwind build tooling runs at build time.

If the site renders but looks completely unstyled, check the browser network tab for failed requests to `/_next/static/...` (CSS/JS). This usually means you're serving the app under a path prefix (or a proxy rewrite is breaking `/_next/*`).

- **Serving under a sub-path**: set `NEXT_PUBLIC_BASE_PATH` (example: `/portal`) and redeploy so assets load from `/portal/_next/...`.
- **Using Cloudflare proxy**: purge Cloudflare cache (or at least `/_next/static/*`) after a failed deploy; Cloudflare can cache a 404 for a chunk URL and keep serving ?unstyled? pages until the cache is cleared.

An example blueprint is included at `render.yaml`.

## SaaS-style API Architecture

Best practice is to keep a single backend API service (`apps/api`) and make the Next apps (public/staff/user) call it.

- Next apps keep only `GET /api/health` and `GET /api/ready` (no DB dependency).
- DB/R2 endpoints live in the API service:
  - `GET /health`, `GET /ready` (DB check), `GET /db-health`, `GET /db-proof` (non-prod), `POST /r2-upload`
- Configure `NEXT_PUBLIC_API_BASE_URL` in the Next apps (example: `https://api.bridgeworkspm.com`).
- Configure CORS on the API service via `CORS_ORIGINS` (comma-separated list of allowed origins).
