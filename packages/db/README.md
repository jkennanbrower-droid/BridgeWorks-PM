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
