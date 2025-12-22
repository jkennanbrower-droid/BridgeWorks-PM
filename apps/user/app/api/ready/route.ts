import { createHealthHandler } from "shared/health";
import { httpMetrics } from "../../_telemetry/httpMetrics";

export const runtime = "nodejs";

export const GET = httpMetrics.withRouteHandler(createHealthHandler("user"), {
  route: "/api/ready",
});
