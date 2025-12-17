import { getPool } from "db/pool";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await getPool().query("select now() as now");
    return Response.json({ ok: true, now: r.rows[0].now });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
