"use server";

import { revalidatePath } from "next/cache";

import { getPrisma } from "db";

import { logAudit } from "../_server/audit";
import { ADMIN_PLATFORM_ROLES, requirePlatformRole } from "../_server/rbac";
import { HEALTH_STATUSES, ORG_STATUSES } from "./constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  orgId?: string;
};

type OrgStatus = (typeof ORG_STATUSES)[number];
type HealthStatus = (typeof HEALTH_STATUSES)[number];

const ORG_STATUS_SET = new Set<string>(ORG_STATUSES);
const HEALTH_STATUS_SET = new Set<string>(HEALTH_STATUSES);

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

function readOptionalString(formData: FormData, field: string) {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function requireEmail(formData: FormData, field: string) {
  const email = requireString(formData, field).toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Enter a valid email.");
  }
  return email;
}

function readOptionalEmail(formData: FormData, field: string) {
  const value = readOptionalString(formData, field);
  if (!value) return null;
  if (!value.includes("@")) {
    throw new Error("Enter a valid email.");
  }
  return value.toLowerCase();
}

function requireOrgStatus(formData: FormData): OrgStatus {
  const status = requireString(formData, "status");
  if (!ORG_STATUS_SET.has(status)) {
    throw new Error("Select a valid status.");
  }
  return status as OrgStatus;
}

function readOptionalHealthStatus(formData: FormData): HealthStatus | null {
  const value = readOptionalString(formData, "healthStatus");
  if (!value) return null;
  if (!HEALTH_STATUS_SET.has(value)) {
    throw new Error("Select a valid health status.");
  }
  return value as HealthStatus;
}

function readBoolean(formData: FormData, field: string) {
  const value = formData.get(field);
  if (typeof value !== "string") return false;
  return value === "on" || value === "true";
}

function readRequestedFields(formData: FormData) {
  const raw = formData.getAll("requestField");
  return raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "org";
}

async function ensureUniqueSlug(base: string) {
  const prisma = getPrisma();
  let slug = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.organization.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

async function createClerkInvitation(email: string, orgId: string) {
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
      public_metadata: { org_id: orgId, role: "org_admin" },
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

export async function createManualOrg(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let inviteId: string | null = null;
  let orgId: string | null = null;
  let actorId: string | null = null;
  try {
    const actor = await requirePlatformRole(ADMIN_PLATFORM_ROLES);
    actorId = actor.id;
    const name = requireString(formData, "name");
    const slugInput = readOptionalString(formData, "slug");
    const status = requireOrgStatus(formData);
    const primaryContactEmail = readOptionalEmail(formData, "primaryContactEmail");
    const healthStatus = readOptionalHealthStatus(formData);
    const requestFields = readRequestedFields(formData);
    const notes = readOptionalString(formData, "notes");
    const sendAdminInvite = readBoolean(formData, "sendAdminInvite");
    const adminEmail = sendAdminInvite
      ? requireEmail(formData, "adminEmail")
      : null;

    const baseSlug = slugify(slugInput ?? name);
    const slug = await ensureUniqueSlug(baseSlug);
    const prisma = getPrisma();

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        status,
        primaryContactEmail: primaryContactEmail ?? undefined,
        healthStatus: healthStatus ?? undefined,
      },
    });
    orgId = org.id;

    await logAudit({
      actorPersonId: actor.id,
      action: "create_org_manual",
      targetType: "organization",
      targetId: org.id,
      payload: {
        name,
        slug,
        status,
        primaryContactEmail,
        healthStatus,
        requestFields,
        notes,
        adminInviteRequested: Boolean(sendAdminInvite),
      },
    });

    if (sendAdminInvite && adminEmail) {
      const invite = await prisma.invite.create({
        data: {
          orgId: org.id,
          email: adminEmail,
          role: "org_admin",
          status: "pending_send",
        },
      });
      inviteId = invite.id;

      try {
        const clerkInvitationId = await createClerkInvitation(adminEmail, org.id);
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            status: "sent",
            clerkInvitationId,
            sentAt: new Date(),
            lastError: null,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send invite.";
        await prisma.invite.update({
          where: { id: invite.id },
          data: { status: "send_failed", lastError: message },
        });
      }
    }

    revalidatePath("/console/orgs");
    revalidatePath(`/console/orgs/${org.id}`);

    return {
      ok: true,
      message: sendAdminInvite
        ? "Organization created and invite sent."
        : "Organization created.",
      orgId: org.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create organization.";

    if (inviteId) {
      try {
        const prisma = getPrisma();
        await prisma.invite.update({
          where: { id: inviteId },
          data: { status: "send_failed", lastError: message },
        });
      } catch {
        // Best-effort failure handling only.
      }
    }

    if (orgId && actorId) {
      await logAudit({
        actorPersonId: actorId,
        action: "create_org_manual_failed",
        targetType: "organization",
        targetId: orgId,
        payload: { error: message },
      }).catch(() => null);
    }

    return { ok: false, error: message };
  }
}
