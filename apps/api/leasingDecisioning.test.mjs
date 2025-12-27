import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import { startApplication } from "./leasingApplicationsRepo.mjs";
import { listApplicationQueue, makeDecision } from "./leasingDecisioningRepo.mjs";

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

after(async () => {
  await pool.end();
});

test("decision record stores method/version deterministically", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();
  const decidedById = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "decision@example.com" },
    });

    await pool.query(
      `UPDATE "lease_applications" SET status = 'IN_REVIEW', submitted_at = NOW() WHERE id = $1`,
      [created.application.id],
    );

    const decision = await makeDecision(pool, {
      orgId,
      applicationId: created.application.id,
      decidedById,
      outcome: "APPROVED",
      criteriaVersion: 5,
      structuredReasonCodes: { reasons: ["INCOME_OK"] },
      incomeData: {
        method: "GROSS_MONTHLY",
        verifiedMonthlyCents: 550000,
        verifiedAnnualCents: 6600000,
        passed: true,
        notes: "Verified by staff",
      },
      criminalData: {
        status: "CLEAR",
        summary: { incidents: 0 },
        notes: "Manual review",
        reviewedAt: new Date().toISOString(),
        reviewedById: decidedById,
      },
      optionalConditions: { leaseTermMonths: 12 },
    });

    assert.equal(decision.ok, true);
    assert.equal(decision.decision.criteriaVersion, 5);
    assert.equal(decision.decision.incomeCalculationMethod, "GROSS_MONTHLY");
    assert.equal(decision.decision.incomeVerifiedMonthlyCents, 550000);
    assert.equal(decision.decision.incomeVerifiedAnnualCents, 6600000);
    assert.equal(decision.decision.incomePassed, true);
    assert.equal(decision.decision.criminalReviewStatus, "CLEAR");
    assert.deepEqual(decision.decision.reasonCodes, { reasons: ["INCOME_OK"] });
  } finally {
    await cleanupOrg(orgId);
  }
});

test("priority ordering works", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const standardOld = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "standard-old@example.com" },
    });

    const standardNew = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "standard-new@example.com" },
    });

    const priorityApp = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "priority@example.com" },
    });

    const emergencyApp = await startApplication(pool, {
      orgId,
      propertyId,
      primary: { email: "emergency@example.com" },
    });

    await pool.query(
      `UPDATE "lease_applications"
       SET status = 'SUBMITTED', submitted_at = NOW() - INTERVAL '55 hours'
       WHERE id = $1`,
      [standardOld.application.id],
    );

    await pool.query(
      `UPDATE "lease_applications"
       SET status = 'SUBMITTED', submitted_at = NOW()
       WHERE id = $1`,
      [standardNew.application.id],
    );

    await pool.query(
      `UPDATE "lease_applications"
       SET status = 'SUBMITTED', submitted_at = NOW(), priority = 'PRIORITY'
       WHERE id = $1`,
      [priorityApp.application.id],
    );

    await pool.query(
      `UPDATE "lease_applications"
       SET status = 'SUBMITTED', submitted_at = NOW(), priority = 'EMERGENCY'
       WHERE id = $1`,
      [emergencyApp.application.id],
    );

    const queue = await listApplicationQueue(pool, { orgId, propertyId });

    assert.equal(queue.ok, true);
    const ids = queue.items.map((item) => item.applicationId);

    assert.equal(ids[0], emergencyApp.application.id);
    assert.equal(ids[1], priorityApp.application.id);
    assert.equal(ids.indexOf(standardOld.application.id) < ids.indexOf(standardNew.application.id), true);
  } finally {
    await cleanupOrg(orgId);
  }
});
