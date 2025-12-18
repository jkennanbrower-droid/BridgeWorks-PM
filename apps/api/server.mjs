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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function maskSecret(value) {
  const s = String(value || "");
  if (!s) return "(not set)";
  if (s.length <= 8) return "********";
  return `${s.slice(0, 3)}…${s.slice(-3)}`;
}

app.get("/", (req, res) => {
  noStore(res);
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasR2 =
    Boolean(process.env.R2_ACCOUNT_ID) &&
    Boolean(process.env.R2_ACCESS_KEY_ID) &&
    Boolean(process.env.R2_SECRET_ACCESS_KEY) &&
    Boolean(process.env.R2_BUCKET_NAME);

  const cors = allowedOrigins.length ? allowedOrigins.map(escapeHtml).join("<br/>") : "(allow all)";

  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BridgeWorks API</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; margin: 0; }
      .wrap { max-width: 980px; margin: 0 auto; padding: 24px; }
      header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
      h1 { font-size: 22px; margin: 0; }
      .muted { opacity: .7; font-size: 13px; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 16px; }
      @media (min-width: 860px) { .grid { grid-template-columns: 1.3fr .7fr; } }
      .card { border: 1px solid color-mix(in oklab, CanvasText 12%, transparent); border-radius: 14px; padding: 16px; background: color-mix(in oklab, Canvas 92%, CanvasText 8%); }
      .card h2 { font-size: 14px; margin: 0 0 10px; letter-spacing: .01em; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
      a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid color-mix(in oklab, CanvasText 10%, transparent); }
      .row:first-of-type { border-top: 0; }
      .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; border: 1px solid color-mix(in oklab, CanvasText 12%, transparent); }
      .dot { width: 8px; height: 8px; border-radius: 99px; background: #999; }
      .ok { background: #23c55e; }
      .bad { background: #ef4444; }
      .warn { background: #f59e0b; }
      .btn { display: inline-flex; align-items: center; justify-content: center; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid color-mix(in oklab, CanvasText 12%, transparent); background: transparent; cursor: pointer; }
      .btn:hover { background: color-mix(in oklab, CanvasText 6%, transparent); }
      input[type="file"], input[type="password"] { width: 100%; }
      input[type="password"] { height: 38px; border-radius: 10px; border: 1px solid color-mix(in oklab, CanvasText 12%, transparent); padding: 0 10px; background: transparent; }
      .stack { display: grid; gap: 10px; }
      .small { font-size: 12px; opacity: .8; }
      pre { margin: 0; padding: 12px; border-radius: 12px; overflow: auto; background: color-mix(in oklab, Canvas 88%, CanvasText 12%); border: 1px solid color-mix(in oklab, CanvasText 12%, transparent); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <div>
          <h1>BridgeWorks API</h1>
          <div class="muted">Service: <code>apps/api</code> · Time: <span id="now"></span></div>
        </div>
        <button class="btn" id="refresh">Refresh checks</button>
      </header>

      <div class="grid">
        <section class="card">
          <h2>Status checks</h2>
          <div class="row">
            <div><code>GET /health</code></div>
            <div class="pill"><span class="dot" id="dot-health"></span><span id="text-health" class="small">pending</span></div>
          </div>
          <div class="row">
            <div><code>GET /ready</code> <span class="small">(DB check)</span></div>
            <div class="pill"><span class="dot" id="dot-ready"></span><span id="text-ready" class="small">pending</span></div>
          </div>
          <div class="row">
            <div><code>GET /db-health</code></div>
            <div class="pill"><span class="dot" id="dot-db"></span><span id="text-db" class="small">pending</span></div>
          </div>
          <div class="row">
            <div><code>GET /db-proof</code> <span class="small">(disabled in prod)</span></div>
            <div class="pill"><span class="dot" id="dot-proof"></span><span id="text-proof" class="small">pending</span></div>
          </div>
          <div style="margin-top: 10px" class="small muted">
            Also available under <code>/api/*</code> (aliases): <a href="/api/health">/api/health</a>, <a href="/api/ready">/api/ready</a>, <a href="/api/db-health">/api/db-health</a>, <a href="/api/db-proof">/api/db-proof</a>.
          </div>
        </section>

        <aside class="card">
          <h2>Config snapshot</h2>
          <div class="stack">
            <div>
              <div class="small muted">CORS_ORIGINS</div>
              <div class="small">${cors}</div>
            </div>
            <div>
              <div class="small muted">DATABASE_URL</div>
              <div class="small"><code>${hasDb ? "set" : "(not set)"}</code></div>
            </div>
            <div>
              <div class="small muted">R2</div>
              <div class="small"><code>${hasR2 ? "configured" : "(not set)"}</code></div>
            </div>
            <div>
              <div class="small muted">R2_PUBLIC_BASE_URL</div>
              <div class="small"><code>${escapeHtml(process.env.R2_PUBLIC_BASE_URL || "(not set)")}</code></div>
            </div>
            <div>
              <div class="small muted">R2_UPLOAD_TOKEN</div>
              <div class="small"><code>${escapeHtml(maskSecret(process.env.R2_UPLOAD_TOKEN))}</code></div>
            </div>
          </div>
        </aside>
      </div>

      <section class="card" style="margin-top: 12px">
        <h2>R2 upload test</h2>
        <form id="uploadForm" class="stack">
          <div class="stack">
            <div class="small muted">File (field name must be <code>file</code>)</div>
            <input type="file" name="file" required />
          </div>
          <div class="stack">
            <div class="small muted">Upload token (optional; sent as <code>x-upload-token</code>)</div>
            <input type="password" name="token" placeholder="R2_UPLOAD_TOKEN" />
          </div>
          <div style="display:flex; gap: 10px; align-items:center;">
            <button class="btn" type="submit">Upload to <code>/r2-upload</code></button>
            <span class="small muted" id="uploadStatus"></span>
          </div>
          <pre id="uploadResult">{}</pre>
        </form>
      </section>

      <section class="card" style="margin-top: 12px">
        <h2>Raw output</h2>
        <pre id="raw">{}</pre>
      </section>
    </div>

    <script>
      const nowEl = document.getElementById('now');
      const raw = document.getElementById('raw');

      function setStatus(dotId, textId, status, msg) {
        const dot = document.getElementById(dotId);
        const text = document.getElementById(textId);
        dot.className = 'dot ' + (status === 'ok' ? 'ok' : status === 'bad' ? 'bad' : 'warn');
        text.textContent = msg;
      }

      async function check(path, dotId, textId) {
        setStatus(dotId, textId, 'warn', 'checking…');
        try {
          const res = await fetch(path, { cache: 'no-store' });
          const json = await res.json().catch(() => null);
          const ok = res.ok && json && json.ok !== false;
          setStatus(dotId, textId, ok ? 'ok' : 'bad', ok ? 'ok' : 'fail (' + res.status + ')');
          return { path, status: res.status, ok, json };
        } catch (e) {
          setStatus(dotId, textId, 'bad', 'network error');
          return { path, status: 0, ok: false, error: String(e) };
        }
      }

      async function refresh() {
        nowEl.textContent = new Date().toISOString();
        const results = [];
        results.push(await check('/health', 'dot-health', 'text-health'));
        results.push(await check('/ready', 'dot-ready', 'text-ready'));
        results.push(await check('/db-health', 'dot-db', 'text-db'));
        results.push(await check('/db-proof', 'dot-proof', 'text-proof'));
        raw.textContent = JSON.stringify(results, null, 2);
      }

      document.getElementById('refresh').addEventListener('click', (e) => {
        e.preventDefault();
        refresh();
      });

      const uploadForm = document.getElementById('uploadForm');
      const uploadStatus = document.getElementById('uploadStatus');
      const uploadResult = document.getElementById('uploadResult');

      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadStatus.textContent = 'uploading…';
        uploadResult.textContent = '{}';
        try {
          const fileInput = uploadForm.querySelector('input[name=\"file\"]');
          const tokenInput = uploadForm.querySelector('input[name=\"token\"]');
          const file = fileInput.files && fileInput.files[0];
          if (!file) throw new Error('Pick a file first.');

          const form = new FormData();
          form.set('file', file);

          const headers = new Headers();
          const token = (tokenInput.value || '').trim();
          if (token) headers.set('x-upload-token', token);

          const res = await fetch('/r2-upload', { method: 'POST', body: form, headers });
          const json = await res.json().catch(() => null);
          uploadResult.textContent = JSON.stringify({ status: res.status, json }, null, 2);
          uploadStatus.textContent = res.ok ? 'done' : 'failed';
        } catch (err) {
          uploadStatus.textContent = 'failed';
          uploadResult.textContent = JSON.stringify({ error: String(err) }, null, 2);
        }
      });

      refresh();
    </script>
  </body>
</html>`);
});

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
