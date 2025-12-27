import crypto from "node:crypto";

import { computeAssistantPlan } from "./leasingAssistantEngine.mjs";
import { getApplicationDetail } from "./leasingDetailsRepo.mjs";
import { createInfoRequest } from "./leasingRequirementsRepo.mjs";
import { createNote } from "./leasingDecisioningRepo.mjs";
import { releaseReservation } from "./unitReservationsRepo.mjs";

function pickEffectiveWorkflowConfig(configs, { propertyId, jurisdictionCode }) {
  const candidates = configs.filter((c) => {
    if (propertyId && c.property_id === propertyId) return true;
    return c.property_id === null;
  });

  if (propertyId) {
    const propertyScoped = candidates
      .filter((c) => c.property_id === propertyId)
      .sort((left, right) => {
        const leftJurisdictionMatch =
          jurisdictionCode && left.jurisdiction_code === jurisdictionCode ? 1 : 0;
        const rightJurisdictionMatch =
          jurisdictionCode && right.jurisdiction_code === jurisdictionCode ? 1 : 0;
        if (leftJurisdictionMatch !== rightJurisdictionMatch) {
          return rightJurisdictionMatch - leftJurisdictionMatch;
        }
        if (left.version !== right.version) return right.version - left.version;
        const leftEffective = new Date(left.effective_at).getTime();
        const rightEffective = new Date(right.effective_at).getTime();
        if (leftEffective !== rightEffective) return rightEffective - leftEffective;
        return String(left.id).localeCompare(String(right.id));
      });

    if (propertyScoped.length > 0) return propertyScoped[0];
  }

  const orgDefault = candidates
    .filter((c) => c.property_id === null && c.jurisdiction_code === null)
    .sort((left, right) => {
      if (left.version !== right.version) return right.version - left.version;
      const leftEffective = new Date(left.effective_at).getTime();
      const rightEffective = new Date(right.effective_at).getTime();
      if (leftEffective !== rightEffective) return rightEffective - leftEffective;
      return String(left.id).localeCompare(String(right.id));
    });
  if (orgDefault.length > 0) return orgDefault[0];

  if (jurisdictionCode) {
    const jurisdictionDefault = candidates
      .filter((c) => c.property_id === null && c.jurisdiction_code === jurisdictionCode)
      .sort((left, right) => {
        if (left.version !== right.version) return right.version - left.version;
        const leftEffective = new Date(left.effective_at).getTime();
        const rightEffective = new Date(right.effective_at).getTime();
        if (leftEffective !== rightEffective) return rightEffective - leftEffective;
        return String(left.id).localeCompare(String(right.id));
      });
    if (jurisdictionDefault.length > 0) return jurisdictionDefault[0];
  }

  return null;
}

async function loadWorkflowConfig(db, { orgId, propertyId, jurisdictionCode }) {
  const now = new Date();
  const params = [orgId, now];
  let paramIndex = params.length;

  let propertyClause = "property_id IS NULL";
  if (propertyId) {
    params.push(propertyId);
    paramIndex += 1;
    propertyClause = `(property_id = $${paramIndex} OR property_id IS NULL)`;
  }

  let jurisdictionClause = "true";
  if (jurisdictionCode) {
    params.push(jurisdictionCode);
    paramIndex += 1;
    jurisdictionClause = `(jurisdiction_code = $${paramIndex} OR jurisdiction_code IS NULL)`;
  }

  const result = await db.query(
    `
      SELECT id, org_id, property_id, jurisdiction_code, version, config, effective_at, expired_at
      FROM "workflow_configs"
      WHERE org_id = $1
        AND effective_at <= $2
        AND (expired_at IS NULL OR expired_at > $2)
        AND ${propertyClause}
        AND ${jurisdictionClause}
      ORDER BY version DESC, effective_at DESC, id ASC
    `,
    params,
  );

  return pickEffectiveWorkflowConfig(result.rows, { propertyId, jurisdictionCode });
}

