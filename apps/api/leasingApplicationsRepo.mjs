import crypto from "node:crypto";

import { createScreeningLock, releaseReservationsForApplication } from "./unitReservationsRepo.mjs";
import {
  createRefundRequestWithDecision,
  evaluateRefundForPayment,
} from "./leasingRefundsRepo.mjs";

const DRAFT_LOOKBACK_DAYS = 7;
const SESSION_TTL_DAYS = 30;

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits || null;
}

function computeDuplicateHash(email, unitId, propertyId) {
  const normalizedEmail = normalizeEmail(email);
  const raw = `${normalizedEmail}|${unitId ?? ""}|${propertyId ?? ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function issueToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampInt(value, { min = 0, max = 365 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (!isPlainObject(patch)) return base;
  const result = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
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

async function loadEffectiveWorkflowConfig(pool, { orgId, propertyId, jurisdictionCode, asOfDate }) {
  const params = [orgId, asOfDate];
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

  const result = await pool.query(
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

async function loadActiveConsentTemplate(pool, { orgId, asOfDate }) {
  const result = await pool.query(
    `
      SELECT id, org_id, version, name, content, effective_at, expired_at
      FROM "screening_consent_templates"
      WHERE is_active = true
        AND effective_at <= $2
        AND (expired_at IS NULL OR expired_at > $2)
        AND (org_id = $1 OR org_id IS NULL)
      ORDER BY (org_id IS NULL) ASC, version DESC, effective_at DESC, id ASC
      LIMIT 1
    `,
    [orgId, asOfDate],
  );
  return result.rows[0] ?? null;
}

function resolveSubmitConfig(config) {
  const submit = config?.submit ?? {};
  const ttlDays = clampInt(submit.ttlDays, { min: 1, max: 365 }) ?? 30;
  const jointRequiredCoApplicants =
    clampInt(submit.jointRequiredCoApplicants, { min: 0, max: 6 }) ?? 1;

  return { ttlDays, jointRequiredCoApplicants };
}

function resolveUnitIntakeConfig(config) {
  const intake = config?.unitIntake ?? {};
  const mode = intake.mode ?? "OPEN";
  const capSubmits = clampInt(intake.capSubmits, { min: 1, max: 50 }) ?? 1;
  return { mode, capSubmits };
}

function evaluateRequiredParties({ applicationType, parties, config }) {
  const primaryParties = parties.filter((p) => p.role === "PRIMARY");
  const primaryIncompleteIds = primaryParties
    .filter((p) => p.status !== "COMPLETE")
    .map((p) => p.id);

  if (primaryParties.length === 0) {
    return {
      ok: false,
      errorCode: "PRIMARY_REQUIRED",
      details: { requiredPrimary: 1, completedPrimary: 0 },
    };
  }

  if (primaryIncompleteIds.length > 0) {
    return {
      ok: false,
      errorCode: "PRIMARY_INCOMPLETE",
      details: { incompletePrimaryIds: primaryIncompleteIds },
    };
  }

  if (applicationType === "JOINT") {
    const required = config.jointRequiredCoApplicants;
    const completedCoApplicants = parties.filter(
      (p) => p.role === "CO_APPLICANT" && p.status === "COMPLETE",
    );
    if (completedCoApplicants.length < required) {
      return {
        ok: false,
        errorCode: "CO_APPLICANT_REQUIRED",
        details: {
          requiredCoApplicants: required,
          completedCoApplicants: completedCoApplicants.length,
        },
      };
    }
  }

  return { ok: true };
}

function mapApplication(row) {
  return {
    id: row.application_id,
    orgId: row.org_id,
    propertyId: row.property_id,
    unitId: row.unit_id ?? null,
    status: row.status,
    applicationType: row.application_type,
    duplicateCheckHash: row.duplicate_check_hash ?? null,
    createdAt: toIso(row.application_created_at),
    updatedAt: toIso(row.application_updated_at),
  };
}

function mapParty(row) {
  if (!row.party_id) return null;
  return {
    id: row.party_id,
    applicationId: row.application_id,
    role: row.party_role,
    status: row.party_status,
    email: row.party_email,
    firstName: row.party_first_name ?? null,
    lastName: row.party_last_name ?? null,
    phone: row.party_phone ?? null,
    inviteToken: row.party_invite_token ?? null,
    createdAt: toIso(row.party_created_at),
    updatedAt: toIso(row.party_updated_at),
  };
}

function mapDraftSession(row) {
  if (!row.session_id) return null;
  return {
    id: row.session_id,
    applicationId: row.application_id,
    partyId: row.session_party_id ?? null,
    sessionToken: row.session_token,
    formData: row.form_data ?? {},
    progressMap: row.progress_map ?? null,
    currentStep: row.current_step ?? null,
    expiresAt: toIso(row.expires_at),
    lastActivityAt: toIso(row.last_activity_at),
    lastSavedAt: toIso(row.last_saved_at),
    createdAt: toIso(row.session_created_at),
    updatedAt: toIso(row.session_updated_at),
  };
}

async function findExistingDraft(pool, { orgId, duplicateHash, lookbackDays }) {
  const result = await pool.query(
    `
      SELECT
        a.id AS application_id,
        a.org_id,
        a.property_id,
        a.unit_id,
        a.status,
        a.application_type,
        a.duplicate_check_hash,
        a.created_at AS application_created_at,
        a.updated_at AS application_updated_at,
        p.id AS party_id,
        p.role AS party_role,
        p.status AS party_status,
        p.email AS party_email,
        p.first_name AS party_first_name,
        p.last_name AS party_last_name,
        p.phone AS party_phone,
        p.invite_token AS party_invite_token,
        p.created_at AS party_created_at,
        p.updated_at AS party_updated_at,
        s.id AS session_id,
        s.party_id AS session_party_id,
        s.session_token,
        s.form_data,
        s.progress_map,
        s.current_step,
        s.expires_at,
        s.last_activity_at,
        s.last_saved_at,
        s.created_at AS session_created_at,
        s.updated_at AS session_updated_at
      FROM "lease_applications" a
      JOIN "application_parties" p
        ON p.application_id = a.id AND p.role = 'PRIMARY'
      LEFT JOIN LATERAL (
        SELECT *
        FROM "application_draft_sessions" s
        WHERE s.application_id = a.id
          AND (s.party_id = p.id OR s.party_id IS NULL)
        ORDER BY s.last_activity_at DESC NULLS LAST, s.created_at DESC
        LIMIT 1
      ) s ON true
      WHERE a.org_id = $1
        AND a.status = 'DRAFT'
        AND a.duplicate_check_hash = $2
        AND a.created_at >= NOW() - ($3::int * INTERVAL '1 day')
        AND a.deleted_at IS NULL
      ORDER BY a.created_at DESC
      LIMIT 1
    `,
    [orgId, duplicateHash, lookbackDays],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    application: mapApplication(row),
    party: mapParty(row),
    draftSession: mapDraftSession(row),
  };
}

export async function startApplication(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const propertyId = String(input.propertyId || "").trim();
  if (!orgId || !propertyId) throw new Error("Missing orgId or propertyId.");

  const email = normalizeEmail(input.primary?.email);
  if (!email) throw new Error("Missing primary email.");

  const duplicateCheckHash = computeDuplicateHash(email, input.unitId, propertyId);
  const lookbackDays = input.lookbackDays ?? DRAFT_LOOKBACK_DAYS;

  const existing = await findExistingDraft(pool, {
    orgId,
    duplicateHash: duplicateCheckHash,
    lookbackDays,
  });
  if (existing) {
    return { deduped: true, ...existing };
  }

  return await withTx(pool, async (db) => {
    const now = new Date();
    const expiresAt = addDays(now, SESSION_TTL_DAYS);
    const sessionToken = issueToken();

    const appResult = await db.query(
      `
        INSERT INTO "lease_applications" (
          org_id,
          property_id,
          unit_id,
          application_type,
          status,
          duplicate_check_hash,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $6)
        RETURNING id, org_id, property_id, unit_id, status, application_type, duplicate_check_hash, created_at, updated_at
      `,
      [orgId, propertyId, input.unitId ?? null, input.applicationType ?? "INDIVIDUAL", duplicateCheckHash, now],
    );

    const application = appResult.rows[0];

    const partyResult = await db.query(
      `
        INSERT INTO "application_parties" (
          application_id,
          role,
          status,
          email,
          first_name,
          last_name,
          phone,
          created_at,
          updated_at
        )
        VALUES ($1, 'PRIMARY', 'IN_PROGRESS', $2, $3, $4, $5, $6, $6)
        RETURNING id, application_id, role, status, email, first_name, last_name, phone, invite_token, created_at, updated_at
      `,
      [
        application.id,
        email,
        input.primary?.firstName?.trim() || null,
        input.primary?.lastName?.trim() || null,
        normalizePhone(input.primary?.phone),
        now,
      ],
    );

    const party = partyResult.rows[0];

    const sessionResult = await db.query(
      `
        INSERT INTO "application_draft_sessions" (
          application_id,
          party_id,
          session_token,
          form_data,
          progress_map,
          current_step,
          expires_at,
          last_activity_at,
          last_saved_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8, $8)
        RETURNING id, application_id, party_id, session_token, form_data, progress_map,
                  current_step, expires_at, last_activity_at, last_saved_at, created_at, updated_at
      `,
      [
        application.id,
        party.id,
        sessionToken,
        input.formData ?? {},
        input.progressMap ?? null,
        input.currentStep ?? null,
        expiresAt,
        now,
      ],
    );

    return {
      deduped: false,
      application: mapApplication({
        application_id: application.id,
        org_id: application.org_id,
        property_id: application.property_id,
        unit_id: application.unit_id,
        status: application.status,
        application_type: application.application_type,
        duplicate_check_hash: application.duplicate_check_hash,
        application_created_at: application.created_at,
        application_updated_at: application.updated_at,
      }),
      party: mapParty({
        application_id: party.application_id,
        party_id: party.id,
        party_role: party.role,
        party_status: party.status,
        party_email: party.email,
        party_first_name: party.first_name,
        party_last_name: party.last_name,
        party_phone: party.phone,
        party_invite_token: party.invite_token,
        party_created_at: party.created_at,
        party_updated_at: party.updated_at,
      }),
      draftSession: mapDraftSession({
        application_id: sessionResult.rows[0].application_id,
        session_id: sessionResult.rows[0].id,
        session_party_id: sessionResult.rows[0].party_id,
        session_token: sessionResult.rows[0].session_token,
        form_data: sessionResult.rows[0].form_data,
        progress_map: sessionResult.rows[0].progress_map,
        current_step: sessionResult.rows[0].current_step,
        expires_at: sessionResult.rows[0].expires_at,
        last_activity_at: sessionResult.rows[0].last_activity_at,
        last_saved_at: sessionResult.rows[0].last_saved_at,
        session_created_at: sessionResult.rows[0].created_at,
        session_updated_at: sessionResult.rows[0].updated_at,
      }),
    };
  });
}

export async function autosaveDraftSession(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const sessionToken = String(input.sessionToken || "").trim();
  if (!orgId || !applicationId || !sessionToken) {
    throw new Error("Missing orgId, applicationId, or sessionToken.");
  }

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT s.*
        FROM "application_draft_sessions" s
        JOIN "lease_applications" a ON a.id = s.application_id
        WHERE s.session_token = $1
          AND s.application_id = $2
          AND a.org_id = $3
        LIMIT 1
        FOR UPDATE
      `,
      [sessionToken, applicationId, orgId],
    );

    if (existing.rows.length === 0) return null;
    const row = existing.rows[0];

    const mergedFormData = input.formDataPatch
      ? deepMerge(row.form_data ?? {}, input.formDataPatch)
      : row.form_data ?? {};
    const mergedProgress = input.progressMapPatch
      ? deepMerge(row.progress_map ?? {}, input.progressMapPatch)
      : row.progress_map;

    const now = new Date();
    const updated = await db.query(
      `
        UPDATE "application_draft_sessions"
        SET form_data = $1,
            progress_map = $2,
            current_step = COALESCE($3, current_step),
            last_saved_at = $4,
            last_activity_at = $4,
            updated_at = $4
        WHERE id = $5
        RETURNING id, application_id, party_id, session_token, form_data, progress_map,
                  current_step, expires_at, last_activity_at, last_saved_at, created_at, updated_at
      `,
      [
        mergedFormData,
        mergedProgress ?? null,
        input.currentStep ?? null,
        now,
        row.id,
      ],
    );

    const updatedRow = updated.rows[0];
    return mapDraftSession({
      application_id: updatedRow.application_id,
      session_id: updatedRow.id,
      session_party_id: updatedRow.party_id,
      session_token: updatedRow.session_token,
      form_data: updatedRow.form_data,
      progress_map: updatedRow.progress_map,
      current_step: updatedRow.current_step,
      expires_at: updatedRow.expires_at,
      last_activity_at: updatedRow.last_activity_at,
      last_saved_at: updatedRow.last_saved_at,
      session_created_at: updatedRow.created_at,
      session_updated_at: updatedRow.updated_at,
    });
  });
}

