import type { AppConfig } from "../types";
import { Dot } from "./Dot";

export function EnvPill({ env }: { env: AppConfig["env"] }) {
  const label = env === "prod" ? "Production" : "Staging";
  const dot = env === "prod" ? "blue" : "purple";
  return (
    <span className="envPill">
      <Dot tone={dot} />
      {label}
    </span>
  );
}

