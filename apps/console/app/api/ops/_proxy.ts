import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

function getApiBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase && envBase.length > 0) {
    return envBase.replace(/\/+$/, "");
  }
  return "http://localhost:3103";
}

export async function proxyOps(request: Request, path: string) {
  noStore();
  const url = new URL(request.url);
  const target = new URL(`${getApiBaseUrl()}/ops/${path}`);
  url.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const method = request.method.toUpperCase();
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const opsKey = process.env.OPS_KEY;
    const requestOpsKey = request.headers.get("x-ops-key");
    if (opsKey) {
      headers.set("x-ops-key", opsKey);
    } else if (requestOpsKey) {
      headers.set("x-ops-key", requestOpsKey);
    }
    const body =
      method !== "GET" && method !== "HEAD" ? await request.text() : undefined;
    const res = await fetch(target.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream ops/${path} ${res.status}` },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 },
    );
  }
}
