## Prisma + Neon (this repo)

Prisma CLI is configured via `packages/db/prisma.config.ts` (Prisma v7). Connection URLs are read from `packages/db/.env`.

### URLs (Neon)

- `DATABASE_URL`: pooled hostname (contains `-pooler`) for runtime usage
- `DATABASE_URL_DIRECT`: direct hostname (no `-pooler`) for migrations/Studio

`packages/db/prisma.config.ts` prefers `DATABASE_URL_DIRECT` when present so migrations don’t run through the pooler.

### Commands

From the repo root:

- `pnpm db:generate`
- `pnpm db:migrate -- --name init`
- `pnpm db:studio`

Or from `packages/db`:

- `pnpm exec prisma generate`
- `pnpm exec prisma migrate dev --name init`
- `pnpm exec prisma studio`

### Note on app DB access

The Next apps should not create their own `pg.Pool`. Use the shared pool from `db/pool` (or Prisma Client if you switch to it later).

### Prisma Client (optional)

If you want to use Prisma Client in apps/services (Prisma v7 + pg adapter), import the singleton:

- `import { getPrisma } from "db/prisma";`

Then call `getPrisma().user.findMany()` etc. The client uses the shared `pg` pool from `db/pool` (so SSL/env logic stays centralized).
