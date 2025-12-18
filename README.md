# BridgeWorks PM

A modern project management platform built with Next.js, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 22.x
- pnpm 9.15.0
- PostgreSQL (via Neon)
- Cloudflare R2 account (optional, for file uploads)

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
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

## 📁 Project Structure

```
BridgeWorks-PM/
├── apps/
│   ├── api/          # Express.js API server
│   ├── public/       # Next.js public-facing app
│   ├── staff/        # Next.js staff portal
│   └── user/         # Next.js user portal
├── packages/
│   ├── db/           # Prisma database schema and client
│   └── shared/       # Shared utilities and types
└── docs/             # Additional documentation
```

## 🏗️ Architecture

This is a **monorepo** using pnpm workspaces with:
- **3 Next.js applications** (public, staff, user)
- **1 Express.js API** server
- **2 shared packages** (db, shared)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## 🔒 Security

- Never commit `.env.local` or files containing secrets
- Use `.env.local.template` as a reference
- See [SECURITY.md](./SECURITY.md) for complete security guidelines

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design
- [SECURITY.md](./SECURITY.md) - Security guidelines and best practices
- [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - Recent cleanup and security audit results
- [docs/local-dev.md](./docs/local-dev.md) - Local development setup

## 🛠️ Available Scripts

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

### Database
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:generate` - Generate Prisma client
- `pnpm run db:studio` - Open Prisma Studio

## 🌐 Technology Stack

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

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all apps build successfully
4. Submit a pull request

## 📄 License

ISC

## 🔗 Links

- [GitHub Repository](https://github.com/jkennanbrower-droid/BridgeWorks-PM)

## Deploying to Render (Public App)

This repo uses `pnpm` (there is no `package-lock.json`), so `npm ci` will fail on Render unless you switch to pnpm.

- **Build Command**: `npm run render:build:public`
- **Start Command**: `npm run render:start:public`

Note: the build script forces installing `devDependencies` (`pnpm install --prod=false`) because Next/Tailwind build tooling runs at build time.

An example blueprint is included at `render.yaml`.
