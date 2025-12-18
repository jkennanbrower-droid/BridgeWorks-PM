import type {
  AppConfig,
  HealthCheckAllResponse,
  RenderService,
  RenderServiceStatus,
  RenderSelection
} from "./types";

type RenderDeployArgs = { serviceId: string; clearCache?: boolean };
type RenderServiceStatusArgs = { serviceId: string };

export type BwApi = {
  config: {
    get: () => Promise<AppConfig>;
    set: (next: Partial<AppConfig> & { render?: { selection?: Partial<RenderSelection> } }) => Promise<AppConfig>;
  };
  health: {
    checkAll: () => Promise<HealthCheckAllResponse>;
  };
  render: {
    apiKeyConfigured: () => Promise<{ configured: boolean }>;
    listServices: () => Promise<RenderService[]>;
    serviceStatus: (args: RenderServiceStatusArgs) => Promise<RenderServiceStatus>;
    deploy: (args: RenderDeployArgs) => Promise<unknown>;
    suspend: (args: { serviceId: string }) => Promise<unknown>;
    resume: (args: { serviceId: string }) => Promise<unknown>;
  };
  // legacy
  getConfig: () => Promise<AppConfig>;
  setConfig: (next: Partial<AppConfig>) => Promise<AppConfig>;
  checkAll: () => Promise<HealthCheckAllResponse>;
  renderDeploy: (args: RenderDeployArgs) => Promise<unknown>;
  renderSuspend: (args: { serviceId: string }) => Promise<unknown>;
  renderResume: (args: { serviceId: string }) => Promise<unknown>;
};

export function requireBw(): BwApi {
  const bw = (window as any).bw as BwApi | undefined;
  if (!bw) throw new Error("window.bw is undefined (preload not attached)");
  return bw;
}

export function formatUnknownError(e: unknown): string {
  if (e instanceof Error) return e.stack || e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

