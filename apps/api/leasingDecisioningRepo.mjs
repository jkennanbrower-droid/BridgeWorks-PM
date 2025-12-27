import crypto from "node:crypto";

import { upgradeScreeningLockToSoftHold } from "./unitReservationsRepo.mjs";

const SLA_WARNING_HOURS = 24;
const SLA_BREACH_HOURS = 48;

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pickColumn(columns, candidates) {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate;
  }
  return null;
}

let queueSchemaCache = null;

async function resolveQueueSchema(pool) {
  if (queueSchemaCache) return queueSchemaCache;

  const tableResult = await pool.query(
    `SELECT to_regclass('properties') AS properties, to_regclass('units') AS units`,
  );
  const hasProperties = !!tableResult.rows[0]?.properties;
  const hasUnits = !!tableResult.rows[0]?.units;

  const propertyColumns = new Set();
  const unitColumns = new Set();

  if (hasProperties) {
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'properties'`,
    );
    for (const row of columns.rows) propertyColumns.add(row.column_name);
  }

  if (hasUnits) {
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'units'`,
    );
    for (const row of columns.rows) unitColumns.add(row.column_name);
  }

  const schema = {
    hasProperties,
    hasUnits,
    propertyColumns,
    unitColumns,
    propertyIdColumn: hasProperties && propertyColumns.has("id") ? "id" : null,
    unitIdColumn: hasUnits && unitColumns.has("id") ? "id" : null,
    propertyNameColumn: pickColumn(propertyColumns, [
      "name",
      "property_name",
      "display_name",
      "label",
      "title",
    ]),
    propertySiteCodeColumn: pickColumn(propertyColumns, [
      "site_code",
      "siteCode",
      "code",
      "property_code",
      "slug",
    ]),
    unitCodeColumn: pickColumn(unitColumns, ["unit_code", "unitCode", "code", "name", "label"]),
    unitTypeColumn: pickColumn(unitColumns, ["unit_type", "unitType", "type", "unit_type_code"]),
    unitPropertyIdColumn: pickColumn(unitColumns, ["property_id", "propertyId"]),
  };

  queueSchemaCache = schema;
  return schema;
}

function buildGateStatus(blocked) {
  return blocked ? "BLOCKED" : "PASS";
}

function computeNextAction({ status, gates, blockingReasonCodes }) {
  if (status === "NEEDS_INFO") {
    return { key: "WAITING_ON_APPLICANT", label: "Waiting on applicant", blockingReasonCodes };
  }
  if (["DECISIONED", "CONVERTED", "CLOSED"].includes(status)) {
    return { key: "NO_ACTION", label: "No action needed", blockingReasonCodes };
  }
  if (gates.parties === "BLOCKED") {
    return { key: "COMPLETE_PARTIES", label: "Complete parties", blockingReasonCodes };
  }
  if (gates.docs === "BLOCKED") {
    return { key: "COLLECT_DOCUMENTS", label: "Collect documents", blockingReasonCodes };
  }
  if (gates.screening === "BLOCKED") {
    return { key: "COMPLETE_SCREENING", label: "Complete screening", blockingReasonCodes };
  }
  if (gates.payment === "BLOCKED") {
    return { key: "COLLECT_PAYMENT", label: "Resolve payment", blockingReasonCodes };
  }
  if (gates.unitAvailability === "BLOCKED") {
    return { key: "VERIFY_UNIT", label: "Verify unit availability", blockingReasonCodes };
  }
  if (gates.reservation === "BLOCKED") {
    return { key: "RESERVE_UNIT", label: "Reserve unit", blockingReasonCodes };
  }
  return { key: "REVIEW", label: "Review application", blockingReasonCodes };
}

async function withTx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw e;
  } finally {
    client.release();
  }
}

