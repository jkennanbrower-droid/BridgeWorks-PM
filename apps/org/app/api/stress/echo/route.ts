import { NextResponse } from "next/server";
import { requireOpsTestAccess } from "shared/ops";
import { parsePositiveInt } from "shared/numbers";

import { httpMetrics } from "../../../_telemetry/httpMetrics";

export const runtime = "nodejs";

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleGET(request: Request) {
  const denied = requireOpsTestAccess(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const bytes = parsePositiveInt(searchParams.get("bytes"), {
    min: 0,
    max: 256 * 1024,
    fallback: 256,
  });
  const delayMs = parsePositiveInt(searchParams.get("ms"), {
    min: 0,
    max: 10_000,
    fallback: 0,
  });

  if (delayMs > 0) {
    await sleepMs(delayMs);
  }

  const payload = Buffer.alloc(bytes, 97);
  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = httpMetrics.withRouteHandler(handleGET, {
  route: "/api/stress/echo",
});
