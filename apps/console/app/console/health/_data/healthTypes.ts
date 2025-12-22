import type { ServiceKey, ServiceStatus } from "./services";

export type ObservabilityLinks = {
  errors: string;
  traces: string;
  logs: string;
};

export type ServiceHealth = {
  key: ServiceKey;
  label: string;
  status: ServiceStatus;
  statusLabel: string;
  statusReason: string;
  availability: string;
  errorRate: string;
  p95Latency: string;
  latencyMs: number | null;
  lastDeploy: string;
  topIssue: string | null;
  links: ObservabilityLinks;
};
