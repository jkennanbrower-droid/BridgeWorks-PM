import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function getAuditPath() {
  return path.join(app.getPath("userData"), "audit.log");
}

export async function appendAudit(entry) {
  const line = JSON.stringify(entry) + "\n";
  await fs.promises.appendFile(getAuditPath(), line, { encoding: "utf8" });
}

