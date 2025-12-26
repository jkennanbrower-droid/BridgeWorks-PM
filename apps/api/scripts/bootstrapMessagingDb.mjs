import fs from "node:fs";
import path from "node:path";

import pg from "pg";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (!key || key in process.env) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const repoRoot = path.join(import.meta.dirname, "../../..");
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const migrationPaths = [
  path.join(repoRoot, "packages", "db", "prisma", "migrations", "20251223120000_messaging", "migration.sql"),
  path.join(
    repoRoot,
    "packages",
    "db",
    "prisma",
    "migrations",
    "20251228120000_messaging_reactions",
    "migration.sql",
  ),
];

const migrations = migrationPaths.map((migrationPath) => {
  if (!fs.existsSync(migrationPath)) {
    console.error(`Missing migration SQL at ${migrationPath}`);
    process.exit(1);
  }
  return { path: migrationPath, sql: fs.readFileSync(migrationPath, "utf8") };
});

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const migration of migrations) {
    await client.query(migration.sql);
  }
  await client.query("COMMIT");
  console.log("Messaging schema bootstrap applied.");
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // ignore
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
