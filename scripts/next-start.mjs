import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";

const child = spawn("next", ["start", "-p", port], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exit(code);
  process.exit(signal ? 1 : 0);
});

