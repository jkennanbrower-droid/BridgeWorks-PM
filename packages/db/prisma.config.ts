import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

process.env.PRISMA_COPY_RUNTIME_SOURCEMAPS ??= "1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const configuredUrl =
  process.env.DATABASE_URL_DIRECT ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";

if (!process.env.DATABASE_URL_DIRECT && !process.env.DATABASE_URL) {
  console.warn(
    "[packages/db] DATABASE_URL_DIRECT (or DATABASE_URL) is not set; using a placeholder URL for Prisma config. Migrations/seed will fail until real env vars are provided.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: configuredUrl,
  },
});
