import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import { startApplication, submitApplication } from "./leasingApplicationsRepo.mjs";

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

async function insertConsentTemplate({ orgId, version }) {
  const result = await pool.query(
    `
      INSERT INTO "screening_consent_templates" (
        id, org_id, version, name, content, is_active, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), NOW())
      RETURNING id, version
    `,
    [crypto.randomUUID(), orgId, version, `Template v${version}`, "Consent copy"],
  );
  return result.rows[0];
}

async function insertWorkflowConfig({ orgId, propertyId, config, version = 1 }) {
  const result = await pool.query(
    `
      INSERT INTO "workflow_configs" (
        id, org_id, property_id, version, config, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING id, version
    `,
    [crypto.randomUUID(), orgId, propertyId, version, config],
  );
  return result.rows[0];
}

after(async () => {
  await pool.end();
});

test("submitting unavailable unit fails and snapshot is recorded", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const primary = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "unit-unavailable@example.com" },
    });

    const other = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "hold-owner@example.com" },
    });

    await pool.query(
      `
        INSERT INTO "unit_reservations" (
          id, org_id, application_id, unit_id, kind, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'HARD_HOLD', 'ACTIVE', NOW(), NOW())
      `,
      [crypto.randomUUID(), orgId, other.application.id, unitId],
    );

    const result = await submitApplication(pool, {
      orgId,
      applicationId: primary.application.id,
      consent: { partyId: primary.party.id, signature: { agreed: true } },
    });

    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "UNIT_UNAVAILABLE");

    const snapshotResult = await pool.query(
      `
        SELECT unit_availability_snapshot, unit_was_available_at_submit, status
        FROM "lease_applications"
        WHERE id = $1
      `,
      [primary.application.id],
    );

    assert.equal(snapshotResult.rows[0].status, "DRAFT");
    assert.equal(snapshotResult.rows[0].unit_was_available_at_submit, false);
    assert.ok(snapshotResult.rows[0].unit_availability_snapshot);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("HOUSEHOLD_GROUP requires all PRIMARY complete", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const created = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "primary-1@example.com" },
    });

    await pool.query(
      `
        UPDATE "lease_applications"
        SET application_type = 'HOUSEHOLD_GROUP'
        WHERE id = $1
      `,
      [created.application.id],
    );

    await pool.query(
      `
        INSERT INTO "application_parties" (
          id, application_id, role, status, email, created_at, updated_at
        )
        VALUES ($1, $2, 'PRIMARY', 'IN_PROGRESS', $3, NOW(), NOW())
      `,
      [crypto.randomUUID(), created.application.id, "primary-2@example.com"],
    );

    await pool.query(
      `UPDATE "application_parties" SET status = 'COMPLETE' WHERE id = $1`,
      [created.party.id],
    );

    const result = await submitApplication(pool, {
      orgId,
      applicationId: created.application.id,
      consent: { partyId: created.party.id, signature: { agreed: true } },
    });

    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "PARTIES_INCOMPLETE");
  } finally {
    await cleanupOrg(orgId);
  }
});

test("consent template version is stored on submit", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertWorkflowConfig({
      orgId,
      propertyId,
      version: 2,
      config: { submit: { ttlDays: 5, jointRequiredCoApplicants: 1 } },
    });

    const template = await insertConsentTemplate({ orgId, version: 3 });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "consent@example.com" },
    });

    await pool.query(
      `UPDATE "application_parties" SET status = 'COMPLETE' WHERE id = $1`,
      [created.party.id],
    );

    const result = await submitApplication(pool, {
      orgId,
      applicationId: created.application.id,
      consent: { partyId: created.party.id, signature: { agreed: true } },
    });

    assert.equal(result.ok, true);
    assert.equal(result.application.status, "SUBMITTED");

    const partyResult = await pool.query(
      `
        SELECT screening_consent_template_id, screening_consent_template_version
        FROM "application_parties"
        WHERE id = $1
      `,
      [created.party.id],
    );

    assert.equal(partyResult.rows[0].screening_consent_template_id, template.id);
    assert.equal(partyResult.rows[0].screening_consent_template_version, 3);
  } finally {
    await cleanupOrg(orgId);
  }
});