function mapDecision(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    version: row.version,
    criteriaVersion: row.criteria_version ?? null,
    outcome: row.outcome,
    decisionDate: toIso(row.decision_date),
    decidedById: row.decided_by_id,
    reasonCodes: row.reason_codes ?? null,
    incomeCalculationMethod: row.income_calculation_method ?? null,
    incomeVerifiedMonthlyCents: row.income_verified_monthly_cents ?? null,
    incomeVerifiedAnnualCents: row.income_verified_annual_cents ?? null,
    incomePassed: row.income_passed ?? null,
    incomeNotes: row.income_notes ?? null,
    criminalReviewStatus: row.criminal_review_status ?? null,
    criminalRecordSummary: row.criminal_record_summary ?? null,
    criminalReviewNotes: row.criminal_review_notes ?? null,
    criminalReviewedAt: toIso(row.criminal_reviewed_at),
    criminalReviewedById: row.criminal_reviewed_by_id ?? null,
    conditions: row.conditions ?? null,
    notes: row.notes ?? null,
    riskAssessmentId: row.risk_assessment_id ?? null,
    overrideRequestId: row.override_request_id ?? null,
    isOverride: row.is_override,
    previousDecisionId: row.previous_decision_id ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapScore(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    scoreType: row.score_type,
    scoreValue: row.score_value,
    maxScore: row.max_score ?? null,
    factors: row.factors ?? null,
    calculatedAt: toIso(row.calculated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapNote(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    authorId: row.author_id,
    visibility: row.visibility,
    content: row.content,
    isPinned: row.is_pinned,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIso(row.deleted_at),
  };
}

function mapOverride(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id,
    requestedById: row.requested_by_id,
    requestType: row.request_type,
    status: row.status,
    originalOutcome: row.original_outcome ?? null,
    requestedOutcome: row.requested_outcome ?? null,
    originalPriority: row.original_priority ?? null,
    requestedPriority: row.requested_priority ?? null,
    justification: row.justification,
    reviewedById: row.reviewed_by_id ?? null,
    reviewedAt: toIso(row.reviewed_at),
    reviewNotes: row.review_notes ?? null,
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
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
      input.targetType ?? "override_request",
      input.targetId ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
    ],
  );
}

function buildVisibilityFilter(viewerType) {
  if (viewerType === "staff") {
    return [
      "INTERNAL_STAFF_ONLY",
      "SHARED_WITH_APPLICANT",
      "SHARED_WITH_PARTIES",
      "PUBLIC",
    ];
  }
  if (viewerType === "applicant") {
    return ["SHARED_WITH_APPLICANT", "SHARED_WITH_PARTIES", "PUBLIC"];
  }
  if (viewerType === "party") {
    return ["SHARED_WITH_PARTIES", "PUBLIC"];
  }
  return ["PUBLIC"];
}

function canSetVisibility(actorType, visibility) {
  const allowed = buildVisibilityFilter(actorType);
  return allowed.includes(visibility);
}

async function createSoftHold(db, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const unitId = String(input.unitId || "").trim();
  if (!orgId || !applicationId || !unitId) {
    throw new Error("Missing orgId, applicationId, or unitId.");
  }

  const now = input.now ?? new Date();

  const conflict = await db.query(
    `
      SELECT application_id, kind
      FROM "unit_reservations"
      WHERE unit_id = $1
        AND org_id = $2
        AND status = 'ACTIVE'
        AND kind IN ('SOFT_HOLD', 'HARD_HOLD')
        AND application_id <> $3
      LIMIT 1
    `,
    [unitId, orgId, applicationId],
  );

  if (conflict.rows.length > 0) {
    return {
      ok: false,
      errorCode: "HOLD_CONFLICT",
      holderApplicationId: conflict.rows[0].application_id,
      holderKind: conflict.rows[0].kind,
    };
  }

  const insert = await db.query(
    `
      INSERT INTO "unit_reservations" (
        id,
        org_id,
        application_id,
        unit_id,
        kind,
        status,
        expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'SOFT_HOLD', 'ACTIVE', $5, $6, $6)
      RETURNING *
    `,
    [
      crypto.randomUUID(),
      orgId,
      applicationId,
      unitId,
      input.expiresAt ?? null,
      now,
    ],
  );

  return { ok: true, reservation: insert.rows[0] };
}

