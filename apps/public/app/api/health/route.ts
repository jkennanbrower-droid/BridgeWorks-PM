export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "public",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
