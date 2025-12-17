import fs from "node:fs";
import path from "node:path";

import express from "express";
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
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// Load .env files from monorepo root (two levels up)
const repoRoot = path.join(import.meta.dirname, "../..");
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, ".env"));

const app = express();
app.use(express.json());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/health/db", async (req, res) => {
  try {
    const { rows } = await pool.query("select now() as now");
    res.json({ ok: true, ...rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 3103;
app.listen(port, "0.0.0.0", () => console.log("listening on", port));
