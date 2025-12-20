import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPrisma } from "db";

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function ensureConsolePerson() {
  noStore();
  const { userId } = auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) {
    throw new Error("Missing Clerk user email.");
  }

  const allowlist = parseAllowlist(process.env.CONSOLE_FOUNDER_ALLOWLIST);
  const isAllowed = allowlist.has(email);
  const prisma = getPrisma();

  return prisma.person.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      email,
      isPlatformAdmin: isAllowed,
    },
    update: {
      email,
      ...(isAllowed ? { isPlatformAdmin: true } : {}),
    },
  });
}

export async function requirePlatformAdmin() {
  const person = await ensureConsolePerson();
  if (!person) {
    throw new Error("Not authenticated.");
  }
  if (!person.isPlatformAdmin) {
    throw new Error("Not authorized for console access.");
  }
  return person;
}
