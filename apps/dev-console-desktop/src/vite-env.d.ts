/// <reference types="vite/client" />

import type { AppConfig, HealthCheckAllResponse, RenderService, RenderServiceStatus, RenderSelection } from "./types";

type RenderDeployArgs = { serviceId: string; clearCache?: boolean };

declare global {
  interface Window {
    bw: {
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
        serviceStatus: (args: { serviceId: string }) => Promise<RenderServiceStatus>;
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
  }
}

export {};

