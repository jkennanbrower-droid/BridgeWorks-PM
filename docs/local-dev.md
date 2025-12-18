# Local Dev (Ports + Proxy)

## Ports

- `apps/public`: `http://localhost:3100`
- `apps/staff`: `http://localhost:3101`
- `apps/user`: `http://localhost:3102`
- `apps/api` (optional): `http://localhost:3103`

## Proxy (Caddy on :3200)

This repo uses Caddy as a reverse proxy at `http://localhost:3200` to keep a single origin during local development.

### Setup Caddy

1. **Install Caddy** (if not already installed):
   ```bash
   # macOS
   brew install caddy
   
   # Linux
   sudo apt install caddy
   
   # Windows (with Chocolatey)
   choco install caddy
   ```

2. **Start Caddy** with the provided Caddyfile:
   ```bash
   caddy run --config Caddyfile
   ```

### Routing Rules

A `Caddyfile` is provided in the repository root with the following routing:

- `http://localhost:3200/` → `apps/public` (`:3100`)
- `http://localhost:3200/staff/*` → `apps/staff` (`:3101`)
- `http://localhost:3200/portal/*` → `apps/user` (`:3102`)
- `http://localhost:3200/api/*` → `apps/api` (`:3103`)

**Note:** `/_next/*` asset routing is handled automatically by the reverse proxy configuration.

## Development Workflow

### Option 1: With Caddy (Recommended)

1. Start all applications:
   ```bash
   pnpm dev:all:with-api
   ```

2. In a separate terminal, start Caddy:
   ```bash
   caddy run --config Caddyfile
   ```

3. Access your apps through the proxy:
   - Public: http://localhost:3200
   - Staff: http://localhost:3200/staff
   - Portal: http://localhost:3200/portal
   - API: http://localhost:3200/api

### Option 2: Direct Access (No Proxy)

Access each app directly on its own port:
- Public: http://localhost:3100
- Staff: http://localhost:3101
- User: http://localhost:3102
- API: http://localhost:3103

## Commands

- `pnpm dev:all` - Starts the 3 Next.js apps on 3100/3101/3102 (injects repo-root `.env.local`)
- `pnpm dev:all:with-api` - Also starts Express API on 3103
- `pnpm dev:public` - Start public app only
- `pnpm dev:staff` - Start staff app only
- `pnpm dev:user` - Start user app only
- `pnpm dev:api` - Start API only