export async function makeDecision(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const decidedById = String(input.decidedById || "").trim();
  const outcome = String(input.outcome || "").trim();
  if (!orgId || !applicationId || !decidedById || !outcome) {
    throw new Error("Missing orgId, applicationId, decidedById, or outcome.");
  }

  return await withTx(pool, async (db) => {
    const appResult = await db.query(
      `
        SELECT id, org_id, status, unit_id, expires_at
        FROM "lease_applications"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [applicationId, orgId],
    );

    if (appResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const application = appResult.rows[0];

    if (![
      "SUBMITTED",
      "IN_REVIEW",
      "NEEDS_INFO",
    ].includes(application.status)) {
      return { ok: false, errorCode: "INVALID_STATUS", status: application.status };
    }

    const versionResult = await db.query(
      `SELECT COALESCE(MAX(version), 0)::int AS current FROM "decision_records" WHERE application_id = $1`,
      [applicationId],
    );
    const version = (versionResult.rows[0]?.current ?? 0) + 1;

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const incomeData = isPlainObject(input.incomeData) ? input.incomeData : {};
    const criminalData = isPlainObject(input.criminalData) ? input.criminalData : {};
    const reasonCodes =
      Array.isArray(input.structuredReasonCodes) || isPlainObject(input.structuredReasonCodes)
        ? input.structuredReasonCodes
        : null;

    const insertDecision = await db.query(
      `
        INSERT INTO "decision_records" (
          id,
          application_id,
          version,
          criteria_version,
          outcome,
          decision_date,
          decided_by_id,
          reason_codes,
          income_calculation_method,
          income_verified_monthly_cents,
          income_verified_annual_cents,
          income_passed,
          income_notes,
          criminal_review_status,
          criminal_record_summary,
          criminal_review_notes,
          criminal_reviewed_at,
          criminal_reviewed_by_id,
          conditions,
          notes,
          risk_assessment_id,
          override_request_id,
          is_override,
          previous_decision_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4,
          $5::"decision_outcome", $6, $7,
          $8::jsonb, $9::"income_calculation_method",
          $10, $11, $12, $13,
          $14, $15::jsonb, $16, $17, $18,
          $19::jsonb, $20, $21, $22, $23,
          $24, $25, $25
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        applicationId,
        version,
        input.criteriaVersion ?? null,
        outcome,
        now,
        decidedById,
        reasonCodes ? JSON.stringify(reasonCodes) : null,
        incomeData.method ?? null,
        incomeData.verifiedMonthlyCents ?? null,
        incomeData.verifiedAnnualCents ?? null,
        typeof incomeData.passed === "boolean" ? incomeData.passed : null,
        incomeData.notes ?? null,
        criminalData.status ?? null,
        criminalData.summary ? JSON.stringify(criminalData.summary) : null,
        criminalData.notes ?? null,
        criminalData.reviewedAt ?? null,
        criminalData.reviewedById ?? null,
        input.optionalConditions ? JSON.stringify(input.optionalConditions) : null,
        input.notes ?? null,
        input.riskAssessmentId ?? null,
        input.overrideRequestId ?? null,
        Boolean(input.overrideRequestId),
        input.previousDecisionId ?? null,
        now,
      ],
    );

    let reservation = null;
    if (["APPROVED", "APPROVED_WITH_CONDITIONS"].includes(outcome)) {
      if (application.unit_id) {
        const existingReservation = await db.query(
          `
            SELECT id, kind
            FROM "unit_reservations"
            WHERE application_id = $1
              AND org_id = $2
              AND status = 'ACTIVE'
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [applicationId, orgId],
        );

        if (existingReservation.rows.length > 0) {
          const current = existingReservation.rows[0];
          if (current.kind === "SCREENING_LOCK") {
            const upgraded = await upgradeScreeningLockToSoftHold(db, {
              orgId,
              reservationId: current.id,
              actorId: decidedById,
            });
            if (!upgraded.ok) return upgraded;
            reservation = upgraded.reservation;
          } else {
            reservation = existingReservation.rows[0];
          }
        } else {
          const created = await createSoftHold(db, {
            orgId,
            applicationId,
            unitId: application.unit_id,
            expiresAt: application.expires_at ?? null,
            now,
          });
          if (!created.ok) return created;
          reservation = created.reservation;
        }
      }
    }

    await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'DECISIONED',
            decisioned_at = $2,
            updated_at = $2
        WHERE id = $1
      `,
      [applicationId, now],
    );

    return {
      ok: true,
      decision: mapDecision(insertDecision.rows[0]),
      reservation,
    };
  });
}

export async function createApplicationScore(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const appResult = await db.query(
      `SELECT id FROM "lease_applications" WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [applicationId, orgId],
    );
    if (appResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const scoreType = input.scoreType ?? "DECISION_STUB";
    const scoreValue = Number.isFinite(Number(input.scoreValue))
      ? Math.floor(Number(input.scoreValue))
      : 0;
    const maxScore = Number.isFinite(Number(input.maxScore))
      ? Math.floor(Number(input.maxScore))
      : null;
    const factors = isPlainObject(input.factors) ? input.factors : null;

    const inserted = await db.query(
      `
        INSERT INTO "application_scores" (
          id, application_id, score_type, score_value, max_score, factors,
          calculated_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7, $7)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        applicationId,
        scoreType,
        scoreValue,
        maxScore,
        factors ? JSON.stringify(factors) : null,
        now,
      ],
    );

    return { ok: true, score: mapScore(inserted.rows[0]) };
  });
}

