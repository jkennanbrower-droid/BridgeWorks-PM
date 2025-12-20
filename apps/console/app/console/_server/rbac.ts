import "server-only";

import { ensureConsolePerson } from "./people";

export const PLATFORM_ROLES = [
  "founder",
  "platform_admin",
  "support_admin",
  "support_agent",
  "auditor",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && PLATFORM_ROLES.includes(value as PlatformRole);
}

export const ADMIN_PLATFORM_ROLES: PlatformRole[] = [
  "founder",
  "platform_admin",
  "support_admin",
];

export function hasPlatformAccess(person: {
  platformRole: string | null;
  status?: string;
}) {
  if (person.status && person.status !== "active") {
    return false;
  }
  return Boolean(person.platformRole && isPlatformRole(person.platformRole));
}

export async function requirePlatformRole(roles: PlatformRole[]) {
  const person = await ensureConsolePerson();
  if (!person) {
    throw new Error("Not authenticated.");
  }
  if (person.status !== "active") {
    throw new Error("Account disabled.");
  }
  if (!person.platformRole || !roles.includes(person.platformRole)) {
    throw new Error("Not authorized for console access.");
  }
  return person;
}
