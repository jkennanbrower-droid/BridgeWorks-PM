import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { httpMetrics } from "../../../_telemetry/httpMetrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleGET() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieNames = cookieStore.getAll().map((c) => c.name);
  const cookieHeader = headerStore.get("cookie") ?? "";

  return NextResponse.json({
    ok: true,
    auth: { disabled: true },
    cookies: {
      count: cookieNames.length,
      names: cookieNames.slice(0, 50),
      hasSessionCookie:
        cookieNames.includes("__session") ||
        cookieNames.some((name) => name.startsWith("__session_")),
      headerPresent: cookieHeader.length > 0,
    },
  });
}

export const GET = httpMetrics.withRouteHandler(handleGET, {
  route: "/api/auth/debug",
});
