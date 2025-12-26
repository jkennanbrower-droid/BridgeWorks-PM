import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import {
  autosaveDraftSession,
  resumeApplication,
  startApplication,
} from "./leasingApplicationsRepo.mjs";

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

test("dedupe returns existing", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const input = {
      orgId,
      propertyId,
      unitId,
      primary: {
        email: "TestApplicant@Example.com",
        firstName: "Taylor",
        lastName: "Reed",
        phone: "(555) 212-7788",
      },
    };

    const first = await startApplication(pool, input);
    assert.equal(first.deduped, false);

    const second = await startApplication(pool, input);
    assert.equal(second.deduped, true);
    assert.equal(second.application.id, first.application.id);

    const count = await pool.query(
      'SELECT COUNT(*)::int AS count FROM "lease_applications" WHERE org_id = $1 AND duplicate_check_hash = $2',
      [orgId, first.application.duplicateCheckHash],
    );
    assert.equal(count.rows[0].count, 1);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("autosave persists across sessions", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const start = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: {
        email: "autosave@example.com",
      },
    });

    const sessionToken = start.draftSession.sessionToken;
    const applicationId = start.application.id;

    const saved = await autosaveDraftSession(pool, {
      orgId,
      applicationId,
      sessionToken,
      currentStep: "contact",
      formDataPatch: {
        applicant: { firstName: "Jordan" },
      },
      progressMapPatch: {
        contact: "started",
      },
    });

    assert.ok(saved);
    assert.equal(saved.currentStep, "contact");

    const resumed = await resumeApplication(pool, { orgId, sessionToken });
    assert.ok(resumed);
    assert.equal(resumed.draftSession.currentStep, "contact");
    assert.deepEqual(resumed.draftSession.formData.applicant, { firstName: "Jordan" });
    assert.equal(resumed.draftSession.progressMap.contact, "started");
    assert.ok(resumed.draftSession.lastSavedAt);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("resume token works and is scoped properly", async () => {
  const orgId = crypto.randomUUID();
  const otherOrgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();

  await createOrg(orgId);
  await createOrg(otherOrgId);

  try {
    const start = await startApplication(pool, {
      orgId,
      propertyId,
      primary: {
        email: "resume@example.com",
      },
    });

    const sessionToken = start.draftSession.sessionToken;

    const resumed = await resumeApplication(pool, { orgId, sessionToken });
    assert.ok(resumed);
    assert.equal(resumed.application.orgId, orgId);

    const wrong = await resumeApplication(pool, { orgId: otherOrgId, sessionToken });
    assert.equal(wrong, null);
  } finally {
    await cleanupOrg(orgId);
    await cleanupOrg(otherOrgId);
  }
});