export async function resumeApplication(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const sessionToken = String(input.sessionToken || "").trim();
  if (!orgId || !sessionToken) throw new Error("Missing orgId or sessionToken.");

  const result = await pool.query(
    `
      SELECT
        a.id AS application_id,
        a.org_id,
        a.property_id,
        a.unit_id,
        a.status,
        a.application_type,
        a.duplicate_check_hash,
        a.created_at AS application_created_at,
        a.updated_at AS application_updated_at,
        p.id AS party_id,
        p.role AS party_role,
        p.status AS party_status,
        p.email AS party_email,
        p.first_name AS party_first_name,
        p.last_name AS party_last_name,
        p.phone AS party_phone,
        p.invite_token AS party_invite_token,
        p.created_at AS party_created_at,
        p.updated_at AS party_updated_at,
        s.id AS session_id,
        s.party_id AS session_party_id,
        s.session_token,
        s.form_data,
        s.progress_map,
        s.current_step,
        s.expires_at,
        s.last_activity_at,
        s.last_saved_at,
        s.created_at AS session_created_at,
        s.updated_at AS session_updated_at
      FROM "application_draft_sessions" s
      JOIN "lease_applications" a ON a.id = s.application_id
      LEFT JOIN "application_parties" p ON p.id = s.party_id
      WHERE s.session_token = $1
        AND a.org_id = $2
        AND s.expires_at > NOW()
        AND a.deleted_at IS NULL
      LIMIT 1
    `,
    [sessionToken, orgId],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    application: mapApplication(row),
    party: mapParty(row),
    draftSession: mapDraftSession(row),
  };
}

