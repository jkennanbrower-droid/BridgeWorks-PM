import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import express from "express";
import multer from "multer";
import pg from "pg";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

function noStore(res) {
  res.setHeader("cache-control", "no-store");
}

let sharedPool;
function getPool() {
  if (sharedPool) return sharedPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  sharedPool = new pg.Pool({
    connectionString,
    ssl:
      connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return sharedPool;
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCsv(process.env.CORS_ORIGINS);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Upload-Token");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

function addAlias(pathA, pathB, handler) {
  app.all(pathA, handler);
  app.all(pathB, handler);
}

addAlias("/health", "/api/health", (req, res) => {
  noStore(res);
  res.json({ ok: true, service: "api", timestamp: new Date().toISOString() });
});

addAlias("/ready", "/api/ready", async (req, res) => {
  noStore(res);
  const pool = getPool();
  if (!pool) return res.status(503).json({ ok: false, error: "DATABASE_URL is not set" });
  try {
    await pool.query("select 1");
    res.json({ ok: true, service: "api", db: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, service: "api", db: "down", error: String(e) });
  }
});

addAlias("/db-health", "/api/db-health", async (req, res) => {
  noStore(res);
  const pool = getPool();
  if (!pool) return res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });
  try {
    const { rows } = await pool.query("select now() as now");
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

addAlias("/db-proof", "/api/db-proof", async (req, res) => {
  noStore(res);
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ ok: false });
  }
  const pool = getPool();
  if (!pool) return res.status(500).json({ ok: false, error: "DATABASE_URL is not set" });

  const table = "bw_neon_proof";
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        message TEXT NOT NULL
      );
    `);

    const ins = await pool.query(
      `INSERT INTO ${table} (message) VALUES ($1) RETURNING id, created_at, message`,
      [`proof-${new Date().toISOString()}`]
    );

    const cols = await pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
      `,
      [table]
    );

    const rows = await pool.query(
      `SELECT id, created_at, message FROM ${table} ORDER BY id DESC LIMIT 5;`
    );

    return res.json({
      ok: true,
      table,
      inserted: ins.rows[0],
      columns: cols.rows,
      lastRows: rows.rows,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function getR2Client() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");
  const publicBaseUrl = optionalEnv("R2_PUBLIC_BASE_URL")?.replace(/\/+$/, "");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicBaseUrl };
}

function checkUploadToken(req) {
  const required = process.env.R2_UPLOAD_TOKEN;
  if (!required) return null;
  const provided = req.headers["x-upload-token"];
  if (!provided || provided !== required) return "Unauthorized";
  return null;
}

function sanitizeFilename(name) {
  return String(name || "upload.bin")
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .replace(/[^\w.\-()+@ ]/g, "_")
    .trim()
    .slice(0, 120);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

addAlias("/r2-upload", "/api/r2-upload", (req, res) => {
  noStore(res);
  return upload.single("file")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 15 MB)." : String(err);
      return res.status(413).json({ ok: false, error: msg });
    }

    try {
      const authError = checkUploadToken(req);
      if (authError) return res.status(401).json({ ok: false, error: authError });

      const file = req.file;
      if (!file) {
        return res.status(400).json({ ok: false, error: "Missing file field 'file'." });
      }

      const { client, bucket, publicBaseUrl } = getR2Client();

      const safeName = sanitizeFilename(file.originalname);
      const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

      const result = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || "application/octet-stream",
        })
      );

      const url = publicBaseUrl ? `${publicBaseUrl}/${key}` : undefined;
      return res.status(200).json({ ok: true, key, etag: result.ETag, url });
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: e instanceof Error ? e.message : "Upload failed." });
    }
  });
});

const port = process.env.PORT || 3103;
app.listen(port, "0.0.0.0", () => console.log("listening on", port));
