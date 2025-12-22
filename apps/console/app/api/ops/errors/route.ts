import { proxyOps } from "../_proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return proxyOps(request, "errors");
}