export async function inviteParty(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Missing party email.");

  return await withTx(pool, async (db) => {
    const exists = await db.query(
      `SELECT id FROM "lease_applications" WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [applicationId, orgId],
    );
    if (exists.rows.length === 0) return null;

    const now = new Date();
    const expiresAt = addDays(now, SESSION_TTL_DAYS);
    const inviteToken = issueToken();
    const sessionToken = issueToken();

    const partyResult = await db.query(
      `
        INSERT INTO "application_parties" (
          application_id,
          role,
          status,
          email,
          first_name,
          last_name,
          phone,
          invite_token,
          invite_sent_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, 'INVITED', $3, $4, $5, $6, $7, $8, $8, $8)
        RETURNING id, application_id, role, status, email, first_name, last_name, phone, invite_token, created_at, updated_at
      `,
      [
        applicationId,
        input.role,
        email,
        input.firstName?.trim() || null,
        input.lastName?.trim() || null,
        normalizePhone(input.phone),
        inviteToken,
        now,
      ],
    );

    const party = partyResult.rows[0];

    const sessionResult = await db.query(
      `
        INSERT INTO "application_draft_sessions" (
          application_id,
          party_id,
          session_token,
          form_data,
          progress_map,
          current_step,
          expires_at,
          last_activity_at,
          last_saved_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8, $8)
        RETURNING id, application_id, party_id, session_token, form_data, progress_map,
                  current_step, expires_at, last_activity_at, last_saved_at, created_at, updated_at
      `,
      [
        applicationId,
        party.id,
        sessionToken,
        {},
        null,
        input.currentStep ?? null,
        expiresAt,
        now,
      ],
    );

    return {
      party: mapParty({
        application_id: party.application_id,
        party_id: party.id,
        party_role: party.role,
        party_status: party.status,
        party_email: party.email,
        party_first_name: party.first_name,
        party_last_name: party.last_name,
        party_phone: party.phone,
        party_invite_token: party.invite_token,
        party_created_at: party.created_at,
        party_updated_at: party.updated_at,
      }),
      draftSession: mapDraftSession({
        application_id: sessionResult.rows[0].application_id,
        session_id: sessionResult.rows[0].id,
        session_party_id: sessionResult.rows[0].party_id,
        session_token: sessionResult.rows[0].session_token,
        form_data: sessionResult.rows[0].form_data,
        progress_map: sessionResult.rows[0].progress_map,
        current_step: sessionResult.rows[0].current_step,
        expires_at: sessionResult.rows[0].expires_at,
        last_activity_at: sessionResult.rows[0].last_activity_at,
        last_saved_at: sessionResult.rows[0].last_saved_at,
        session_created_at: sessionResult.rows[0].created_at,
        session_updated_at: sessionResult.rows[0].updated_at,
      }),
    };
  });
}

export async function submitApplication(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const applicationResult = await db.query(
      `
        SELECT *
        FROM "lease_applications"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [applicationId, orgId],
    );

    if (applicationResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const application = applicationResult.rows[0];

    if (application.status !== "DRAFT") {
      return { ok: false, errorCode: "INVALID_STATUS", status: application.status };
    }

    const partiesResult = await db.query(
      `SELECT id, role, status, screening_consent_at FROM "application_parties" WHERE application_id = $1`,
      [applicationId],
    );

    const parties = partiesResult.rows.map((row) => ({
      id: row.id,
      role: row.role,
      status: row.status,
      screeningConsentAt: row.screening_consent_at ?? null,
    }));

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();
    const workflowConfig = await loadEffectiveWorkflowConfig(db, {
      orgId,
      propertyId: application.property_id,
      jurisdictionCode: input.jurisdictionCode ?? null,
      asOfDate: now,
    });
    const submitConfig = resolveSubmitConfig(workflowConfig?.config ?? null);
    const intakeConfig = resolveUnitIntakeConfig(workflowConfig?.config ?? null);

    const availability = await (async () => {
      if (!application.unit_id) {
        return {
          available: true,
          snapshot: {
            unitId: null,
            checkedAt: now.toISOString(),
            available: true,
            reason: "NO_UNIT",
          },
        };
      }

      const holds = await db.query(
        `
          SELECT application_id, kind, status
          FROM "unit_reservations"
          WHERE unit_id = $1
            AND org_id = $2
            AND status = 'ACTIVE'
            AND kind IN ('SOFT_HOLD', 'HARD_HOLD')
            AND application_id <> $3
        `,
        [application.unit_id, orgId, applicationId],
      );

      const activeHoldApplications = holds.rows.map((row) => row.application_id);
      const activeHoldKinds = holds.rows.map((row) => row.kind);
      const activeHoldCount = holds.rows.length;
      const available = activeHoldCount === 0;

      return {
        available,
        snapshot: {
          unitId: application.unit_id,
          checkedAt: now.toISOString(),
          available,
          activeHoldCount,
          activeHoldApplications,
          activeHoldKinds,
          source: "unit_reservations",
        },
      };
    })();

    await db.query(
      `
        UPDATE "lease_applications"
        SET unit_availability_snapshot = $1,
            unit_availability_verified_at = $2,
            unit_was_available_at_submit = $3,
            updated_at = $2
        WHERE id = $4
      `,
      [availability.snapshot, now, availability.available, applicationId],
    );

    if (!availability.available) {
      return {
        ok: false,
        errorCode: "UNIT_UNAVAILABLE",
        guidance: {
          unitId: application.unit_id,
          activeHoldCount: availability.snapshot.activeHoldCount ?? 0,
          suggestedAction: "CHOOSE_ANOTHER_UNIT",
        },
      };
    }

    const partiesCheck = evaluateRequiredParties({
      applicationType: application.application_type,
      parties,
      config: submitConfig,
    });
    if (!partiesCheck.ok) {
      return { ok: false, errorCode: "PARTIES_INCOMPLETE", details: partiesCheck.details };
    }

    if (application.unit_id && intakeConfig.mode === "CAP_N_SUBMITS") {
      const countResult = await db.query(
        `
          SELECT COUNT(*)::int AS count
          FROM "lease_applications"
          WHERE org_id = $1
            AND unit_id = $2
            AND status = 'SUBMITTED'
            AND id <> $3
        `,
        [orgId, application.unit_id, applicationId],
      );

      const currentCount = countResult.rows[0]?.count ?? 0;
      if (currentCount >= intakeConfig.capSubmits) {
        return {
          ok: false,
          errorCode: "SUBMIT_CAP_REACHED",
          cap: intakeConfig.capSubmits,
          currentCount,
        };
      }
    }

    if (!input.consent?.partyId || !input.consent?.signature) {
      return { ok: false, errorCode: "CONSENT_REQUIRED" };
    }

    const consentTemplate = await loadActiveConsentTemplate(db, {
      orgId,
      asOfDate: now,
    });
    if (!consentTemplate) {
      return { ok: false, errorCode: "CONSENT_TEMPLATE_MISSING" };
    }

    const partyId = String(input.consent.partyId);
    const consentParty = parties.find((p) => p.id === partyId);
    if (!consentParty) {
      return { ok: false, errorCode: "CONSENT_PARTY_INVALID" };
    }

    if (!consentParty.screeningConsentAt) {
      await db.query(
        `
          UPDATE "application_parties"
          SET screening_consent_at = $1,
              screening_consent_template_id = $2,
              screening_consent_template_version = $3,
              screening_consent_ip = $4,
              screening_consent_signature = $5,
              updated_at = $1
          WHERE id = $6
        `,
        [
          now,
          consentTemplate.id,
          consentTemplate.version,
          input.consent.ip ?? null,
          input.consent.signature,
          partyId,
        ],
      );
    }

    const expiresAt = addDays(now, submitConfig.ttlDays);
    let reservation = null;

    if (application.unit_id && intakeConfig.mode === "LOCK_ON_SUBMIT") {
      const lockResult = await createScreeningLock(db, {
        orgId,
        applicationId,
        unitId: application.unit_id,
        expiresAt,
        now,
      });
      if (!lockResult.ok) {
        return lockResult;
      }
      reservation = lockResult.reservation;
    }

    const updated = await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'SUBMITTED',
            submitted_at = $1,
            expires_at = $2,
            application_fee_status = 'PENDING',
            updated_at = $1
        WHERE id = $3
        RETURNING id, status, submitted_at, expires_at
      `,
      [now, expiresAt, applicationId],
    );

    return {
      ok: true,
      application: {
        id: updated.rows[0].id,
        status: updated.rows[0].status,
        submittedAt: toIso(updated.rows[0].submitted_at),
        expiresAt: toIso(updated.rows[0].expires_at),
      },
      unitAvailability: availability.snapshot,
      reservation,
      workflowConfig: workflowConfig
        ? {
            id: workflowConfig.id,
            version: workflowConfig.version,
          }
        : null,
    };
  });
}

export async function withdrawApplication(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const applicationResult = await db.query(
      `
        SELECT *
        FROM "lease_applications"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [applicationId, orgId],
    );

    if (applicationResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const application = applicationResult.rows[0];

    if (application.status === "CLOSED") {
      return { ok: false, errorCode: "ALREADY_CLOSED" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'CLOSED',
            closed_at = $2,
            closed_reason = 'WITHDRAWN',
            withdrawn_at = $2,
            withdrawn_reason_code = $3,
            withdrawn_reason = $4,
            updated_at = $2
        WHERE id = $1
      `,
      [
        applicationId,
        now,
        input.reasonCode ?? null,
        input.reason ?? null,
      ],
    );

    await releaseReservationsForApplication(db, {
      orgId,
      applicationId,
      releaseReasonCode: "WITHDRAWN",
      releaseReason: input.reason ?? "Applicant withdrew",
      releasedById: input.withdrawnById ?? null,
      actorId: input.withdrawnById ?? null,
      now,
    });

    const refundRequests = [];
    const refundDecisions = [];

    const payments = await db.query(
      `
        SELECT id, payment_type, status, amount_cents, paid_at
        FROM "payment_intents"
        WHERE application_id = $1
      `,
      [applicationId],
    );

    for (const payment of payments.rows) {
      const decision = await evaluateRefundForPayment(db, {
        orgId,
        jurisdictionCode: input.jurisdictionCode ?? null,
        paymentType: payment.payment_type,
        asOfDate: now,
        paymentIntent: {
          paymentType: payment.payment_type,
          status: payment.status,
          amountCents: payment.amount_cents,
          paidAt: payment.paid_at ?? null,
        },
      });

      refundDecisions.push({
        paymentIntentId: payment.id,
        decision,
      });

      if (decision.eligible) {
        const refundRequest = await createRefundRequestWithDecision(db, {
          paymentIntentId: payment.id,
          requestedById: input.withdrawnById ?? orgId,
          requestedAmountCents: decision.eligibleAmountCents,
          decision,
          reason: input.reason ?? "Applicant withdrawal",
          asOfDate: now,
        });
        refundRequests.push(refundRequest);
      }
    }

    return { ok: true, refundRequests, refundDecisions };
  });
}

export { computeDuplicateHash };
