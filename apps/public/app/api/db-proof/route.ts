import { getPool } from "db/pool";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { ok: false },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  const table = "bw_neon_proof";

  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        message TEXT NOT NULL
      );
    `);

    const ins = await getPool().query(
      `INSERT INTO ${table} (message) VALUES ($1) RETURNING id, created_at, message`,
      [`proof-${new Date().toISOString()}`]
    );

    const cols = await getPool().query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
      `,
      [table]
    );

    const rows = await getPool().query(
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
