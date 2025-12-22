import type { ComponentType } from "react";
import type { OpsServiceCheck } from "./opsTypes";
import type { ServiceKey, ServiceStatus } from "./services";

export type ServiceSnapshot = {
  key: ServiceKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  status: ServiceStatus;
  statusText: string;
  statusReason: string;
  latencyMs: number | null;
  lastDeploy: string;
  check: OpsServiceCheck | null;
};
