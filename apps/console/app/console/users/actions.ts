"use server";

import { revalidatePath } from "next/cache";

import { getPrisma } from "db";

import { logAudit } from "../_server/audit";
import { ADMIN_PLATFORM_ROLES, requirePlatformRole } from "../_server/rbac";
import { PERSON_STATUSES, PLATFORM_ROLES } from "./constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  personId?: string;
};

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

function requireRole(formData: FormData) {
  const role = requireString(formData, "platformRole");
  if (!PLATFORM_ROLE_SET.has(role)) {
    throw new Error("Select a valid platform role.");
  }
  return role;
}

function requireStatus(formData: FormData) {
  const status = requireString(formData, "status");
  if (!PERSON_STATUS_SET.has(status)) {
    throw new Error("Select a valid status.");
  }
  return status;
}

function readSkipInvite(formData: FormData) {
  const value = formData.get("skipInvite");
  if (typeof value !== "string") {
    return false;
  }
  return value === "on" || value === "true";
}

async function createClerkInvitation(email: string, platformRole: string) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is not set.");
  }

  const response = await fetch("https://api.clerk.com/v1/invitations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      public_metadata: { platform_role: platformRole },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Clerk invitation failed (${response.status}): ${detail || "unknown"}`,
    );
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Clerk invitation response missing id.");
  }

  return payload.id;
}

export async function createPlatformUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requirePlatformRole(ADMIN_PLATFORM_ROLES);
    const name = requireString(formData, "name");
    const email = requireEmail(formData);
    const platformRole = requireRole(formData);
    const status = requireStatus(formData);
    const skipInvite = readSkipInvite(formData);
    const prisma = getPrisma();

    const existing = await prisma.person.findUnique({ where: { email } });
    if (existing) {
      throw new Error("User already exists with this email.");
    }

    const clerkInvitationId = skipInvite
      ? null
      : await createClerkInvitation(email, platformRole);

    const person = await prisma.person.create({
      data: {
        email,
        name,
        platformRole,
        status,
      },
    });

    await logAudit({
      actorPersonId: actor.id,
      action: skipInvite ? "create_platform_user" : "invite_platform_user",
      targetType: "person",
      targetId: person.id,
      payload: {
        email,
        platformRole,
        status,
        clerkInvitationId,
        skipInvite,
      },
    });

    revalidatePath("/console/users");

    return {
      ok: true,
      message: skipInvite
        ? "User record created without an invite."
        : "Invite sent and user record created.",
      personId: person.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user.";
    return { ok: false, error: message };
  }
}
