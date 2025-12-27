import crypto from "node:crypto";

import { leasingAssistantDefaults } from "./leasingAssistantEngine.mjs";
import { createInfoRequest } from "./leasingRequirementsRepo.mjs";
import { createNote } from "./leasingDecisioningRepo.mjs";
import { releaseReservationsForApplication } from "./unitReservationsRepo.mjs";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizePolicy(config) {
  const automation = config?.automation ?? {};
  const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    ...leasingAssistantDefaults.DEFAULT_POLICY,
    ...automation,
    enabled: typeof automation.enabled === "boolean" ? automation.enabled : leasingAssistantDefaults.DEFAULT_POLICY.enabled,
    reminderCadenceDays: toNumber(automation.reminderCadenceDays, leasingAssistantDefaults.DEFAULT_POLICY.reminderCadenceDays),
    maxReminders: toNumber(automation.maxReminders, leasingAssistantDefaults.DEFAULT_POLICY.maxReminders),
    staleAfterDays: toNumber(automation.staleAfterDays, leasingAssistantDefaults.DEFAULT_POLICY.staleAfterDays),
    submittedTtlDays: toNumber(automation.submittedTtlDays, leasingAssistantDefaults.DEFAULT_POLICY.submittedTtlDays),
    screeningTimeoutDays: toNumber(automation.screeningTimeoutDays, leasingAssistantDefaults.DEFAULT_POLICY.screeningTimeoutDays),
    docExpiryDays: toNumber(automation.docExpiryDays, leasingAssistantDefaults.DEFAULT_POLICY.docExpiryDays),
    slaHoursByPriority: {
      ...leasingAssistantDefaults.DEFAULT_POLICY.slaHoursByPriority,
      ...(automation.slaHoursByPriority ?? {}),
    },
  };
}

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

async function ensureJob(db, { orgId, jobKey }) {
  const insert = await db.query(
    `
      INSERT INTO "leasing_jobs" (id, org_id, job_key, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (org_id, job_key) DO NOTHING
      RETURNING id
    `,
    [crypto.randomUUID(), orgId ?? null, jobKey],
  );

  if (insert.rows.length > 0) return insert.rows[0].id;

  const existing = await db.query(
    `SELECT id FROM "leasing_jobs" WHERE org_id IS NOT DISTINCT FROM $1 AND job_key = $2 LIMIT 1`,
    [orgId ?? null, jobKey],
  );
  return existing.rows[0]?.id ?? null;
}

async function startJobRun(db, { orgId, jobKey, idempotencyKey, metadata }) {
  const jobId = await ensureJob(db, { orgId, jobKey });
  const insert = await db.query(
    `
      INSERT INTO "leasing_job_runs" (
        id, job_id, org_id, job_key, idempotency_key, status, started_at, metadata
      )
      VALUES ($1, $2, $3, $4, $5, 'STARTED', NOW(), $6::jsonb)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    `,
    [crypto.randomUUID(), jobId, orgId ?? null, jobKey, idempotencyKey, metadata ?? null],
  );

  return insert.rows[0]?.id ?? null;
}

