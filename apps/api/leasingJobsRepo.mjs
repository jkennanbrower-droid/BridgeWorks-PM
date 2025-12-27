import { releaseReservationsForApplication } from "./unitReservationsRepo.mjs";

const DEFAULT_DRAFT_TTL_DAYS = 30;
const DEFAULT_ABANDONMENT_DAYS = 7;

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function clampInt(value, { min = 1, max = 365 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
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

async function loadEffectiveWorkflowConfig(db, { orgId, propertyId, jurisdictionCode, asOfDate }) {
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

export async function expireDraftApplications(pool, input = {}) {
  return await withTx(pool, async (db) => {
    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const ttlDays = clampInt(input.ttlDays, { min: 1, max: 365 }) ?? DEFAULT_DRAFT_TTL_DAYS;
    const cutoff = addDays(now, -ttlDays);

    const candidates = await db.query(
      `
        SELECT a.id, a.org_id
        FROM "lease_applications" a
        WHERE a.status = 'DRAFT'
          AND a.created_at <= $1
          AND a.deleted_at IS NULL
      `,
      [cutoff],
    );

    if (candidates.rows.length === 0) {
      return { ok: true, expired: 0 };
    }

    const ids = candidates.rows.map((row) => row.id);
    await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'CLOSED',
            closed_at = $2,
            closed_reason = 'DRAFT_EXPIRED',
            updated_at = $2
        WHERE id = ANY($1::uuid[])
      `,
      [ids, now],
    );

    return { ok: true, expired: ids.length };
  });
}

export async function expireSubmittedApplications(pool) {
  return await withTx(pool, async (db) => {
    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const result = await db.query(
      `
        SELECT id, org_id
        FROM "lease_applications"
        WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO')
          AND expires_at IS NOT NULL
          AND expires_at <= $1
        FOR UPDATE
      `,
      [now],
    );

    if (result.rows.length === 0) return { ok: true, expired: 0 };

    const ids = result.rows.map((row) => row.id);

    await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'CLOSED',
            closed_at = $2,
            closed_reason = 'EXPIRED',
            updated_at = $2
        WHERE id = ANY($1::uuid[])
      `,
      [ids, now],
    );

    for (const row of result.rows) {
      await releaseReservationsForApplication(db, {
        orgId: row.org_id,
        applicationId: row.id,
        releaseReasonCode: "EXPIRED",
        releaseReason: "Application expired",
        actorId: null,
        now,
      });
    }

    return { ok: true, expired: ids.length };
  });
}

export async function markCoApplicantAbandonment(pool, input = {}) {
  return await withTx(pool, async (db) => {
    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const fallbackDays = clampInt(input.inactivityDays, { min: 1, max: 60 }) ?? DEFAULT_ABANDONMENT_DAYS;
    const cutoff = addDays(now, -fallbackDays);

    const parties = await db.query(
      `
        SELECT p.id, p.application_id, a.org_id, a.property_id, a.status, s.last_activity_at
        FROM "application_parties" p
        JOIN "lease_applications" a ON a.id = p.application_id
        LEFT JOIN LATERAL (
          SELECT last_activity_at
          FROM "application_draft_sessions" s
          WHERE s.party_id = p.id
          ORDER BY s.last_activity_at DESC NULLS LAST
          LIMIT 1
        ) s ON true
        WHERE p.role = 'CO_APPLICANT'
          AND p.status IN ('INVITED', 'IN_PROGRESS')
          AND p.abandoned_at IS NULL
      `,
    );

    let updatedCount = 0;

    for (const row of parties.rows) {
      const workflowConfig = await loadEffectiveWorkflowConfig(db, {
        orgId: row.org_id,
        propertyId: row.property_id,
        jurisdictionCode: null,
        asOfDate: now,
      });

      const inactivityDays =
        clampInt(workflowConfig?.config?.coApplicantAbandonment?.inactivityDays, {
          min: 1,
          max: 60,
        }) ?? fallbackDays;

      const rowCutoff = addDays(now, -inactivityDays);
      const lastActivity = row.last_activity_at ? new Date(row.last_activity_at) : null;
      const stale = !lastActivity || lastActivity <= rowCutoff;

      if (!stale) continue;

      await db.query(
        `
          UPDATE "application_parties"
          SET status = 'LOCKED',
              abandoned_at = $2,
              abandoned_reason_code = 'INACTIVITY',
              updated_at = $2
          WHERE id = $1
        `,
        [row.id, now],
      );

      if (row.status !== "CLOSED") {
        await db.query(
          `
            UPDATE "lease_applications"
            SET status = CASE
              WHEN status IN ('SUBMITTED', 'IN_REVIEW') THEN 'NEEDS_INFO'
              ELSE status
            END,
            updated_at = $2
            WHERE id = $1
          `,
          [row.application_id, now],
        );
      }

      updatedCount += 1;
    }

    return { ok: true, abandoned: updatedCount };
  });
}
