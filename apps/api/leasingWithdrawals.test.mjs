import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import { startApplication, submitApplication, withdrawApplication } from "./leasingApplicationsRepo.mjs";
import { expireDraftApplications, expireSubmittedApplications, markCoApplicantAbandonment } from "./leasingJobsRepo.mjs";

const connectionString =
  process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_DIRECT or DATABASE_URL is required for tests.");
}

const schema = process.env.BW_TEST_SCHEMA?.trim();

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") ||
    connectionString.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
  ...(schema ? { options: `-c search_path=${schema}` } : null),
});

async function createOrg(orgId) {
  const name = `Test Org ${orgId.slice(0, 8)}`;
  const slug = `test-org-${orgId.slice(0, 8)}`;
  await pool.query(
    'INSERT INTO "organizations" (id, name, slug) VALUES ($1, $2, $3)',
    [orgId, name, slug],
  );
}

async function cleanupOrg(orgId) {
  await pool.query('DELETE FROM "lease_applications" WHERE org_id = $1', [orgId]);
  await pool.query('DELETE FROM "organizations" WHERE id = $1', [orgId]);
}

async function insertConsentTemplate({ orgId, version = 1 }) {
  const result = await pool.query(
    `
      INSERT INTO "screening_consent_templates" (
        id, org_id, version, name, content, is_active, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), NOW())
      RETURNING id
    `,
    [crypto.randomUUID(), orgId, version, `Template v${version}`, "Consent copy"],
  );
  return result.rows[0];
}

async function insertWorkflowConfig({ orgId, propertyId, config }) {
  const result = await pool.query(
    `
      INSERT INTO "workflow_configs" (
        id, org_id, property_id, version, config, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING id
    `,
    [crypto.randomUUID(), orgId, propertyId, 1, config],
  );
  return result.rows[0];
}

async function insertRefundPolicy({ orgId, version = 1, paymentType }) {
  const result = await pool.query(
    `
      INSERT INTO "refund_policies" (
        id, org_id, name, version, policy_type, payment_type, refund_percentage,
        is_active, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'FULL_REFUND', $5::"payment_intent_type", 100, true, NOW(), NOW(), NOW())
      RETURNING id, version
    `,
    [crypto.randomUUID(), orgId, `Policy v${version}`, version, paymentType],
  );
  return result.rows[0];
}

after(async () => {
  await pool.end();
});

