import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import {
  confirmApplicationFeePayment,
  createApplicationFeeIntent,
  listApplicationFeePaymentAttempts,
} from "./leasePaymentsRepo.mjs";
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

after(async () => {
  await pool.end();
});

test("decline then retry works with same application id", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    await insertConsentTemplate({ orgId, version: 1 });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "payments@example.com" },
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

    const firstIntent = await createApplicationFeeIntent(pool, {
      orgId,
      applicationId: created.application.id,
      amountCents: 5000,
      currency: "USD",
    });

    assert.equal(firstIntent.ok, true);
    assert.equal(firstIntent.paymentIntent.status, "REQUIRES_ACTION");
    assert.equal(firstIntent.paymentIntent.attemptsCount, 1);

    const failed = await confirmApplicationFeePayment(pool, {
      orgId,
      applicationId: created.application.id,
      confirmation: { outcome: "decline" },
    });

    assert.equal(failed.ok, false);
    assert.equal(failed.paymentIntent.status, "FAILED");

    const afterFailure = await pool.query(
      `SELECT application_fee_status FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(afterFailure.rows[0].application_fee_status, "FAILED");

    const retryIntent = await createApplicationFeeIntent(pool, {
      orgId,
      applicationId: created.application.id,
      amountCents: 5000,
      currency: "USD",
    });

    assert.equal(retryIntent.ok, true);
    assert.equal(retryIntent.paymentIntent.status, "REQUIRES_ACTION");
    assert.equal(retryIntent.paymentIntent.attemptsCount, 2);
    assert.equal(retryIntent.paymentIntent.id, firstIntent.paymentIntent.id);

    const succeeded = await confirmApplicationFeePayment(pool, {
      orgId,
      applicationId: created.application.id,
      confirmation: { outcome: "succeed" },
    });

    assert.equal(succeeded.ok, true);
    assert.equal(succeeded.paymentIntent.status, "SUCCEEDED");

    const finalStatus = await pool.query(
      `SELECT application_fee_status FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(finalStatus.rows[0].application_fee_status, "SUCCEEDED");

    const attempts = await listApplicationFeePaymentAttempts(pool, {
      orgId,
      applicationId: created.application.id,
    });
    assert.equal(attempts.length, 2);
    assert.deepEqual(
      attempts.map((a) => a.attemptNumber),
      [1, 2],
    );
  } finally {
    await cleanupOrg(orgId);
  }
});

