"use client";

import { clearDashboardStorage, clearMessagingUiStorage } from "./storage";

export type DemoUser = {
  id: string;
  role: string;
  displayName: string;
  email: string;
  permissions: string[];
  avatarUrl?: string;
};

type DemoSessionState = {
  version: 1;
  appId: string;
  orgId: string;
  actorId: string;
  sessionId: string;
  createdAt: number;
  lastSignedInAt: number;
  actorsByRole?: Record<string, string>;
  lastRole?: string;
};

type DemoUsersState = {
  version: 1;
  createdAt: number;
  users: DemoUser[];
};

declare const process: {
  env: Record<string, string | undefined>;
};

const SESSION_STORAGE_PREFIX = "bw.demo.session.v1";
const USERS_STORAGE_PREFIX = "bw.demo.users.v1";
const DEFAULT_ORG_ID = "demo-org-1";

type ParsedDemoSessionState = DemoSessionState & {
  // Internal flag: true when the stored record is missing optional fields
  // (e.g., orgId) or uses legacy keys (e.g., userId) and should be rewritten.
  __needsPersist: boolean;
};

function getSessionStorageKey(appId: string) {
  return `${SESSION_STORAGE_PREFIX}.${appId}`;
}

function getUsersStorageKey(appId: string, orgId: string) {
  return `${USERS_STORAGE_PREFIX}.${appId}.${orgId}`;
}

function randomId(prefix: string) {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
}

