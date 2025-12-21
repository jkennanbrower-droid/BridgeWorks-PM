import fs from "node:fs";
import os from "node:os";
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
      (value.startsWith('"') && value.endsWith('"')) ||
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Upload-Token, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

function addAlias(pathA, pathB, handler) {
  app.all(pathA, handler);
  app.all(pathB, handler);
}

function getBuildSha() {
  return process.env.BUILD_SHA ?? process.env.GIT_SHA ?? process.env.RENDER_GIT_COMMIT;
}

function getSelfBaseUrl(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)
    ?.split(",")[0]
    ?.trim();
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto || req.protocol || "http"}://${host}`;
}

async function fetchWithTimeout(url, { timeoutMs = 4000, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    const latencyMs = performance.now() - started;
    return { res, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(name, url, pathChecked, timeoutMs) {
  try {
    const { res, latencyMs } = await fetchWithTimeout(url, { timeoutMs });
    const ok = res.ok;
    let json = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      json = await res.json().catch(() => null);
    }
    return {
      name,
      url,
      pathChecked,
      ok,
      status: res.status,
      latencyMs: Math.round(latencyMs),
      json,
    };
  } catch (e) {
    return {
      name,
      url,
      pathChecked,
      ok: false,
      status: 0,
      latencyMs: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkServiceReachable(name, baseUrl) {
  const base = baseUrl.replace(/\/+$/, "");
  const health = await checkUrl(name, `${base}/api/health`, "/api/health", 4000);
  if (health.status !== 404) return health;
  return await checkUrl(name, `${base}/`, "/", 4000);
}

const staticDir = path.join(import.meta.dirname, "static");
app.use("/static", express.static(staticDir));

// Ops console (static app)
app.get("/", (req, res) => {
  noStore(res);
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get("/health", (req, res) => res.json({ ok: true }));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
});

app.get("/health/db", async (req, res) => {
  try {
    const { rows } = await pool.query("select now() as now");
    res.json({ ok: true, ...rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/whoami", (req, res) => {
  noStore(res);
  const buildSha = getBuildSha();
  res.json({
    ok: true,
    service: "api",
    hostname: os.hostname(),
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    ...(buildSha ? { buildSha } : {}),
  });
});

app.get("/cache-test", (req, res) => {
  const nonce = crypto.randomUUID();
  const etag = `"${nonce}"`;

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  res.setHeader("ETag", etag);

  const inm = req.headers["if-none-match"];
  const inmValue = Array.isArray(inm) ? inm.join(",") : inm;
  if (inmValue && inmValue.split(",").map((s) => s.trim()).includes(etag)) {
    return res.status(304).end();
  }

  return res.json({ ok: true, nonce, timestamp: new Date().toISOString() });
});

app.get("/ops/status", async (req, res) => {
  noStore(res);

  const buildSha = getBuildSha();
  const timestamp = new Date().toISOString();
  const selfBase = getSelfBaseUrl(req);

  const api = {
    ok: true,
    uptimeSec: Math.floor(process.uptime()),
    nodeVersion: process.version,
    pid: process.pid,
    hostname: os.hostname(),
    timestamp,
    ...(buildSha ? { buildSha } : {}),
  };

  const db = { ok: false, latencyMs: null };
  try {
    const started = performance.now();
    const { rows } = await pool.query("select now() as now");
    db.ok = true;
    db.latencyMs = Math.round(performance.now() - started);
    db.now = rows?.[0]?.now;
  } catch (e) {
    db.ok = false;
    db.latencyMs = null;
    db.error = e instanceof Error ? e.message : String(e);
  }

  const services = [];
  try {
    services.push(await checkUrl("API /health", `${selfBase}/health`, "/health", 2500));
    services.push(await checkUrl("API /health/db", `${selfBase}/health/db`, "/health/db", 3500));
    services.push(await checkServiceReachable("Public", "https://www.bridgeworkspm.com"));
    services.push(await checkServiceReachable("User", "https://user.bridgeworkspm.com"));
    services.push(await checkServiceReachable("Staff", "https://staff.bridgeworkspm.com"));
    services.push(await checkUrl("API root", `${selfBase}/`, "/", 2500));
  } catch (e) {
    services.push({
      name: "ops/status",
      url: selfBase,
      pathChecked: "/ops/status",
      ok: false,
      status: 0,
      latencyMs: null,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  res.json({ api, db, services });
});

// Convenience / legacy helpers (keep working)
addAlias("/ready", "/api/ready", async (req, res) => {
  noStore(res);
  try {
    await pool.query("select 1");
    res.json({ ok: true, service: "api", db: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, service: "api", db: "down", error: String(e) });
  }
});

addAlias("/db-health", "/api/db-health", async (req, res) => {
  noStore(res);
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

    const rows = await pool.query(`SELECT id, created_at, message FROM ${table} ORDER BY id DESC LIMIT 5;`);

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

function getBearerToken(req) {
  const raw = req.headers.authorization;
  if (!raw) return null;
  const [type, token] = raw.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
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

addAlias("/auth/bootstrap", "/api/auth/bootstrap", async (req, res) => {
  noStore(res);

  const rawEmail = process.env.NO_AUTH_EMAIL ?? "no-auth@bridgeworks.local";
  const normalizedEmail = rawEmail.trim().toLowerCase();
  const now = new Date();

  let userRow = null;
  try {
    const existing = await pool.query(
      'SELECT id, email FROM "User" WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      userRow = existing.rows[0];
      await pool.query(
        'UPDATE "User" SET "lastLoginAt" = $2, "updatedAt" = $2 WHERE id = $1',
        [userRow.id, now]
      );
    } else {
      const newId = crypto.randomUUID();
      const insert = await pool.query(
        'INSERT INTO "User" (id, email, status, "lastLoginAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4, $4) RETURNING id, email',
        [newId, normalizedEmail, "ACTIVE", now]
      );
      userRow = insert.rows[0];
    }

    await pool.query(
      'INSERT INTO "AuthAccount" (provider, "providerAccountId", "userId", "lastUsedAt") VALUES ($1, $2, $3, $4) ON CONFLICT (provider, "providerAccountId") DO UPDATE SET "userId" = EXCLUDED."userId", "lastUsedAt" = EXCLUDED."lastUsedAt"',
      ["NO_AUTH", normalizedEmail, userRow.id, now]
    );

    return res.json({
      ok: true,
      authProvider: "NO_AUTH",
      user: { id: userRow.id, email: userRow.email },
      access: {
        isStaff: true,
        isTenant: true,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

const port = process.env.PORT || 3103;
app.listen(port, "0.0.0.0", () => console.log("listening on", port));
