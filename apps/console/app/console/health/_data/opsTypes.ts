export type OpsServiceCheck = {
  name: string;
  url: string;
  pathChecked: string;
  ok: boolean;
  status: number;
  latencyMs: number | null;
  json?: unknown;
  error?: string;
};

export type OpsDependencyState = "healthy" | "unhealthy" | "disabled";

export type OpsDependencyStatus = {
  state: OpsDependencyState;
  latencyMs: number | null;
  message?: string;
};

export type OpsDependenciesSnapshot = {
  db: OpsDependencyStatus;
  auth: OpsDependencyStatus;
  storage: OpsDependencyStatus;
};

export type OpsDependenciesResponse = {
  now: string;
  db: OpsDependencyStatus;
  auth: OpsDependencyStatus;
  storage: OpsDependencyStatus;
};

export type OpsStatusResponse = {
  api: {
    ok: boolean;
    uptimeSec: number;
    nodeVersion: string;
    pid: number;
    hostname: string;
    timestamp: string;
    buildSha?: string;
  };
  db: {
    ok: boolean;
    latencyMs: number | null;
    now?: string;
    error?: string;
  };
  services: OpsServiceCheck[];
  dependencies?: OpsDependenciesSnapshot;
};

export type OpsMetricsResponse = {
  ok: boolean;
  range: string;
  service: string;
  stepSec: number;
  generatedAt: string;
  empty: boolean;
  timestamps: string[];
  requestsPerMin: Array<number | null>;
  errorRate: Array<number | null>;
  latencyP50: Array<number | null>;
  latencyP95: Array<number | null>;
  latencyP99: Array<number | null>;
  dependency?: {
    dbLatencyP95: Array<number | null>;
    authLatencyP95: Array<number | null>;
    storageLatencyP95: Array<number | null>;
  };
};

export type OpsErrorItem = {
  id: string;
  timestamp: string;
  message: string;
  route: string;
  status: number;
  count: number;
  traceId: string | null;
  service?: string;
};

export type OpsErrorsResponse = {
  ok: boolean;
  range: string;
  service: string;
  items: OpsErrorItem[];
};

export type OpsTraceSpan = {
  id: string;
  name: string;
  parentId: string | null;
  durationMs: number;
};

export type OpsTraceItem = {
  id: string;
  name: string;
  durationMs: number;
  status: "ok" | "error";
  timestamp: string;
  spans: OpsTraceSpan[];
};

export type OpsTracesResponse = {
  ok: boolean;
  range: string;
  service: string;
  items: OpsTraceItem[];
};

export type OpsLogItem = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  traceId?: string | null;
  service?: string;
};

export type OpsLogsResponse = {
  ok: boolean;
  range: string;
  service: string;
  items: OpsLogItem[];
};

export type OpsTestRunResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  dependencies: OpsDependenciesSnapshot;
  services: OpsServiceCheck[];
};

export type OpsStressConfig = {
  durationSec: number;
  rps: number;
  concurrency: number;
  bytes?: number;
  ms?: number;
  targets: string[];
};

export type OpsStressProgress = {
  sent: number;
  completed: number;
  errors: number;
  lastUpdatedAt: string;
};

export type OpsStressTargetStatus = {
  key: string;
  label: string;
  url: string;
  sent: number;
  completed: number;
  errors: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
};

export type OpsStressRunResponse = {
  ok: boolean;
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  config: OpsStressConfig;
  progress: OpsStressProgress;
  targets: OpsStressTargetStatus[];
  skippedTargets?: Array<{ key: string; reason: string }>;
  summary: {
    sent: number;
    completed: number;
    errors: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    p99LatencyMs: number | null;
  };
  error?: string | null;
};

export type OpsStressStatusResponse = OpsStressRunResponse;