function stableDemoUserId(appId: string, orgId: string, role: string) {
  return `demo_${appId}_${orgId}_${role}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function demoEmail(appId: string, orgId: string, role: string) {
  const normalized = `${role}@${appId}.${orgId}.demo.bridgeworks.invalid`;
  return normalized.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

function normalizeRole(role: string | undefined): string | null {
  const trimmed = role?.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.values(record).every((v) => typeof v === "string");
}

function seedDemoUsers(appId: string, orgId: string): DemoUser[] {
  if (appId === "staff") {
    return [
      {
        id: stableDemoUserId(appId, orgId, "staff_admin"),
        role: "staff_admin",
        displayName: "Avery Chen",
        email: demoEmail(appId, orgId, "staff_admin"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "property_manager"),
        role: "property_manager",
        displayName: "Jordan Patel",
        email: demoEmail(appId, orgId, "property_manager"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "maintenance"),
        role: "maintenance",
        displayName: "Sam Rivera",
        email: demoEmail(appId, orgId, "maintenance"),
        permissions: ["SUPER"],
      },
    ];
  }

  if (appId === "user") {
    return [
      {
        id: stableDemoUserId(appId, orgId, "tenant_primary"),
        role: "tenant_primary",
        displayName: "Taylor Johnson",
        email: demoEmail(appId, orgId, "tenant_primary"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "tenant_roommate"),
        role: "tenant_roommate",
        displayName: "Morgan Lee",
        email: demoEmail(appId, orgId, "tenant_roommate"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "tenant_guest"),
        role: "tenant_guest",
        displayName: "Casey Smith",
        email: demoEmail(appId, orgId, "tenant_guest"),
        permissions: ["SUPER"],
      },
    ];
  }

  if (appId === "org") {
    return [
      {
        id: stableDemoUserId(appId, orgId, "org_owner"),
        role: "org_owner",
        displayName: "Riley Thompson",
        email: demoEmail(appId, orgId, "org_owner"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "org_admin"),
        role: "org_admin",
        displayName: "Alex Martinez",
        email: demoEmail(appId, orgId, "org_admin"),
        permissions: ["SUPER"],
      },
      {
        id: stableDemoUserId(appId, orgId, "org_accountant"),
        role: "org_accountant",
        displayName: "Jamie Nguyen",
        email: demoEmail(appId, orgId, "org_accountant"),
        permissions: ["SUPER"],
      },
    ];
  }

  const fallbackRoles = ["demo_user_1", "demo_user_2", "demo_user_3"];
  return fallbackRoles.map((role, index) => ({
    id: stableDemoUserId(appId, orgId, role),
    role,
    displayName: `Demo User ${index + 1}`,
    email: demoEmail(appId, orgId, role),
    permissions: ["SUPER"],
  }));
}

function safeReadSession(appId: string): ParsedDemoSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getSessionStorageKey(appId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<
      DemoSessionState & { userId?: string; actorId?: string; orgId?: string }
    >;

    if (typeof parsed.version !== "undefined" && parsed.version !== 1) return null;

    const storedAppIdRaw = typeof parsed.appId === "string" ? parsed.appId.trim() : "";
    const storedAppId = storedAppIdRaw ? storedAppIdRaw : appId;
    if (typeof parsed.sessionId !== "string" || !parsed.sessionId.trim()) return null;

    const now = Date.now();
    const orgIdRaw = typeof parsed.orgId === "string" ? parsed.orgId.trim() : "";
    const orgId = orgIdRaw ? parsed.orgId!.trim() : DEFAULT_ORG_ID;

    const legacyUserId =
      typeof parsed.userId === "string" && parsed.userId.trim()
        ? parsed.userId.trim()
        : null;
    const actorId =
      typeof parsed.actorId === "string" && parsed.actorId.trim()
        ? parsed.actorId.trim()
        : legacyUserId;
    if (!actorId) return null;

    const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : now;
    const lastSignedInAt =
      typeof parsed.lastSignedInAt === "number" ? parsed.lastSignedInAt : createdAt;

    const actorsByRole = isStringRecord(parsed.actorsByRole)
      ? (parsed.actorsByRole as Record<string, string>)
      : undefined;
    const lastRole = typeof parsed.lastRole === "string" ? parsed.lastRole : undefined;

    const needsPersist =
      typeof parsed.version === "undefined" ||
      !storedAppIdRaw ||
      !orgIdRaw ||
      !legacyUserId ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.lastSignedInAt !== "number";

    return {
      version: 1,
      appId: storedAppId,
      orgId,
      actorId,
      sessionId: parsed.sessionId.trim(),
      createdAt,
      lastSignedInAt,
      actorsByRole,
      lastRole,
      __needsPersist: needsPersist,
    };
  } catch {
    return null;
  }
}

function safeWriteSession(appId: string, state: DemoSessionState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getSessionStorageKey(appId),
      JSON.stringify({ ...state, userId: state.actorId }),
    );
  } catch {
    // ignore storage errors
  }
}

function safeReadUsers(appId: string, orgId: string): DemoUsersState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getUsersStorageKey(appId, orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoUsersState>;
    if (
      parsed.version !== 1 ||
      typeof parsed.createdAt !== "number" ||
      !Array.isArray(parsed.users)
    ) {
      return null;
    }
    const users = parsed.users as DemoUser[];
    if (
      !users.every(
        (u) =>
          u &&
          typeof u.id === "string" &&
          typeof u.role === "string" &&
          typeof u.displayName === "string" &&
          typeof u.email === "string" &&
          Array.isArray(u.permissions),
      )
    ) {
      return null;
    }
    return { version: 1, createdAt: parsed.createdAt, users };
  } catch {
    return null;
  }
}

function safeWriteUsers(appId: string, orgId: string, state: DemoUsersState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getUsersStorageKey(appId, orgId),
      JSON.stringify(state),
    );
  } catch {
    // ignore storage errors
  }
}

function clearMockMessagingStorage(appId: string, orgId: string) {
  if (typeof window === "undefined") return;
  const prefix = `bw.messaging.mock.v1.${appId}.${orgId}.`;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

function requiredRolesForApp(appId: string): string[] {
  if (appId === "staff") return ["staff_admin", "property_manager", "maintenance"];
  if (appId === "user") return ["tenant_primary", "tenant_roommate", "tenant_guest"];
  if (appId === "org") return ["org_owner", "org_admin", "org_accountant"];
  return ["demo_user_1", "demo_user_2", "demo_user_3"];
}

export function ensureDemoUsers(appId: string, orgId: string): DemoUsersState {
  const expectedRoles = requiredRolesForApp(appId);
  const existing = safeReadUsers(appId, orgId);
  if (existing) {
    const roles = existing.users.map((u) => u.role);
    const roleSet = new Set(roles);
    const matches =
      existing.users.length === expectedRoles.length &&
      expectedRoles.every((r) => roleSet.has(r));
    if (matches) return existing;
  }

  const state: DemoUsersState = {
    version: 1,
    createdAt: Date.now(),
    users: seedDemoUsers(appId, orgId),
  };
  safeWriteUsers(appId, orgId, state);
  return state;
}

export function getDemoUsers(appId: string, orgId: string): DemoUser[] {
  return ensureDemoUsers(appId, orgId).users;
}

export function getDemoUserById(
  appId: string,
  orgId: string,
  userId: string,
): DemoUser | null {
  const users = ensureDemoUsers(appId, orgId).users;
  return users.find((u) => u.id === userId) ?? null;
}

export function ensureDemoSession(appId: string): DemoSessionState {
  const now = Date.now();
  const existing = safeReadSession(appId);
  const orgId = existing?.orgId?.trim() ? existing.orgId : DEFAULT_ORG_ID;
  const usersState = ensureDemoUsers(appId, orgId);
  const desiredActorId = existing?.actorId;
  const hasUser = desiredActorId ? usersState.users.some((u) => u.id === desiredActorId) : false;

  const next: DemoSessionState = {
    version: 1,
    appId,
    orgId,
    actorId: hasUser ? (desiredActorId as string) : usersState.users[0]!.id,
    sessionId: existing?.sessionId?.trim() ? existing.sessionId : randomId("session"),
    createdAt: existing?.createdAt ?? now,
    lastSignedInAt: existing?.lastSignedInAt ?? now,
    actorsByRole: existing?.actorsByRole,
    lastRole: existing?.lastRole,
  };

  if (
    !existing ||
    existing.orgId !== next.orgId ||
    existing.actorId !== next.actorId ||
    existing.sessionId !== next.sessionId ||
    existing.appId !== next.appId ||
    existing.__needsPersist
  ) {
    safeWriteSession(appId, next);
  }
  return next;
}

export function getDemoSession(appId: string): DemoSessionState | null {
  const session = safeReadSession(appId);
  if (!session) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __needsPersist, ...rest } = session;
  return rest;
}

export function resetDemoSession(appId: string): DemoSessionState | null {
  const existing = ensureDemoSession(appId);
  const next: DemoSessionState = {
    ...existing,
    sessionId: randomId("session"),
    lastSignedInAt: Date.now(),
  };
  safeWriteSession(appId, next);
  return next;
}

export function clearDemoSession(appId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getSessionStorageKey(appId));
  } catch {
    // ignore
  }
}

export function resetDemoData(appId: string, orgId?: string): void {
  const session = ensureDemoSession(appId);
  const targetOrgId = orgId ?? session.orgId;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(getUsersStorageKey(appId, targetOrgId));
      window.localStorage.removeItem(getSessionStorageKey(appId));
    } catch {
      // ignore
    }
  }
  clearMockMessagingStorage(appId, targetOrgId);
  clearDashboardStorage(appId);
  clearMessagingUiStorage(appId);
  ensureDemoSession(appId);
}

export function getDemoActorId(appId: string): string {
  return ensureDemoSession(appId).actorId;
}

export function getDemoOrgId(appId: string): string {
  return ensureDemoSession(appId).orgId;
}

export function setActiveDemoUserId(appId: string, userId: string): DemoSessionState {
  const session = ensureDemoSession(appId);
  const users = ensureDemoUsers(appId, session.orgId).users;
  const valid = users.some((u) => u.id === userId);
  const nextUserId = valid ? userId : users[0]!.id;
  const next: DemoSessionState =
    nextUserId === session.actorId
      ? session
      : {
          ...session,
          actorId: nextUserId,
          lastRole: users.find((u) => u.id === nextUserId)?.role ?? session.lastRole,
          lastSignedInAt: Date.now(),
        };
  if (next !== session) safeWriteSession(appId, next);
  return next;
}

export function setActiveDemoUserRole(appId: string, role: string): DemoSessionState {
  const session = ensureDemoSession(appId);
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return session;

  const actorId = getDemoActorIdForRole(appId, normalizedRole);
  const next: DemoSessionState =
    session.actorId === actorId && session.lastRole === normalizedRole
      ? session
      : {
          ...session,
          actorId,
          lastRole: normalizedRole,
          lastSignedInAt: Date.now(),
        };

  if (next !== session) safeWriteSession(appId, next);
  return next;
}

export function getDemoActorIdForRole(appId: string, role?: string): string {
  const session = ensureDemoSession(appId);
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return session.actorId;

  const existingActorId = session.actorsByRole?.[normalizedRole];
  if (existingActorId?.trim()) return existingActorId;

  const users = ensureDemoUsers(appId, session.orgId).users;
  const match = users.find((u) => normalizeRole(u.role) === normalizedRole);
  const actorId = match?.id ?? stableDemoUserId(appId, session.orgId, normalizedRole);

  safeWriteSession(appId, {
    ...session,
    actorsByRole: { ...(session.actorsByRole ?? {}), [normalizedRole]: actorId },
  });
  return actorId;
}

export function getActiveDemoUser(appId: string): DemoUser | null {
  const session = ensureDemoSession(appId);
  return getDemoUserById(appId, session.orgId, session.actorId);
}

export function getPublicBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_PUBLIC_APP_URL ?? process.env.PB_PUBLIC_BASE_URL;
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
