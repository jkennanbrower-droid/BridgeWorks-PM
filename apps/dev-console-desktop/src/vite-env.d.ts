/// <reference types="vite/client" />

export {};

type RenderServicesMap = {
  public: string;
  user: string;
  staff: string;
  api: string;
};

type DevConsoleConfig = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl: string;

  adminToken?: string;

  renderApiKey?: string; // will come back masked as ••••••
  renderServices?: RenderServicesMap;
};

type HealthRow = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  ms: number;
  body?: unknown;
  error?: string;
};

type HealthCheckAllResponse = {
  config: DevConsoleConfig;
  results: HealthRow[];
};

type RenderDeployArgs = { serviceId: string; clearCache?: boolean };
type RenderSuspendArgs = { serviceId: string };
type RenderResumeArgs = { serviceId: string };

declare global {
  interface Window {
    bw: {
      // config + health
      getConfig: () => Promise<DevConsoleConfig>;
      setConfig: (cfg: Partial<DevConsoleConfig>) => Promise<DevConsoleConfig>;
      checkAll: () => Promise<HealthCheckAllResponse>;

      // render controls
      renderDeploy: (args: RenderDeployArgs) => Promise<unknown>;
      renderSuspend: (args: RenderSuspendArgs) => Promise<unknown>;
      renderResume: (args: RenderResumeArgs) => Promise<unknown>;
    };
  }
}
