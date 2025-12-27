import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const auditScript = path.join(repoRoot, "scripts", "phase1-audit.mjs");

test("phase 1 audit checklist passes", () => {
  const result = spawnSync(process.execPath, [auditScript], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    assert.fail(output || "Phase 1 audit failed");
  }
});
