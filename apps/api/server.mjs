import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import express from "express";
import pg from "pg";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
dotenv.config();

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

