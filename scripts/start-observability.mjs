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
  console.warn(
    "\n[observability] Docker not found; Prometheus not started.\n" +
      "Install Docker Desktop (or set SKIP_OBSERVABILITY=1 to silence this).\n",
  );
  process.exit(0);
}

const composeArgs = [
  "compose",
  "-f",
  "infra/observability/docker-compose.yml",
  "up",
  "-d",
];

const result = spawnSync("docker", composeArgs, {
  stdio: "inherit",
  shell: true,
});

if (result.status === 0) {
  process.exit(0);
}

console.warn(
  "\n[observability] Prometheus was not started (docker compose failed). Continuing without it.\n" +
    "Set SKIP_OBSERVABILITY=1 to silence this, or run `pnpm dev:obs` once Docker is available.\n",
);

process.exit(0);
