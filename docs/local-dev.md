# Local Dev (Ports + Proxy)

## Ports

- `apps/public`: `http://localhost:3100`
- `apps/staff`: `http://localhost:3101`
- `apps/user`: `http://localhost:3102`
- `apps/api` (optional): `http://localhost:3103`

## Proxy (Caddy on :3200)

This repo assumes you proxy via Caddy at `http://localhost:3200` to keep a single origin during local development.

- `/staff/*` routes to `apps/staff` (`:3101`)
- `/portal/*` routes to `apps/user` (`:3102`)
- everything else routes to `apps/public` (`:3100`)

`/_next/*` asset routing must be handled carefully when using path-based routing (`/staff/*`, `/portal/*`). Keep your existing Caddy rules as-is if they already work; don’t “simplify” them without verifying assets load for all apps.

## Commands

- `pnpm dev:all` (starts the 3 Next apps on `3100/3101/3102`)
- `pnpm dev:all:with-api` (also starts Express on `3103`)