async function insertAuditEvent(db, input) {
  const actorId = input.actorId ?? input.orgId;
  const actorType = input.actorId ? "person" : "system";
  await db.query(
    `
      INSERT INTO "lease_audit_events" (
        id,
        org_id,
        application_id,
        event_type,
        actor_id,
        actor_type,
        target_type,
        target_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      crypto.randomUUID(),
      input.orgId,
      input.applicationId ?? null,
      input.eventType,
      actorId,
      actorType,
      input.targetType ?? "lease_application",
      input.targetId ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
    ],
  );
}

function buildTemplate(templateKey) {
  const templates = {
    MISSING_DOCS: {
      message: "Please upload the missing documents listed on your application.",
    },
    SCREENING_TIMEOUT: {
      message: "Your screening step timed out. Please review and resubmit the screening details.",
    },
    DOC_EXPIRED: {
      message: "One or more documents have expired. Please upload a new copy.",
    },
    REMINDER: {
      message: "Reminder: please complete your pending application tasks.",
    },
  };

  return templates[templateKey] ?? { message: "Please review and respond with the requested information." };
}

export async function getAssistantSummary(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const detail = await getApplicationDetail(pool, { orgId, applicationId });
  if (!detail.ok) return detail;

  const workflowConfig = await loadWorkflowConfig(pool, {
    orgId,
    propertyId: detail.application?.propertyId,
    jurisdictionCode: null,
  });

  const assistant = computeAssistantPlan({
    snapshot: detail,
    workflowConfig: workflowConfig?.config ?? {},
    now: new Date(),
  });

  return { ok: true, assistant };
}

export async function executeAssistantAction(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const actionKey = String(input.actionKey || "").trim();
  const reasonCode = String(input.reasonCode || "").trim();
  if (!orgId || !applicationId || !actionKey || !reasonCode) {
    throw new Error("Missing orgId, applicationId, actionKey, or reasonCode.");
  }

  const actorId = input.actorId ? String(input.actorId) : null;
  const actorType = input.actorType ? String(input.actorType) : null;
  const reason = input.reason ? String(input.reason) : null;
  const templateKey = input.templateKey ? String(input.templateKey) : null;

  const detail = await getApplicationDetail(pool, { orgId, applicationId });
  if (!detail.ok) return detail;

  let result = { ok: true, actionKey };

  if (actionKey === "SEND_REMINDER") {
    const noteResult = await createNote(pool, {
      orgId,
      applicationId,
      authorId: actorId ?? orgId,
      actorType: actorType ?? "staff",
      visibility: "INTERNAL_STAFF_ONLY",
      content: reason ? `Reminder sent. ${reason}` : "Reminder sent to applicant.",
    });
    if (!noteResult.ok) return noteResult;
  } else if (actionKey === "REQUEST_MISSING_DOCS") {
    const missing = (detail.requirements ?? []).filter((req) =>
      ["PENDING", "IN_PROGRESS", "SUBMITTED", "REJECTED", "EXPIRED"].includes(req.status),
    );
    const template = buildTemplate("MISSING_DOCS");
    const infoResult = await createInfoRequest(pool, {
      orgId,
      applicationId,
      message: template.message,
      itemsToRequest: missing.map((req) => ({
        name: req.name,
        description: req.description ?? undefined,
        requirementType: req.requirementType,
        documentType: req.metadata?.documentType,
        partyId: req.partyId ?? undefined,
        isRequired: true,
      })),
    });
    if (!infoResult.ok) return infoResult;
  } else if (actionKey === "CREATE_INFO_REQUEST_TEMPLATE") {
    const template = buildTemplate(templateKey || "REMINDER");
    const infoResult = await createInfoRequest(pool, {
      orgId,
      applicationId,
      message: template.message,
      itemsToRequest: [],
    });
    if (!infoResult.ok) return infoResult;
  } else if (actionKey === "RELEASE_EXPIRED_RESERVATION") {
    const expired = (detail.reservations ?? []).filter((reservation) => {
      if (reservation.status !== "ACTIVE") return false;
      if (!reservation.expiresAt) return false;
      return new Date(reservation.expiresAt) <= new Date();
    });
    for (const reservation of expired) {
      const releaseResult = await releaseReservation(pool, {
        orgId,
        reservationId: reservation.id,
        releaseReasonCode: reasonCode,
        releasedById: actorId ?? undefined,
        releasedReason: reason ?? undefined,
      });
      if (!releaseResult.ok) return releaseResult;
    }
  } else if (actionKey === "MARK_STALE") {
    await insertAuditEvent(pool, {
      orgId,
      applicationId,
      eventType: "ASSISTANT_MARKED_STALE",
      actorId,
      metadata: { reasonCode, reason },
    });
  } else {
    return { ok: false, errorCode: "UNSUPPORTED_ACTION" };
  }

  await insertAuditEvent(pool, {
    orgId,
    applicationId,
    eventType: "ASSISTANT_ACTION_EXECUTED",
    actorId,
    metadata: {
      actionKey,
      reasonCode,
      reason,
      templateKey,
    },
  });

  return result;
}