export async function requestPriorityOverride(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const requestedById = String(input.requestedById || "").trim();
  const requestedPriority = String(input.requestedPriority || "").trim();
  if (!orgId || !applicationId || !requestedById || !requestedPriority) {
    throw new Error("Missing orgId, applicationId, requestedById, or requestedPriority.");
  }

  return await withTx(pool, async (db) => {
    const appResult = await db.query(
      `SELECT id, priority FROM "lease_applications" WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [applicationId, orgId],
    );
    if (appResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const originalPriority = appResult.rows[0].priority;
    if (originalPriority === requestedPriority) {
      return { ok: false, errorCode: "NO_CHANGE" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const insert = await db.query(
      `
        INSERT INTO "override_requests" (
          id, org_id, application_id, requested_by_id, request_type, status,
          original_priority, requested_priority, justification,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'PRIORITY', 'PENDING', $5::"priority_level", $6::"priority_level", $7, $8, $8)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        orgId,
        applicationId,
        requestedById,
        originalPriority,
        requestedPriority,
        input.justification ?? "",
        now,
      ],
    );

    await insertAuditEvent(db, {
      orgId,
      applicationId,
      eventType: "OVERRIDE_REQUESTED",
      targetId: insert.rows[0].id,
      metadata: {
        requestType: "PRIORITY",
        originalPriority,
        requestedPriority,
      },
      actorId: requestedById,
      createdAt: now,
    });

    return { ok: true, overrideRequest: mapOverride(insert.rows[0]) };
  });
}

