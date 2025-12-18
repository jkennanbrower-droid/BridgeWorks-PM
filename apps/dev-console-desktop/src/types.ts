export type EnvName = "prod" | "staging";

export type EnvUrls = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl: string;
};

export type RenderSelection = {
  public: string;
  user: string;
  staff: string;
  api: string;
};

export type AppConfig = {
  env: EnvName;
  environments: {
    prod: EnvUrls;
    staging: EnvUrls;
  };
  debug: boolean;
  render: {
    apiKeyConfigured: boolean;
    selection: RenderSelection;
  };
};

export type HealthRow = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  ms: number;
  body?: unknown;
  error?: string;
};

export type HealthCheckAllResponse = {
  config: AppConfig;
  results: HealthRow[];
};

export type RenderService = {
  id: string;
  name: string;
  type: string;
  suspended: boolean;
  updatedAt?: string;
};

export type RenderServiceStatus = RenderService & {
  lastDeployAt?: string;
};

export type AppMeta = {
  version: string;
  commit: string;
};

export type AuditEntry = {
  ts: string;
  requestId?: string;
  action: string;
  serviceId?: string;
  ok: boolean;
  error?: string;
};
