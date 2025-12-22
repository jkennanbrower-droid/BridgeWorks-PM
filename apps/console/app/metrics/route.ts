import { httpMetrics } from "../_telemetry/httpMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const body = await httpMetrics.metricsText();
  const contentType =
    httpMetrics.registry.contentType ??
    "text/plain; version=0.0.4; charset=utf-8";
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

