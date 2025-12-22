import { jsonNoStore } from "./http";

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function requireOpsTestAccess(request: Request): Response | null {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !isTruthyEnv(process.env.OPS_ALLOW_TESTS)) {
    return jsonNoStore(
      { ok: false, error: "Ops test endpoints disabled." },
      { status: 403 },
    );
  }

  const requiredKey = process.env.OPS_KEY;
  if (requiredKey) {
    const provided = request.headers.get("x-ops-key");
    if (!provided || provided !== requiredKey) {
      return jsonNoStore({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }

  return null;
}

