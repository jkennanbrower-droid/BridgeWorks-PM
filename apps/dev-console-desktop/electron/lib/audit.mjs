import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export function getAuditPath() {
  return path.join(app.getPath("userData"), "audit.log");
}

export async function appendAudit(entry) {
  const line = JSON.stringify(entry) + "\n";
  await fs.promises.appendFile(getAuditPath(), line, { encoding: "utf8" });
}

export async function readRecentAudit({ limit = 10 } = {}) {
  try {
    const buf = await fs.promises.readFile(getAuditPath(), { encoding: "utf8" });
    const lines = buf.split(/\r?\n/).filter(Boolean);
    const tail = lines.slice(-Math.max(1, Number(limit) || 10));
    const parsed = [];
    for (const line of tail) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        parsed.push({ ts: "", action: "audit.parse_error", ok: false, error: "Invalid JSON line" });
      }
    }
    return parsed.reverse(); // newest first
  } catch {
    return [];
  }
}