export async function reviewPriorityOverride(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const overrideRequestId = String(input.overrideRequestId || "").trim();
  const reviewerId = String(input.reviewerId || "").trim();
  const status = String(input.status || "").trim();
  if (!orgId || !overrideRequestId || !reviewerId || !status) {
    throw new Error("Missing orgId, overrideRequestId, reviewerId, or status.");
  }

  return await withTx(pool, async (db) => {
    const requestResult = await db.query(
      `
        SELECT *
        FROM "override_requests"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [overrideRequestId, orgId],
    );

    if (requestResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const request = requestResult.rows[0];
    if (request.request_type !== "PRIORITY") {
      return { ok: false, errorCode: "INVALID_TYPE", requestType: request.request_type };
    }
    if (request.status !== "PENDING") {
      return { ok: false, errorCode: "INVALID_STATUS", status: request.status };
    }

    if (!["APPROVED", "DENIED"].includes(status)) {
      return { ok: false, errorCode: "INVALID_STATUS_VALUE" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const updated = await db.query(
      `
        UPDATE "override_requests"
        SET status = $1::"override_request_status",
            reviewed_by_id = $2,
            reviewed_at = $3,
            review_notes = $4,
            updated_at = $3
        WHERE id = $5
        RETURNING *
      `,
      [status, reviewerId, now, input.reviewNotes ?? null, overrideRequestId],
    );

    if (status === "APPROVED" && request.requested_priority) {
      await db.query(
        `
          UPDATE "lease_applications"
          SET priority = $2::"priority_level",
              updated_at = $3
          WHERE id = $1
        `,
        [request.application_id, request.requested_priority, now],
      );
    }

    await insertAuditEvent(db, {
      orgId,
      applicationId: request.application_id,
      eventType: status === "APPROVED" ? "OVERRIDE_APPROVED" : "OVERRIDE_DENIED",
      targetId: overrideRequestId,
      metadata: {
        requestType: "PRIORITY",
        originalPriority: request.original_priority,
        requestedPriority: request.requested_priority,
        status,
      },
      actorId: reviewerId,
      createdAt: now,
    });

    return { ok: true, overrideRequest: mapOverride(updated.rows[0]) };
  });
}

export async function listApplicationQueue(pool, input) {
  const orgId = String(input.orgId || "").trim();
  if (!orgId) throw new Error("Missing orgId.");

  const schema = await resolveQueueSchema(pool);
  const nowResult = await pool.query("SELECT NOW() AS now");
  const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const statuses = Array.isArray(input.statuses) && input.statuses.length > 0
    ? input.statuses
    : ["SUBMITTED", "IN_REVIEW", "NEEDS_INFO", "DECISIONED", "CLOSED"];
  const propertyIds = Array.isArray(input.propertyIds)
    ? input.propertyIds
    : input.propertyId
      ? [String(input.propertyId)]
      : [];
  const unitTypes = Array.isArray(input.unitTypes) ? input.unitTypes : [];
  const priorities = Array.isArray(input.priorities) ? input.priorities : [];
  const sort = input.sort ? String(input.sort) : "priority_sla";
  const q = String(input.q || "").trim();
  const flags = isPlainObject(input.flags) ? input.flags : {};

  if (unitTypes.length > 0 && !schema.unitTypeColumn) {
    return { ok: false, errorCode: "UNIT_TYPE_UNAVAILABLE" };
  }

  const propertyJoin =
    schema.hasProperties && schema.propertyIdColumn
      ? `LEFT JOIN "properties" prop ON prop.${schema.propertyIdColumn} = a.property_id`
      : "";
  const unitJoin =
    schema.hasUnits && schema.unitIdColumn
      ? `LEFT JOIN "units" u ON u.${schema.unitIdColumn} = a.unit_id`
      : "";

  const propertyNameExpr =
    schema.propertyNameColumn && schema.propertyIdColumn
      ? `prop.${schema.propertyNameColumn}`
      : "NULL";
  const propertySiteExpr =
    schema.propertySiteCodeColumn && schema.propertyIdColumn
      ? `prop.${schema.propertySiteCodeColumn}`
      : "NULL";
  const unitCodeExpr =
    schema.unitCodeColumn && schema.unitIdColumn ? `u.${schema.unitCodeColumn}` : "NULL";
  const unitTypeExpr =
    schema.unitTypeColumn && schema.unitIdColumn ? `u.${schema.unitTypeColumn}` : "NULL";

  const params = [orgId];
  const where = [`a.org_id = $1`, `a.deleted_at IS NULL`];

  if (statuses.length > 0) {
    params.push(statuses);
    where.push(`a.status = ANY($${params.length}::"lease_application_status"[])`);
  }

  if (propertyIds.length > 0) {
    params.push(propertyIds);
    where.push(`a.property_id = ANY($${params.length}::uuid[])`);
  }

  if (priorities.length > 0) {
    params.push(priorities);
    where.push(`a.priority = ANY($${params.length}::"priority_level"[])`);
  }

  if (unitTypes.length > 0 && unitTypeExpr !== "NULL") {
    params.push(unitTypes);
    where.push(`${unitTypeExpr}::text = ANY($${params.length}::text[])`);
  }

  if (q) {
    params.push(`%${q}%`);
    const searchParts = [
      `a.id::text ILIKE $${params.length}`,
      `primary_party.email ILIKE $${params.length}`,
      `primary_party.phone ILIKE $${params.length}`,
      `(COALESCE(primary_party.first_name, '') || ' ' || COALESCE(primary_party.last_name, '')) ILIKE $${params.length}`,
    ];
    if (unitCodeExpr !== "NULL") {
      searchParts.push(`${unitCodeExpr}::text ILIKE $${params.length}`);
    }
    where.push(`(${searchParts.join(" OR ")})`);
  }

  const staleAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (flags.stale) {
    params.push(staleAt);
    where.push(`a.updated_at < $${params.length}`);
  }

  if (flags.missingDocs) {
    where.push(`req_stats.docs_missing > 0`);
  }
  if (flags.paymentIssue) {
    where.push(`(a.application_fee_status = 'FAILED' OR pay_stats.payment_failed > 0)`);
  }
  if (flags.hasReservation) {
    where.push(`res_stats.active_reservations > 0`);
  }
  if (flags.highRisk) {
    where.push(`(risk.risk_level IN ('HIGH', 'SEVERE') OR risk.risk_score >= 80)`);
  }
  if (flags.duplicate) {
    where.push(`dup.duplicate_count > 1`);
  }

  const baseFrom = `
    FROM "lease_applications" a
    LEFT JOIN LATERAL (
      SELECT id, first_name, last_name, email, phone
      FROM "application_parties"
      WHERE application_id = a.id AND role = 'PRIMARY'
      ORDER BY created_at ASC
      LIMIT 1
    ) primary_party ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('COMPLETE', 'LOCKED')) AS parties_incomplete,
        COUNT(*) AS parties_total
      FROM "application_parties"
      WHERE application_id = a.id
    ) party_stats ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE requirement_type = 'DOCUMENT'
            AND is_required = true
            AND status NOT IN ('APPROVED', 'WAIVED')
        ) AS docs_missing,
        COUNT(*) FILTER (
          WHERE requirement_type = 'SCREENING'
            AND is_required = true
            AND status NOT IN ('APPROVED', 'WAIVED')
        ) AS screening_missing
      FROM "requirement_items"
      WHERE application_id = a.id
    ) req_stats ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE status IN ('FAILED', 'CANCELED')) AS payment_failed,
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED') AS payment_succeeded
      FROM "payment_intents"
      WHERE application_id = a.id
    ) pay_stats ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_reservations
      FROM "unit_reservations"
      WHERE application_id = a.id
    ) res_stats ON true
    LEFT JOIN LATERAL (
      SELECT risk_level, risk_score
      FROM "risk_assessments"
      WHERE application_id = a.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) risk ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS duplicate_count
      FROM "lease_applications"
      WHERE org_id = a.org_id
        AND duplicate_check_hash IS NOT NULL
        AND duplicate_check_hash = a.duplicate_check_hash
        AND deleted_at IS NULL
    ) dup ON true
    ${propertyJoin}
    ${unitJoin}
  `;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const orderBy = (() => {
    switch (sort) {
      case "activity_asc":
        return `a.updated_at ASC NULLS LAST, a.created_at ASC`;
      case "submitted_desc":
        return `a.submitted_at DESC NULLS LAST, a.created_at DESC`;
      case "submitted_asc":
        return `a.submitted_at ASC NULLS LAST, a.created_at ASC`;
      case "sla_asc":
        return `a.submitted_at + INTERVAL '${SLA_BREACH_HOURS} hours' ASC NULLS LAST, a.submitted_at ASC NULLS LAST`;
      case "risk_desc":
        return `risk.risk_score DESC NULLS LAST, a.submitted_at ASC NULLS LAST`;
      case "priority_sla":
        return `
          CASE a.priority
            WHEN 'EMERGENCY' THEN 3
            WHEN 'PRIORITY' THEN 2
            ELSE 1
          END DESC,
          a.submitted_at ASC NULLS LAST,
          a.created_at ASC
        `;
      case "activity_desc":
      default:
        return `a.updated_at DESC NULLS LAST, a.created_at DESC`;
    }
  })();

  const itemsQuery = `
    SELECT
      a.id AS application_id,
      a.status,
      a.priority,
      a.created_at,
      a.updated_at,
      a.submitted_at,
      a.expires_at,
      a.property_id,
      a.unit_id,
      a.application_fee_status,
      a.unit_was_available_at_submit,
      ${propertyNameExpr} AS property_name,
      ${propertySiteExpr} AS property_site_code,
      ${unitCodeExpr} AS unit_code,
      ${unitTypeExpr} AS unit_type,
      primary_party.id AS primary_party_id,
      primary_party.first_name AS primary_first_name,
      primary_party.last_name AS primary_last_name,
      primary_party.email AS primary_email,
      primary_party.phone AS primary_phone,
      party_stats.parties_incomplete,
      party_stats.parties_total,
      req_stats.docs_missing,
      req_stats.screening_missing,
      pay_stats.payment_failed,
      pay_stats.payment_succeeded,
      res_stats.active_reservations,
      risk.risk_level,
      risk.risk_score,
      dup.duplicate_count
    ${baseFrom}
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const itemsResult = await pool.query(itemsQuery, [...params, pageSize, offset]);

  const facetQuery = `
    WITH base AS (
      SELECT
        a.status,
        a.priority,
        ${unitTypeExpr} AS unit_type,
        a.property_id,
        ${propertyNameExpr} AS property_name,
        ${propertySiteExpr} AS property_site_code
      ${baseFrom}
      ${whereSql}
    )
    SELECT
      status,
      priority,
      unit_type,
      property_id,
      property_name,
      property_site_code,
      COUNT(*) AS count
    FROM base
    GROUP BY GROUPING SETS (
      (status),
      (priority),
      (unit_type),
      (property_id, property_name, property_site_code)
    )
  `;

  const facetResult = await pool.query(facetQuery, params);
  const totalResult = await pool.query(
    `
      SELECT COUNT(*) AS total
      ${baseFrom}
      ${whereSql}
    `,
    params,
  );

  const facets = {
    byStatus: {},
    byUnitType: {},
    byProperty: [],
    byPriority: {},
  };

  for (const row of facetResult.rows) {
    if (row.status) {
      facets.byStatus[row.status] = Number(row.count);
      continue;
    }
    if (row.priority) {
      facets.byPriority[row.priority] = Number(row.count);
      continue;
    }
    if (row.unit_type) {
      facets.byUnitType[row.unit_type] = Number(row.count);
      continue;
    }
    if (row.property_id) {
      facets.byProperty.push({
        propertyId: row.property_id,
        name: row.property_name ?? null,
        count: Number(row.count),
      });
    }
  }

  const items = itemsResult.rows.map((row) => {
    const partiesBlocked =
      Number(row.parties_total) > 0 && Number(row.parties_incomplete) > 0;
    const docsBlocked = Number(row.docs_missing) > 0;
    const screeningBlocked = Number(row.screening_missing) > 0;
    const paymentBlocked =
      row.application_fee_status !== "SUCCEEDED" &&
      Number(row.payment_succeeded) === 0;
    const reservationBlocked =
      row.unit_id && Number(row.active_reservations) === 0;
    const unitAvailabilityBlocked =
      row.unit_id && row.unit_was_available_at_submit === false;
    const gates = {
      parties: buildGateStatus(partiesBlocked),
      docs: buildGateStatus(docsBlocked),
      payment: buildGateStatus(paymentBlocked),
      screening: buildGateStatus(screeningBlocked),
      reservation: buildGateStatus(reservationBlocked),
      unitAvailability: buildGateStatus(unitAvailabilityBlocked),
    };

    const blockingReasonCodes = [];
    if (docsBlocked) blockingReasonCodes.push("MISSING_DOCS");
    if (row.application_fee_status === "FAILED" || Number(row.payment_failed) > 0) {
      blockingReasonCodes.push("PAYMENT_ISSUE");
    }
    if (Number(row.duplicate_count) > 1) blockingReasonCodes.push("DUPLICATE");
    if (row.updated_at && new Date(row.updated_at) < staleAt) {
      blockingReasonCodes.push("STALE");
    }
    if (
      row.risk_level &&
      ["HIGH", "SEVERE"].includes(String(row.risk_level).toUpperCase())
    ) {
      blockingReasonCodes.push("HIGH_RISK");
    }

    const submittedAt = row.submitted_at ? new Date(row.submitted_at) : null;
    const deadlineAt = submittedAt
      ? new Date(submittedAt.getTime() + SLA_BREACH_HOURS * 60 * 60 * 1000)
      : null;
    const warningAt = submittedAt
      ? new Date(submittedAt.getTime() + SLA_WARNING_HOURS * 60 * 60 * 1000)
      : null;
    const sla = submittedAt
      ? {
          deadlineAt: toIso(deadlineAt),
          breached: deadlineAt ? now > deadlineAt : false,
          warning: warningAt ? now > warningAt : false,
        }
      : null;

    return {
      applicationId: row.application_id,
      status: row.status,
      priority: row.priority,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      submittedAt: toIso(row.submitted_at),
      expiresAt: toIso(row.expires_at),
      property: {
        id: row.property_id,
        name: row.property_name ?? null,
        siteCode: row.property_site_code ?? null,
      },
      unit: row.unit_id
        ? {
            id: row.unit_id,
            unitCode: row.unit_code ?? null,
            type: row.unit_type ?? null,
          }
        : null,
      primaryApplicant: {
        partyId: row.primary_party_id ?? null,
        name: [row.primary_first_name, row.primary_last_name].filter(Boolean).join(" ") || null,
        email: row.primary_email ?? null,
        phone: row.primary_phone ?? null,
      },
      gates,
      nextAction: computeNextAction({
        status: row.status,
        gates,
        blockingReasonCodes,
      }),
      risk: row.risk_level || row.risk_score != null
        ? { riskLevel: row.risk_level ?? null, riskScore: row.risk_score ?? null }
        : null,
      sla,
      assignee: null,
    };
  });

  return {
    ok: true,
    page,
    pageSize,
    total: Number(totalResult.rows[0]?.total ?? 0),
    facets,
    items,
  };
}

