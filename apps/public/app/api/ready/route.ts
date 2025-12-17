import { Pool } from "pg";

export const runtime = "nodejs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString: url,
  // Only enable SSL when the URL indicates it (Neon uses sslmode=require)
  ssl: url.includes("sslmode=require") || url.includes(".neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function GET() {
  try {
    await pool.query("select 1");
    return Response.json(
      { ok: true, db: "ok", timestamp: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, db: "down", error: msg, timestamp: new Date().toISOString() },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
