import { proxyOps } from "../../_proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return proxyOps(request, "stress/run");
}