export async function listLeaseApplicationFilterOptions(pool, input) {
  const orgId = String(input.orgId || "").trim();
  if (!orgId) throw new Error("Missing orgId.");

  const schema = await resolveQueueSchema(pool);
  const propertyJoin =
    schema.hasProperties && schema.propertyIdColumn
      ? `LEFT JOIN "properties" prop ON prop.${schema.propertyIdColumn} = a.property_id`
      : "";
  const propertyNameExpr =
    schema.propertyNameColumn && schema.propertyIdColumn
      ? `prop.${schema.propertyNameColumn}`
      : "NULL";
  const propertySiteExpr =
    schema.propertySiteCodeColumn && schema.propertyIdColumn
      ? `prop.${schema.propertySiteCodeColumn}`
      : "NULL";

  const propertiesResult = await pool.query(
    `
      SELECT DISTINCT
        a.property_id AS property_id,
        ${propertyNameExpr} AS property_name,
        ${propertySiteExpr} AS property_site_code
      FROM "lease_applications" a
      ${propertyJoin}
      WHERE a.org_id = $1
      ORDER BY property_name NULLS LAST, property_id ASC
    `,
    [orgId],
  );

  let unitTypes = [];
  if (schema.unitTypeColumn && schema.unitIdColumn) {
    const unitTypesResult = await pool.query(
      `
        SELECT DISTINCT u.${schema.unitTypeColumn} AS unit_type
        FROM "lease_applications" a
        JOIN "units" u ON u.${schema.unitIdColumn} = a.unit_id
        WHERE a.org_id = $1
          AND u.${schema.unitTypeColumn} IS NOT NULL
        ORDER BY u.${schema.unitTypeColumn} ASC
      `,
      [orgId],
    );
    unitTypes = unitTypesResult.rows.map((row) => row.unit_type).filter(Boolean);
  }

  let units = [];
  const propertyId = String(input.propertyId || "").trim();
  if (propertyId && schema.unitIdColumn && schema.unitCodeColumn && schema.unitPropertyIdColumn) {
    const unitsResult = await pool.query(
      `
        SELECT
          u.${schema.unitIdColumn} AS unit_id,
          u.${schema.unitCodeColumn} AS unit_code,
          ${schema.unitTypeColumn ? `u.${schema.unitTypeColumn}` : "NULL"} AS unit_type
        FROM "units" u
        WHERE u.${schema.unitPropertyIdColumn} = $1
        ORDER BY u.${schema.unitCodeColumn} ASC NULLS LAST
      `,
      [propertyId],
    );
    units = unitsResult.rows.map((row) => ({
      id: row.unit_id,
      unitCode: row.unit_code ?? null,
      type: row.unit_type ?? null,
    }));
  }

  return {
    ok: true,
    properties: propertiesResult.rows.map((row) => ({
      propertyId: row.property_id,
      name: row.property_name ?? null,
      siteCode: row.property_site_code ?? null,
    })),
    unitTypes,
    units,
  };
}

