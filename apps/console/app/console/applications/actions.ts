"use server";

import { getPrisma } from "db";
import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "../_server/people";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  orgId?: string;
};

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "org";
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

function requireApplicationId(formData: FormData) {
  const applicationId = formData.get("applicationId");
  if (typeof applicationId !== "string" || !applicationId) {
    throw new Error("Missing application id.");
  }
  return applicationId;
}

export async function approveAndProvision(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let pendingInfo: { applicationId: string; inviteId: string } | null = null;
  try {
    const actor = await requirePlatformAdmin();
    const applicationId = requireApplicationId(formData);
    const prisma = getPrisma();

    const txnResult = await prisma.$transaction(async (tx) => {
      const application = await tx.onboardingApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error("Application not found.");
      }

      if (application.provisionedOrgId) {
        throw new Error("Application already provisioned.");
      }

      if (!["submitted", "provisioning_failed"].includes(application.status)) {
        throw new Error("Application is not ready for approval.");
      }

      if (application.status === "provisioning_failed") {
        const existingOrg = await tx.organization.findFirst({
          where: { onboardingApplicationId: applicationId },
        });
        const existingInvite = existingOrg
          ? await tx.invite.findFirst({
              where: { orgId: existingOrg.id },
              orderBy: { createdAt: "desc" },
            })
          : null;

        if (!existingOrg || !existingInvite) {
          throw new Error("No prior provisioning attempt found.");
        }

        await tx.invite.update({
          where: { id: existingInvite.id },
          data: { status: "pending_send", clerkInvitationId: null },
        });

        await tx.onboardingApplication.update({
          where: { id: applicationId },
          data: { status: "provisioning" },
        });

        await tx.auditLog.create({
          data: {
            actorPersonId: actor.id,
            action: "retry_invite_send",
            targetType: "organization",
            targetId: existingOrg.id,
            diffJsonb: {
              applicationId,
              inviteId: existingInvite.id,
              status: "pending_send",
            },
          },
        });

        const result = {
          orgId: existingOrg.id,
          inviteId: existingInvite.id,
          contactEmail: application.contactEmail,
        };
        return result;
      }

      const org = await tx.organization.create({
        data: {
          name: application.orgName,
          slug: slugify(application.orgName),
          status: "active",
          onboardingApplicationId: application.id,
        },
      });

      const invite = await tx.invite.create({
        data: {
          orgId: org.id,
          email: application.contactEmail,
          role: "org_admin",
          status: "pending_send",
        },
      });

      await tx.onboardingApplication.update({
        where: { id: applicationId },
        data: { status: "provisioning" },
      });

      await tx.auditLog.create({
        data: {
          actorPersonId: actor.id,
          action: "approve_provision",
          targetType: "organization",
          targetId: org.id,
          diffJsonb: {
            applicationId,
            inviteId: invite.id,
            status: "provisioning",
          },
        },
      });

      return { orgId: org.id, inviteId: invite.id, contactEmail: application.contactEmail };
    });

    pendingInfo = { applicationId, inviteId: txnResult.inviteId };

    const clerkInvitationId = await createClerkInvitation(
      txnResult.contactEmail,
      txnResult.orgId,
    );

    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: txnResult.inviteId },
        data: { status: "sent", clerkInvitationId },
      });

      await tx.onboardingApplication.update({
        where: { id: applicationId },
        data: {
          status: "provisioned",
          provisionedOrgId: txnResult.orgId,
          provisionedAt: new Date(),
        },
      });
    });

    revalidatePath("/console/applications");
    revalidatePath(`/console/applications/${applicationId}`);

    return {
      ok: true,
      message: "Organization provisioned and invite sent.",
      orgId: txnResult.orgId,
    };
  } catch (error) {
    const prisma = getPrisma();
    const message =
      error instanceof Error ? error.message : "Failed to provision organization.";

    if (pendingInfo) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.invite.update({
            where: { id: pendingInfo.inviteId },
            data: { status: "send_failed" },
          });
          await tx.onboardingApplication.update({
            where: { id: pendingInfo.applicationId },
            data: { status: "provisioning_failed" },
          });
        });
      } catch {
        // Best-effort failure handling only.
      }
    }

    return { ok: false, error: message };
  }
}

export async function retrySendInvite(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return approveAndProvision(_prevState, formData);
}

export async function rejectApplication(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requirePlatformAdmin();
    const applicationId = requireApplicationId(formData);
    const prisma = getPrisma();

    const application = await prisma.onboardingApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.provisionedOrgId) {
      throw new Error("Application already provisioned.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.onboardingApplication.update({
        where: { id: applicationId },
        data: { status: "rejected" },
      });

      await tx.auditLog.create({
        data: {
          actorPersonId: actor.id,
          action: "reject_application",
          targetType: "onboarding_application",
          targetId: applicationId,
          diffJsonb: { status: "rejected" },
        },
      });
    });

    revalidatePath("/console/applications");
    revalidatePath(`/console/applications/${applicationId}`);

    return { ok: true, message: "Application rejected." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject application.";
    return { ok: false, error: message };
  }
}
