import { proxyOps } from "../_proxy";
import { httpMetrics } from "../../../_telemetry/httpMetrics";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  return proxyOps(request, "logs");
}

export const GET = httpMetrics.withRouteHandler(handleGET, {
  route: "/api/ops/logs",
});