export async function createNote(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const authorId = String(input.authorId || "").trim();
  const visibility = String(input.visibility || "").trim() || "INTERNAL_STAFF_ONLY";
  if (!orgId || !applicationId || !authorId) {
    throw new Error("Missing orgId, applicationId, or authorId.");
  }

  const actorType = input.actorType ?? "staff";
  if (!canSetVisibility(actorType, visibility)) {
    return { ok: false, errorCode: "VISIBILITY_NOT_ALLOWED" };
  }

  return await withTx(pool, async (db) => {
    const appResult = await db.query(
      `SELECT id FROM "lease_applications" WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [applicationId, orgId],
    );
    if (appResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const insert = await db.query(
      `
        INSERT INTO "notes" (
          id, application_id, author_id, visibility, content, is_pinned,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4::"note_visibility", $5, $6, $7, $7)
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        applicationId,
        authorId,
        visibility,
        input.content ?? "",
        Boolean(input.isPinned),
        now,
      ],
    );

    return { ok: true, note: mapNote(insert.rows[0]) };
  });
}

export async function listNotes(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const viewerType = input.viewerType ?? "staff";
  const allowed = buildVisibilityFilter(viewerType);

  const result = await pool.query(
    `
      SELECT n.*
      FROM "notes" n
      JOIN "lease_applications" a ON a.id = n.application_id
      WHERE a.org_id = $1
        AND n.application_id = $2
        AND n.visibility = ANY($3::"note_visibility"[])
        AND n.deleted_at IS NULL
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `,
    [orgId, applicationId, allowed],
  );

  return { ok: true, notes: result.rows.map(mapNote) };
}