test("withdrawal releases reservations and creates refund request", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();
  const actorId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      config: { unitIntake: { mode: "LOCK_ON_SUBMIT" } },
    });
    await insertConsentTemplate({ orgId, version: 1 });
    await insertRefundPolicy({ orgId, version: 2, paymentType: "APPLICATION_FEE" });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "withdraw@example.com" },
    });

    await pool.query(
      `UPDATE "application_parties" SET status = 'COMPLETE' WHERE id = $1`,
      [created.party.id],
    );

    const submitted = await submitApplication(pool, {
      orgId,
      applicationId: created.application.id,
      consent: { partyId: created.party.id, signature: { agreed: true } },
    });

    assert.equal(submitted.ok, true);

    const paymentId = crypto.randomUUID();
    await pool.query(
      `
        INSERT INTO "payment_intents" (
          id, org_id, application_id, payment_type, status, amount_cents,
          currency, paid_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, 'APPLICATION_FEE', 'SUCCEEDED', 4500, 'USD', NOW(), NOW(), NOW())
      `,
      [paymentId, orgId, created.application.id],
    );

    const withdrawn = await withdrawApplication(pool, {
      orgId,
      applicationId: created.application.id,
      withdrawnById: actorId,
      reasonCode: "USER_REQUEST",
      reason: "Applicant withdrew",
    });

    assert.equal(withdrawn.ok, true);

    const reservation = await pool.query(
      `SELECT status, release_reason_code FROM "unit_reservations" WHERE application_id = $1`,
      [created.application.id],
    );
    assert.equal(reservation.rows[0].status, "RELEASED");
    assert.equal(reservation.rows[0].release_reason_code, "WITHDRAWN");

    const refundRequests = await pool.query(
      `SELECT policy_version FROM "refund_requests" WHERE payment_intent_id = $1`,
      [paymentId],
    );
    assert.equal(refundRequests.rows[0].policy_version, 2);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("submitted TTL closes application and releases holds", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "expire@example.com" },
    });

    await pool.query(
      `
        UPDATE "lease_applications"
        SET status = 'SUBMITTED', submitted_at = NOW() - INTERVAL '3 days', expires_at = NOW() - INTERVAL '1 hour'
        WHERE id = $1
      `,
      [created.application.id],
    );

    await pool.query(
      `
        INSERT INTO "unit_reservations" (
          id, org_id, application_id, unit_id, kind, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'SOFT_HOLD', 'ACTIVE', NOW(), NOW())
      `,
      [crypto.randomUUID(), orgId, created.application.id, unitId],
    );

    const expired = await expireSubmittedApplications(pool);
    assert.equal(expired.ok, true);
    assert.equal(expired.expired, 1);

    const app = await pool.query(
      `SELECT status, closed_reason FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(app.rows[0].status, "CLOSED");
    assert.equal(app.rows[0].closed_reason, "EXPIRED");

    const reservation = await pool.query(
      `SELECT status, release_reason_code FROM "unit_reservations" WHERE application_id = $1`,
      [created.application.id],
    );
    assert.equal(reservation.rows[0].status, "RELEASED");
    assert.equal(reservation.rows[0].release_reason_code, "EXPIRED");
  } finally {
    await cleanupOrg(orgId);
  }
});

test("draft TTL closes stale drafts", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const created = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "draft-expire@example.com" },
    });

    await pool.query(
      `UPDATE "lease_applications" SET created_at = NOW() - INTERVAL '40 days' WHERE id = $1`,
      [created.application.id],
    );

    const expired = await expireDraftApplications(pool, { ttlDays: 30 });
    assert.equal(expired.ok, true);
    assert.equal(expired.expired, 1);

    const app = await pool.query(
      `SELECT status, closed_reason FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(app.rows[0].status, "CLOSED");
    assert.equal(app.rows[0].closed_reason, "DRAFT_EXPIRED");
  } finally {
    await cleanupOrg(orgId);
  }
});

test("co-applicant abandonment locks party and marks needs info", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      config: { coApplicantAbandonment: { inactivityDays: 1 } },
    });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      applicationType: "JOINT",
      primary: { email: "primary@example.com" },
    });

    const coApplicantId = crypto.randomUUID();
    await pool.query(
      `
        INSERT INTO "application_parties" (
          id, application_id, role, status, email, created_at, updated_at
        )
        VALUES ($1, $2, 'CO_APPLICANT', 'IN_PROGRESS', $3, NOW(), NOW())
      `,
      [coApplicantId, created.application.id, "co@example.com"],
    );

    await pool.query(
      `
        INSERT INTO "application_draft_sessions" (
          id, application_id, party_id, session_token, form_data, expires_at,
          last_activity_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, '{}', NOW() + INTERVAL '10 days', NOW() - INTERVAL '3 days', NOW(), NOW())
      `,
      [crypto.randomUUID(), created.application.id, coApplicantId, crypto.randomBytes(16).toString("hex")],
    );

    await pool.query(
      `UPDATE "lease_applications" SET status = 'IN_REVIEW' WHERE id = $1`,
      [created.application.id],
    );

    const result = await markCoApplicantAbandonment(pool);
    assert.equal(result.ok, true);
    assert.equal(result.abandoned, 1);

    const party = await pool.query(
      `SELECT status, abandoned_at, abandoned_reason_code FROM "application_parties" WHERE id = $1`,
      [coApplicantId],
    );
    assert.equal(party.rows[0].status, "LOCKED");
    assert.equal(party.rows[0].abandoned_reason_code, "INACTIVITY");
    assert.ok(party.rows[0].abandoned_at);

    const app = await pool.query(
      `SELECT status FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(app.rows[0].status, "NEEDS_INFO");
  } finally {
    await cleanupOrg(orgId);
  }
});
