import { proxyOps } from "../../_proxy";
import { httpMetrics } from "../../../../_telemetry/httpMetrics";

export const runtime = "nodejs";

async function handlePOST(request: Request) {
  return proxyOps(request, "test/run");
}

export const POST = httpMetrics.withRouteHandler(handlePOST, {
  route: "/api/ops/test/run",
});