export async function updateNote(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const noteId = String(input.noteId || "").trim();
  const actorId = String(input.actorId || "").trim();
  const actorType = input.actorType ?? "staff";
  if (!orgId || !noteId || !actorId) throw new Error("Missing orgId, noteId, or actorId.");

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT n.*
        FROM "notes" n
        JOIN "lease_applications" a ON a.id = n.application_id
        WHERE n.id = $1 AND a.org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [noteId, orgId],
    );

    if (existing.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const note = existing.rows[0];
    if (actorType !== "staff" && note.author_id !== actorId) {
      return { ok: false, errorCode: "FORBIDDEN" };
    }

    const nextVisibility = input.visibility ?? note.visibility;
    if (!canSetVisibility(actorType, nextVisibility)) {
      return { ok: false, errorCode: "VISIBILITY_NOT_ALLOWED" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const updated = await db.query(
      `
        UPDATE "notes"
        SET content = $1,
            visibility = $2::"note_visibility",
            is_pinned = $3,
            updated_at = $4
        WHERE id = $5
        RETURNING *
      `,
      [
        input.content ?? note.content,
        nextVisibility,
        typeof input.isPinned === "boolean" ? input.isPinned : note.is_pinned,
        now,
        noteId,
      ],
    );

    return { ok: true, note: mapNote(updated.rows[0]) };
  });
}

export async function deleteNote(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const noteId = String(input.noteId || "").trim();
  const actorId = String(input.actorId || "").trim();
  const actorType = input.actorType ?? "staff";
  if (!orgId || !noteId || !actorId) throw new Error("Missing orgId, noteId, or actorId.");

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT n.*
        FROM "notes" n
        JOIN "lease_applications" a ON a.id = n.application_id
        WHERE n.id = $1 AND a.org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [noteId, orgId],
    );

    if (existing.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const note = existing.rows[0];
    if (actorType !== "staff" && note.author_id !== actorId) {
      return { ok: false, errorCode: "FORBIDDEN" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const updated = await db.query(
      `
        UPDATE "notes"
        SET deleted_at = $1,
            updated_at = $1
        WHERE id = $2
        RETURNING *
      `,
      [now, noteId],
    );

    return { ok: true, note: mapNote(updated.rows[0]) };
  });
}
