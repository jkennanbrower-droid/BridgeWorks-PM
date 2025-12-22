"use server";

import { revalidatePath } from "next/cache";

import { getPrisma } from "db";

import { logAudit } from "../../_server/audit";
import { ADMIN_PLATFORM_ROLES, requirePlatformRole } from "../../_server/rbac";
import { PERSON_STATUSES, PLATFORM_ROLES } from "../constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

type PlatformRole = (typeof PLATFORM_ROLES)[number];
type PersonStatus = (typeof PERSON_STATUSES)[number];

const PLATFORM_ROLE_SET = new Set<string>(PLATFORM_ROLES);
const PERSON_STATUS_SET = new Set<string>(PERSON_STATUSES);

function requireString(formData: FormData, field: string) {
  const value = formData.get(field);
  if (typeof value !== "string") {
    throw new Error(`Missing ${field}.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  return trimmed;
}

function requireEmail(formData: FormData) {
  const email = requireString(formData, "email").toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Enter a valid email.");
  }
  return email;
}

function readOptionalRole(formData: FormData): PlatformRole | null {
  const value = formData.get("platformRole");
  if (typeof value !== "string") {
    throw new Error("Missing platform role.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!PLATFORM_ROLE_SET.has(trimmed)) {
    throw new Error("Select a valid platform role.");
  }
  return trimmed as PlatformRole;
}

function requireStatus(formData: FormData): PersonStatus {
  const status = requireString(formData, "status");
  if (!PERSON_STATUS_SET.has(status)) {
    throw new Error("Select a valid status.");
  }
  return status as PersonStatus;
}

function splitName(name: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return { firstName: null, lastName: null };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName };
}

async function clerkRequest<T>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is not set.");
  }

  const response = await fetch(`https://api.clerk.com/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Clerk request failed (${response.status}): ${detail || "unknown"}`,
    );
  }

  return (await response.json()) as T;
}

export async function updatePlatformUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requirePlatformRole(ADMIN_PLATFORM_ROLES);
    const personId = requireString(formData, "personId");
    const name = requireString(formData, "name");
    const email = requireEmail(formData);
    const platformRole = readOptionalRole(formData);
    const status = requireStatus(formData);

    const prisma = getPrisma();
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      throw new Error("User not found.");
    }

    if (person.email !== email) {
      const existing = await prisma.person.findUnique({ where: { email } });
      if (existing && existing.id !== person.id) {
        throw new Error("Email is already in use.");
      }
    }

    const { firstName, lastName } = splitName(name);

    if (person.clerkUserId) {
      if (person.email !== email) {
        await clerkRequest<{ id?: string }>("email_addresses", {
          method: "POST",
          body: {
            user_id: person.clerkUserId,
            email_address: email,
            verified: true,
            primary: true,
          },
        });
      }

      await clerkRequest(`users/${person.clerkUserId}`, {
        method: "PATCH",
        body: {
          first_name: firstName ?? undefined,
          last_name: lastName ?? undefined,
          public_metadata: { platform_role: platformRole },
        },
      });

      if (person.status !== status) {
        const endpoint = status === "disabled" ? "lock" : "unlock";
        await clerkRequest(`users/${person.clerkUserId}/${endpoint}`, {
          method: "POST",
        });
      }
    }

    const updated = await prisma.person.update({
      where: { id: person.id },
      data: {
        name,
        email,
        platformRole,
        status,
      },
    });

    await logAudit({
      actorPersonId: actor.id,
      action: "update_platform_user",
      targetType: "person",
      targetId: updated.id,
      payload: {
        email,
        platformRole,
        status,
        clerkUserId: updated.clerkUserId ?? null,
      },
    });

    revalidatePath("/console/users");
    revalidatePath(`/console/users/${personId}`);

    return { ok: true, message: "User updated." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user.";
    return { ok: false, error: message };
  }
}

export async function forceCreateClerkUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requirePlatformRole(ADMIN_PLATFORM_ROLES);
    const personId = requireString(formData, "personId");
    const prisma = getPrisma();

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      throw new Error("User not found.");
    }
    if (person.clerkUserId) {
      throw new Error("Clerk user is already linked.");
    }

    const { firstName, lastName } = splitName(person.name ?? null);
    const body: Record<string, unknown> = {
      email_address: [person.email],
      public_metadata: { platform_role: person.platformRole },
      skip_password_requirement: true,
      skip_password_checks: true,
    };
    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;

    const clerkUser = await clerkRequest<{ id?: string }>("users", {
      method: "POST",
      body,
    });

    if (!clerkUser.id) {
      throw new Error("Clerk user creation returned no id.");
    }

    const updated = await prisma.person.update({
      where: { id: person.id },
      data: { clerkUserId: clerkUser.id },
    });

    await logAudit({
      actorPersonId: actor.id,
      action: "force_create_clerk_user",
      targetType: "person",
      targetId: updated.id,
      payload: {
        clerkUserId: clerkUser.id,
      },
    });

    revalidatePath("/console/users");
    revalidatePath(`/console/users/${personId}`);

    return { ok: true, message: "Clerk user created and linked." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Clerk user.";
    return { ok: false, error: message };
  }
}