async function finishJobRun(db, { runId, status, error }) {
  if (!runId) return;
  await db.query(
    `
      UPDATE "leasing_job_runs"
      SET status = $2,
          finished_at = NOW(),
          error = $3
      WHERE id = $1
    `,
    [runId, status, error ?? null],
  );
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

async function runScreeningTimeouts(pool, now) {
  const candidates = await pool.query(
    `
      SELECT r.id, r.application_id, r.party_id, r.name, r.metadata, r.due_date,
             a.org_id, a.property_id
      FROM "requirement_items" r
      JOIN "lease_applications" a ON a.id = r.application_id
      WHERE r.requirement_type = 'SCREENING'
        AND r.status NOT IN ('APPROVED', 'WAIVED', 'EXPIRED')
        AND r.due_date IS NOT NULL
        AND r.due_date <= $1
        AND a.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO')
    `,
    [now],
  );

  let processed = 0;
  for (const row of candidates.rows) {
    const config = await loadWorkflowConfig(pool, {
      orgId: row.org_id,
      propertyId: row.property_id,
      jurisdictionCode: null,
    });
    const policy = normalizePolicy(config?.config ?? {});
    if (!policy.enabled) continue;

    const runId = await startJobRun(pool, {
      orgId: row.org_id,
      jobKey: "SCREENING_TIMEOUT",
      idempotencyKey: `SCREENING_TIMEOUT:${row.id}`,
      metadata: { requirementId: row.id },
    });
    if (!runId) continue;

    try {
      await pool.query(
        `
          UPDATE "requirement_items"
          SET status = 'EXPIRED',
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = $3
          WHERE id = $1
        `,
        [row.id, JSON.stringify({ timeout: true }), now],
      );

      await createInfoRequest(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        message: "Screening timed out. Please resubmit screening details.",
        itemsToRequest: [
          {
            name: row.name,
            requirementType: "SCREENING",
            partyId: row.party_id ?? undefined,
          },
        ],
      });

      await insertAuditEvent(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        eventType: "SCREENING_TIMEOUT",
        targetType: "requirement_item",
        targetId: row.id,
        metadata: { requirementId: row.id },
      });

      await finishJobRun(pool, { runId, status: "SUCCESS" });
      processed += 1;
    } catch (e) {
      await finishJobRun(pool, { runId, status: "FAILED", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return processed;
}

async function runDocExpiry(pool, now) {
  const candidates = await pool.query(
    `
      SELECT r.id, r.application_id, r.party_id, r.name, r.metadata, r.due_date,
             a.org_id, a.property_id
      FROM "requirement_items" r
      JOIN "lease_applications" a ON a.id = r.application_id
      WHERE r.requirement_type = 'DOCUMENT'
        AND r.status NOT IN ('APPROVED', 'WAIVED', 'EXPIRED')
        AND r.due_date IS NOT NULL
        AND r.due_date <= $1
        AND a.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO')
    `,
    [now],
  );

  let processed = 0;
  for (const row of candidates.rows) {
    const config = await loadWorkflowConfig(pool, {
      orgId: row.org_id,
      propertyId: row.property_id,
      jurisdictionCode: null,
    });
    const policy = normalizePolicy(config?.config ?? {});
    if (!policy.enabled) continue;

    const runId = await startJobRun(pool, {
      orgId: row.org_id,
      jobKey: "DOC_EXPIRY",
      idempotencyKey: `DOC_EXPIRY:${row.id}`,
      metadata: { requirementId: row.id },
    });
    if (!runId) continue;

    try {
      await pool.query(
        `
          UPDATE "requirement_items"
          SET status = 'EXPIRED',
              updated_at = $2
          WHERE id = $1
        `,
        [row.id, now],
      );

      await createInfoRequest(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        message: "Document expired. Please upload a new copy.",
        itemsToRequest: [
          {
            name: row.name,
            requirementType: "DOCUMENT",
            documentType: row.metadata?.documentType,
            partyId: row.party_id ?? undefined,
          },
        ],
      });

      await insertAuditEvent(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        eventType: "DOCUMENT_EXPIRED",
        targetType: "requirement_item",
        targetId: row.id,
        metadata: { requirementId: row.id },
      });

      await finishJobRun(pool, { runId, status: "SUCCESS" });
      processed += 1;
    } catch (e) {
      await finishJobRun(pool, { runId, status: "FAILED", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return processed;
}

async function runCoApplicantReminders(pool, now) {
  const parties = await pool.query(
    `
      SELECT p.id, p.application_id, p.reminder_count, p.last_reminder_at,
             a.org_id, a.property_id
      FROM "application_parties" p
      JOIN "lease_applications" a ON a.id = p.application_id
      WHERE p.role = 'CO_APPLICANT'
        AND p.status IN ('INVITED', 'IN_PROGRESS')
        AND a.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO')
        AND p.abandoned_at IS NULL
    `,
  );

  let remindersSent = 0;
  for (const row of parties.rows) {
    const config = await loadWorkflowConfig(pool, {
      orgId: row.org_id,
      propertyId: row.property_id,
      jurisdictionCode: null,
    });
    const policy = normalizePolicy(config?.config ?? {});
    if (!policy.enabled) continue;

    const cadenceDays = Number(policy.reminderCadenceDays) || leasingAssistantDefaults.DEFAULT_POLICY.reminderCadenceDays;
    const maxReminders = Number(policy.maxReminders) || leasingAssistantDefaults.DEFAULT_POLICY.maxReminders;

    if (row.reminder_count >= maxReminders) {
      const runId = await startJobRun(pool, {
        orgId: row.org_id,
        jobKey: "CO_APPLICANT_REMINDER_MAXED",
        idempotencyKey: `CO_APPLICANT_REMINDER_MAXED:${row.id}`,
        metadata: { partyId: row.id },
      });
      if (!runId) continue;

      await insertAuditEvent(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        eventType: "CO_APPLICANT_REMINDER_MAXED",
        targetType: "application_party",
        targetId: row.id,
        metadata: { reminderCount: row.reminder_count },
      });
      await finishJobRun(pool, { runId, status: "SUCCESS" });
      continue;
    }

    const lastReminder = row.last_reminder_at ? new Date(row.last_reminder_at) : null;
    const dueAt = lastReminder ? addDays(lastReminder, cadenceDays) : now;
    if (dueAt > now) continue;

    const nextCount = Number(row.reminder_count) + 1;
    const runId = await startJobRun(pool, {
      orgId: row.org_id,
      jobKey: "CO_APPLICANT_REMINDER",
      idempotencyKey: `CO_APPLICANT_REMINDER:${row.id}:${nextCount}`,
      metadata: { partyId: row.id },
    });
    if (!runId) continue;

    try {
      await pool.query(
        `
          UPDATE "application_parties"
          SET reminder_count = reminder_count + 1,
              last_reminder_at = $2,
              updated_at = $2
          WHERE id = $1
        `,
        [row.id, now],
      );

      await createNote(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        authorId: row.org_id,
        actorType: "staff",
        visibility: "INTERNAL_STAFF_ONLY",
        content: "Co-applicant reminder sent.",
      });

      await insertAuditEvent(pool, {
        orgId: row.org_id,
        applicationId: row.application_id,
        eventType: "CO_APPLICANT_REMINDER_SENT",
        targetType: "application_party",
        targetId: row.id,
        metadata: { reminderCount: nextCount },
      });

      await finishJobRun(pool, { runId, status: "SUCCESS" });
      remindersSent += 1;
    } catch (e) {
      await finishJobRun(pool, { runId, status: "FAILED", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return remindersSent;
}

async function runSubmittedTtl(pool, now) {
  const candidates = await pool.query(
    `
      SELECT id, org_id, property_id
      FROM "lease_applications"
      WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO')
        AND expires_at IS NOT NULL
        AND expires_at <= $1
        AND deleted_at IS NULL
    `,
    [now],
  );

  let expired = 0;
  for (const row of candidates.rows) {
    const config = await loadWorkflowConfig(pool, {
      orgId: row.org_id,
      propertyId: row.property_id,
      jurisdictionCode: null,
    });
    const policy = normalizePolicy(config?.config ?? {});
    if (!policy.enabled) continue;

    const runId = await startJobRun(pool, {
      orgId: row.org_id ?? SYSTEM_ORG_ID,
      jobKey: "SUBMITTED_TTL",
      idempotencyKey: `SUBMITTED_TTL:${row.id}`,
      metadata: { applicationId: row.id },
    });
    if (!runId) continue;

    try {
      await pool.query(
        `
          UPDATE "lease_applications"
          SET status = 'CLOSED',
              closed_at = $2,
              closed_reason = 'EXPIRED',
              updated_at = $2
          WHERE id = $1
        `,
        [row.id, now],
      );

      await releaseReservationsForApplication(pool, {
        orgId: row.org_id,
        applicationId: row.id,
        releaseReasonCode: "EXPIRED",
        releaseReason: "Application expired",
        actorId: null,
        now,
      });

      await insertAuditEvent(pool, {
        orgId: row.org_id,
        applicationId: row.id,
        eventType: "APPLICATION_EXPIRED",
        metadata: { automation: true },
      });

      await finishJobRun(pool, { runId, status: "SUCCESS" });
      expired += 1;
    } catch (e) {
      await finishJobRun(pool, { runId, status: "FAILED", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { ok: true, expired };
}

export async function runLeasingJobsOnce(pool, logger) {
  const now = new Date();
  const summary = {
    screeningTimeouts: 0,
    docExpiry: 0,
    coApplicantReminders: 0,
    submittedExpired: 0,
  };

  try {
    summary.screeningTimeouts = await runScreeningTimeouts(pool, now);
    summary.docExpiry = await runDocExpiry(pool, now);
    summary.coApplicantReminders = await runCoApplicantReminders(pool, now);
    const submitted = await runSubmittedTtl(pool, now);
    summary.submittedExpired = submitted?.expired ?? 0;
  } catch (e) {
    logger?.error?.({ err: e }, "Leasing assistant jobs failed");
  }

  return summary;
}

export function startLeasingJobsRunner({ pool, logger }) {
  if (!pool) return null;
  const enabled = String(process.env.LEASING_JOBS_ENABLED || "").trim() === "1";
  if (!enabled) return null;

  let running = false;
  const intervalMs = Number(process.env.LEASING_JOBS_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  const runTick = async () => {
    if (running) return;
    running = true;
    try {
      await runLeasingJobsOnce(pool, logger);
    } finally {
      running = false;
    }
  };

  void runTick();
  const handle = setInterval(runTick, intervalMs);

  return () => clearInterval(handle);
}
