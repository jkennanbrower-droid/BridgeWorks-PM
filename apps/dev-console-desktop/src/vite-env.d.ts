/// <reference types="vite/client" />

import type {
  AppConfig,
  AppMeta,
  AuditEntry,
  HealthCheckAllResponse,
  RenderService,
  RenderServiceStatus,
  RenderSelection
} from "./types";

type RenderDeployArgs = { serviceId: string; clearCache?: boolean };
type WithRequestId<T = unknown> = { requestId: string; data: T };

declare global {
  interface Window {
    bw: {
      app: {
        meta: () => Promise<AppMeta>;
      };
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
        deploy: (args: RenderDeployArgs) => Promise<WithRequestId>;
        suspend: (args: { serviceId: string }) => Promise<WithRequestId>;
        resume: (args: { serviceId: string }) => Promise<WithRequestId>;
      };
      audit: {
        path: () => Promise<{ path: string }>;
        recent: (args?: { limit?: number }) => Promise<{ entries: AuditEntry[] }>;
      };

      // legacy
      getConfig: () => Promise<AppConfig>;
      setConfig: (next: Partial<AppConfig>) => Promise<AppConfig>;
      checkAll: () => Promise<HealthCheckAllResponse>;
      renderDeploy: (args: RenderDeployArgs) => Promise<WithRequestId>;
      renderSuspend: (args: { serviceId: string }) => Promise<WithRequestId>;
      renderResume: (args: { serviceId: string }) => Promise<WithRequestId>;
    };
  }
}

export {};
