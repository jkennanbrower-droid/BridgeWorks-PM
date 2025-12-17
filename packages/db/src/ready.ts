import { getPool } from "./pool";

function noStoreHeaders(): HeadersInit {
  return { "cache-control": "no-store" };
}

export function createDbReadyHandler(service: string) {
  return async function GET() {
    try {
      await getPool().query("select 1");
      return Response.json(
        { ok: true, service, db: "ok", timestamp: new Date().toISOString() },
        { headers: noStoreHeaders() }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json(
        { ok: false, service, db: "down", error: msg, timestamp: new Date().toISOString() },
        { status: 503, headers: noStoreHeaders() }
      );
    }
  };
}

