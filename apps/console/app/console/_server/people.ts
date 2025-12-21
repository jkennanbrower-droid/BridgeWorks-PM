import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getPrisma, type PlatformRole } from "db";

const PLATFORM_ROLES = [
  "founder",
  "platform_admin",
  "support_admin",
  "support_agent",
  "auditor",
 ] as const satisfies ReadonlyArray<PlatformRole>;

const PLATFORM_ROLE_SET = new Set<PlatformRole>(PLATFORM_ROLES);

const DEFAULT_NO_AUTH_EMAIL = "no-auth@bridgeworks.local";
const DEFAULT_NO_AUTH_NAME = "No Auth";

export async function ensureConsolePerson() {
  noStore();
  const email = (process.env.CONSOLE_NO_AUTH_EMAIL ?? DEFAULT_NO_AUTH_EMAIL)
    .trim()
    .toLowerCase();
  const name = process.env.CONSOLE_NO_AUTH_NAME ?? DEFAULT_NO_AUTH_NAME;
  const prisma = getPrisma();

  const existingByEmail = await prisma.person.findUnique({
    where: { email },
  });
  const existingRole = existingByEmail?.platformRole ?? null;
  const platformRole = existingRole && PLATFORM_ROLE_SET.has(existingRole)
    ? existingRole
    : "founder";
  const now = new Date();

  if (existingByEmail) {
    return prisma.person.update({
      where: { id: existingByEmail.id },
      data: {
        name,
        platformRole: platformRole ?? existingByEmail.platformRole,
        lastLoginAt: now,
      },
    });
  }

  return prisma.person.create({
    data: {
      email,
      name,
      platformRole,
      status: "active",
      lastLoginAt: now,
    },
  });
}

export async function requirePlatformAdmin() {
  const person = await ensureConsolePerson();
  if (!person) {
    throw new Error("Not authenticated.");
  }
  if (!person.platformRole || !PLATFORM_ROLE_SET.has(person.platformRole)) {
    throw new Error("Not authorized for console access.");
  }
  return person;
}
