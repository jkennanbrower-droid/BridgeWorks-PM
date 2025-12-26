import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import { startApplication, submitApplication } from "./leasingApplicationsRepo.mjs";
import { expireReservations, releaseReservation } from "./unitReservationsRepo.mjs";

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

after(async () => {
  await pool.end();
});

test("concurrent screening locks conflict", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      config: { unitIntake: { mode: "LOCK_ON_SUBMIT" } },
    });
    await insertConsentTemplate({ orgId, version: 1 });

    const [first, second] = await Promise.all([
      startApplication(pool, {
        orgId,
        propertyId,
        unitId,
        primary: { email: "lock-1@example.com" },
      }),
      startApplication(pool, {
        orgId,
        propertyId,
        unitId,
        primary: { email: "lock-2@example.com" },
      }),
    ]);

    await pool.query(
      `UPDATE "application_parties" SET status = 'COMPLETE' WHERE id = ANY($1::uuid[])`,
      [[first.party.id, second.party.id]],
    );

    const [resultA, resultB] = await Promise.all([
      submitApplication(pool, {
        orgId,
        applicationId: first.application.id,
        consent: { partyId: first.party.id, signature: { agreed: true } },
      }),
      submitApplication(pool, {
        orgId,
        applicationId: second.application.id,
        consent: { partyId: second.party.id, signature: { agreed: true } },
      }),
    ]);

    const results = [resultA, resultB];
    const success = results.find((r) => r.ok);
    const conflict = results.find((r) => !r.ok);

    assert.ok(success);
    assert.ok(conflict);
    assert.equal(conflict.errorCode, "RESERVATION_CONFLICT");
    assert.ok(conflict.holderApplicationId);
    assert.ok(conflict.expiresAt);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("lock-on-submit creates and releases SCREENING_LOCK", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      config: { unitIntake: { mode: "LOCK_ON_SUBMIT" } },
    });
    await insertConsentTemplate({ orgId, version: 1 });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "release@example.com" },
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
    assert.equal(submitted.reservation?.kind, "SCREENING_LOCK");

    const release = await releaseReservation(pool, {
      orgId,
      reservationId: submitted.reservation.id,
      releaseReasonCode: "WITHDRAWN",
      releaseReason: "Applicant withdrew",
    });

    assert.equal(release.ok, true);
    assert.equal(release.reservation.status, "RELEASED");
    assert.equal(release.reservation.releaseReasonCode, "WITHDRAWN");
  } finally {
    await cleanupOrg(orgId);
  }
});

test("expireReservations marks screening locks as expired", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      config: { unitIntake: { mode: "LOCK_ON_SUBMIT" } },
    });
    await insertConsentTemplate({ orgId, version: 1 });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "expire@example.com" },
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

    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const expired = await expireReservations(pool, { now: future });
    assert.equal(expired.ok, true);
    assert.ok(expired.expired >= 1);

    const result = await pool.query(
      `SELECT status, release_reason_code FROM "unit_reservations" WHERE id = $1`,
      [submitted.reservation.id],
    );

    assert.equal(result.rows[0].status, "EXPIRED");
    assert.equal(result.rows[0].release_reason_code, "EXPIRED");
  } finally {
    await cleanupOrg(orgId);
  }
});

