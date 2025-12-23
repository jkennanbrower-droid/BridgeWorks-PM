"use client";

type DemoSessionState = {
  version: 1;
  actorId: string;
  sessionId: string;
  createdAt: number;
  lastSignedInAt: number;
};

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

const STORAGE_PREFIX = "bw.demoSession.v1";

function getStorageKey(appId: string) {
  return `${STORAGE_PREFIX}.${appId}`;
}

function randomId(prefix: string) {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
}

function safeRead(appId: string): DemoSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(appId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoSessionState>;
    if (
      parsed.version !== 1 ||
      typeof parsed.actorId !== "string" ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.lastSignedInAt !== "number"
    ) {
      return null;
    }
    return parsed as DemoSessionState;
  } catch {
    return null;
  }
}

function safeWrite(appId: string, state: DemoSessionState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(appId), JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function ensureDemoSession(appId: string): DemoSessionState {
  const now = Date.now();
  const existing = safeRead(appId);
  if (existing) {
    if (existing.sessionId.trim() !== "") return existing;
    const next: DemoSessionState = {
      ...existing,
      sessionId: randomId("session"),
      lastSignedInAt: now,
    };
    safeWrite(appId, next);
    return next;
  }

  const state: DemoSessionState = {
    version: 1,
    actorId: randomId("actor"),
    sessionId: randomId("session"),
    createdAt: now,
    lastSignedInAt: now,
  };
  safeWrite(appId, state);
  return state;
}

export function getDemoSession(appId: string): DemoSessionState | null {
  return safeRead(appId);
}

export function resetDemoSession(appId: string): DemoSessionState | null {
  const existing = safeRead(appId);
  if (!existing) return null;

  const next: DemoSessionState = {
    ...existing,
    sessionId: randomId("session"),
    lastSignedInAt: Date.now(),
  };
  safeWrite(appId, next);
  return next;
}

export function clearDemoSession(appId: string): void {
  const existing = safeRead(appId);
  if (!existing) return;
  safeWrite(appId, {
    ...existing,
    sessionId: "",
    lastSignedInAt: Date.now(),
  });
}

export function getDemoActorId(appId: string): string {
  return ensureDemoSession(appId).actorId;
}

export function getPublicBaseUrl(): string | null {
  const env = process?.env ?? {};
  const raw = env.NEXT_PUBLIC_PUBLIC_APP_URL ?? env.PB_PUBLIC_BASE_URL;
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function buildPublicUrl(path: string): string {
  const base = getPublicBaseUrl();
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
