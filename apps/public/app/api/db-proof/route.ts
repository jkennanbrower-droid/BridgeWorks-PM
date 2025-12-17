import { Pool } from "pg";

export const runtime = "nodejs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString: url,
  ssl: url.includes("sslmode=require") || url.includes(".neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function GET() {
  const table = "bw_neon_proof";

  try {
    // 1) Create table + columns (DDL)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        message TEXT NOT NULL
      );
    `);

    // 2) Insert a row (proof of writes)
    const ins = await pool.query(
      `INSERT INTO ${table} (message) VALUES ($1) RETURNING id, created_at, message`,
      [`proof-${new Date().toISOString()}`]
    );

    // 3) Read back the columns (proof of schema)
    const cols = await pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
      `,
      [table]
    );

    // 4) Read last rows (proof it persists)
    const rows = await pool.query(
      `SELECT id, created_at, message FROM ${table} ORDER BY id DESC LIMIT 5;`
    );

    return Response.json(
      {
        ok: true,
        table,
        inserted: ins.rows[0],
        columns: cols.rows,
        lastRows: rows.rows,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
