import crypto from "node:crypto";
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

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function listMigrationDirs(migrationsRoot) {
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((ent) => ent.isDirectory())
    .map((ent) => ent.name)
    .sort();
}

async function getMigrationRowsByName(db) {
  const rows = await db.query(
    `select id, migration_name, checksum, started_at, finished_at, rolled_back_at
     from _prisma_migrations`,
  );
  const map = new Map();
  rows.rows.forEach((row) => {
    const list = map.get(row.migration_name) ?? [];
    list.push(row);
    map.set(row.migration_name, list);
  });
  return map;
}

function selectBestRow(rows) {
  if (!rows || rows.length === 0) return null;
  const successful = rows
    .filter((r) => r.rolled_back_at == null && r.finished_at != null)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  if (successful.length > 0) return successful[0];
  return null;
}

async function main() {
  const repoRoot = path.join(import.meta.dirname, "../../..");
  loadDotEnvFile(path.join(repoRoot, ".env.local"));
  loadDotEnvFile(path.join(repoRoot, ".env"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new pg.Pool({
    connectionString,
    ssl:
      connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const migrationsRoot = path.join(repoRoot, "packages", "db", "prisma", "migrations");
  const migrationDirs = listMigrationDirs(migrationsRoot);

  const db = await pool.connect();
  try {
    const byName = await getMigrationRowsByName(db);

    const now = new Date();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const name of migrationDirs) {
      const sqlPath = path.join(migrationsRoot, name, "migration.sql");
      if (!fs.existsSync(sqlPath)) {
        skipped += 1;
        continue;
      }
      const sql = fs.readFileSync(sqlPath, "utf8");
      const checksum = sha256Hex(sql);

      const rows = byName.get(name) ?? [];
      if (rows.length === 0) {
        const id = crypto.randomUUID();
        await db.query(
          `insert into _prisma_migrations
            (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           values
            ($1, $2, $3, $4, null, null, $3, 1)`,
          [id, checksum, now, name],
        );
        inserted += 1;
        continue;
      }

      for (const row of rows) {
        if (row.checksum === checksum) continue;
        await db.query(`update _prisma_migrations set checksum = $2 where id = $1`, [row.id, checksum]);
        updated += 1;
      }
    }

    const missingLocal = [];
    for (const [name, rows] of byName.entries()) {
      if (!migrationDirs.includes(name)) {
        const best = selectBestRow(rows);
        if (best) missingLocal.push(name);
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          inserted,
          updated,
          skipped,
          missingLocalMigrationsInDb: missingLocal,
        },
        null,
        2,
      ),
    );
  } finally {
    db.release();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
