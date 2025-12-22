import { proxyOps } from "../../_proxy";
import { httpMetrics } from "../../../../_telemetry/httpMetrics";

export const runtime = "nodejs";

async function handlePOST(request: Request) {
  return proxyOps(request, "stress/run");
}

export const POST = httpMetrics.withRouteHandler(handlePOST, {
  route: "/api/ops/stress/run",
});
