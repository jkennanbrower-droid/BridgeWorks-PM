import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPrisma } from "db";

const PLATFORM_ROLES = new Set([
  "founder",
  "platform_admin",
  "support_admin",
  "support_agent",
  "auditor",
]);

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return null;
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;
  const composed = [user.firstName, user.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
  return composed || null;
}

function resolvePlatformRole({
  email,
  user,
  allowlist,
  existingRole,
}: {
  email: string;
  user: Awaited<ReturnType<typeof currentUser>>;
  allowlist: Set<string>;
  existingRole: string | null | undefined;
}) {
  if (allowlist.has(email)) {
    return "founder";
  }

  const metadataRole =
    user && typeof user.publicMetadata?.platform_role === "string"
      ? user.publicMetadata.platform_role
      : null;
  if (metadataRole && PLATFORM_ROLES.has(metadataRole)) {
    return metadataRole;
  }

  if (existingRole && PLATFORM_ROLES.has(existingRole)) {
    return existingRole;
  }

  return null;
}

export async function ensureConsolePerson() {
  noStore();
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) {
    throw new Error("Missing Clerk user email.");
  }

  const allowlist = parseAllowlist(process.env.CONSOLE_FOUNDER_ALLOWLIST);
  const prisma = getPrisma();

  const existingByClerk = await prisma.person.findUnique({
    where: { clerkUserId: userId },
  });
  const existingByEmail = existingByClerk
    ? null
    : await prisma.person.findUnique({
        where: { email },
      });

  const existingRole =
    existingByClerk?.platformRole ?? existingByEmail?.platformRole ?? null;
  const platformRole = resolvePlatformRole({
    email,
    user,
    allowlist,
    existingRole,
  });
  const name = normalizeName(user);
  const now = new Date();

  if (existingByClerk) {
    return prisma.person.update({
      where: { id: existingByClerk.id },
      data: {
        email,
        name,
        platformRole: platformRole ?? existingByClerk.platformRole,
        lastLoginAt: now,
      },
    });
  }

  if (existingByEmail) {
    return prisma.person.update({
      where: { id: existingByEmail.id },
      data: {
        clerkUserId: userId,
        name,
        platformRole: platformRole ?? existingByEmail.platformRole,
        lastLoginAt: now,
      },
    });
  }

  return prisma.person.create({
    data: {
      clerkUserId: userId,
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
  if (!person.platformRole || !PLATFORM_ROLES.has(person.platformRole)) {
    throw new Error("Not authorized for console access.");
  }
  return person;
}
