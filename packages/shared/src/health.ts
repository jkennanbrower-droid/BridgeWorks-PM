import { jsonNoStore } from "./http";

export function createHealthHandler(service: string) {
  return async function GET() {
    return jsonNoStore({
      ok: true,
      service,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };
}

