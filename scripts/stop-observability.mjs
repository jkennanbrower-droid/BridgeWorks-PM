import { spawnSync } from "node:child_process";

const shouldSkip =
  String(process.env.SKIP_OBSERVABILITY ?? "").toLowerCase() === "1" ||
  String(process.env.SKIP_OBSERVABILITY ?? "").toLowerCase() === "true";

if (shouldSkip) {
  process.exit(0);
}

function hasDocker() {
  if (process.platform === "win32") {
    const check = spawnSync("where", ["docker"], { stdio: "ignore", shell: true });
    return check.status === 0;
  }
  const check = spawnSync("sh", ["-lc", "command -v docker"], {
    stdio: "ignore",
    shell: true,
  });
  return check.status === 0;
}

if (!hasDocker()) {
  process.exit(0);
}

const composeArgs = ["compose", "-f", "infra/observability/docker-compose.yml", "down"];

const result = spawnSync("docker", composeArgs, {
  stdio: "inherit",
  shell: true,
});

if (result.status === 0) {
  process.exit(0);
}

console.warn(
  "\n[observability] Prometheus was not stopped (docker compose failed). Continuing.\n",
);

process.exit(0);
