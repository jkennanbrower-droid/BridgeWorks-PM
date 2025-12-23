import type { ModuleLayout } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "bw.dashboard.v1";

export type StoredRoleState = {
  version: number;
  activeModuleId?: string;
  moduleOrder?: string[];
  customLayouts?: Record<string, ModuleLayout>;
  customizeMode?: boolean;
};

export type StoredAppState = {
  version: number;
  activeRole?: string;
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAppStorageKey(appId: string): string {
  return `${STORAGE_PREFIX}.${appId}`;
}

export function getRoleStorageKey(appId: string, role: string): string {
  return `${STORAGE_PREFIX}.${appId}.${role}`;
}

export function loadAppState(appId: string): StoredAppState | null {
  if (!isBrowser()) return null;
  const raw = safeParse<StoredAppState>(
    window.localStorage.getItem(getAppStorageKey(appId)),
  );
  if (!raw || raw.version !== STORAGE_VERSION) {
    return null;
  }
  return raw;
}

export function saveAppState(appId: string, state: StoredAppState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    getAppStorageKey(appId),
    JSON.stringify({ ...state, version: STORAGE_VERSION }),
  );
}

export function loadRoleState(appId: string, role: string): StoredRoleState | null {
  if (!isBrowser()) return null;
  const raw = safeParse<StoredRoleState>(
    window.localStorage.getItem(getRoleStorageKey(appId, role)),
  );
  if (!raw || raw.version !== STORAGE_VERSION) {
    return null;
  }
  return raw;
}

export function saveRoleState(
  appId: string,
  role: string,
  state: StoredRoleState,
): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    getRoleStorageKey(appId, role),
    JSON.stringify({ ...state, version: STORAGE_VERSION }),
  );
}

export function clearDashboardStorage(appId: string): void {
  if (!isBrowser()) return;
  const prefix = `${STORAGE_PREFIX}.${appId}`;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}
