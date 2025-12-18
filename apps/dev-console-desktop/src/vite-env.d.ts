/// <reference types="vite/client" />

export type DevConsoleConfig = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl: string;
  adminToken?: string; // optional (you can hide it in UI)
};

export type HealthRow = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  ms: number;
  body?: unknown;   // unknown instead of any
  error?: string;
};

declare global {
  interface Window {
    bw: {
      getConfig: () => Promise<DevConsoleConfig>;
      setConfig: (cfg: Partial<DevConsoleConfig>) => Promise<DevConsoleConfig>;
      checkAll: () => Promise<{ config: DevConsoleConfig; results: HealthRow[] }>;
    };
  }
}

export {};
