import crypto from "node:crypto";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

import { inviteParty, startApplication } from "./leasingApplicationsRepo.mjs";
import {
  createInfoRequest,
  generateRequirementItems,
  respondToInfoRequest,
} from "./leasingRequirementsRepo.mjs";

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

async function insertWorkflowConfig({ orgId, propertyId, config, version = 1 }) {
  const result = await pool.query(
    `
      INSERT INTO "workflow_configs" (
        id, org_id, property_id, version, config, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING id
    `,
    [crypto.randomUUID(), orgId, propertyId, version, config],
  );
  return result.rows[0];
}

after(async () => {
  await pool.end();
});

test("relocation alternatives and guarantor requirements generate", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const config = {
      requirements: {
        items: [
          {
            id: "relocation-proof",
            name: "Relocation Proof",
            requirementType: "DOCUMENT",
            documentType: "EMPLOYMENT_LETTER",
            partyRoles: ["PRIMARY"],
            alternatives: {
              OUT_OF_STATE_JOB_OFFER: [
                {
                  id: "offer-letter",
                  name: "Job Offer Letter",
                  documentType: "EMPLOYMENT_LETTER",
                },
              ],
              default: [
                {
                  id: "local-proof",
                  name: "Local Proof",
                  documentType: "OTHER",
                },
              ],
            },
          },
          {
            id: "guarantor-income",
            name: "Guarantor Income",
            requirementType: "DOCUMENT",
            documentType: "PROOF_OF_INCOME",
            partyRoles: ["GUARANTOR"],
          },
        ],
      },
    };

    await insertWorkflowConfig({ orgId, propertyId, config });

    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "relocation@example.com" },
    });

    await pool.query(
      `UPDATE "lease_applications" SET relocation_status = 'OUT_OF_STATE_JOB_OFFER' WHERE id = $1`,
      [created.application.id],
    );

    const guarantorInvite = await inviteParty(pool, {
      orgId,
      applicationId: created.application.id,
      role: "GUARANTOR",
      email: "guarantor@example.com",
    });

    const generated = await generateRequirementItems(pool, {
      orgId,
      applicationId: created.application.id,
    });

    assert.equal(generated.ok, true);

    const relocationItem = generated.items.find(
      (item) => item.metadata?.templateId === "relocation-proof",
    );
    assert.ok(relocationItem);
    assert.deepEqual(relocationItem.metadata.alternatives, [
      {
        id: "offer-letter",
        name: "Job Offer Letter",
        documentType: "EMPLOYMENT_LETTER",
      },
    ]);

    const guarantorItem = generated.items.find(
      (item) => item.metadata?.templateId === "guarantor-income",
    );
    assert.ok(guarantorItem);
    assert.equal(guarantorItem.partyId, guarantorInvite.party.id);
  } finally {
    await cleanupOrg(orgId);
  }
});

test("info request unlocks only requested scopes", async () => {
  const orgId = crypto.randomUUID();
  const propertyId = crypto.randomUUID();
  const unitId = crypto.randomUUID();

  await createOrg(orgId);

  try {
    const created = await startApplication(pool, {
      orgId,
      propertyId,
      unitId,
      primary: { email: "needs-info@example.com" },
    });

    await pool.query(
      `UPDATE "lease_applications" SET status = 'IN_REVIEW' WHERE id = $1`,
      [created.application.id],
    );

    const infoRequest = await createInfoRequest(pool, {
      orgId,
      applicationId: created.application.id,
      targetPartyId: created.party.id,
      unlockScopes: ["income", "identity"],
      itemsToRequest: [
        {
          name: "Proof of income",
          requirementType: "DOCUMENT",
          documentType: "PROOF_OF_INCOME",
        },
      ],
    });

    assert.equal(infoRequest.ok, true);
    assert.deepEqual(infoRequest.infoRequest.unlockScopes, ["income", "identity"]);
    assert.equal(infoRequest.requirements.length, 1);
    assert.equal(infoRequest.requirements[0].infoRequestId, infoRequest.infoRequest.id);

    const statusAfter = await pool.query(
      `SELECT status FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(statusAfter.rows[0].status, "NEEDS_INFO");

    const responded = await respondToInfoRequest(pool, {
      orgId,
      applicationId: created.application.id,
      infoRequestId: infoRequest.infoRequest.id,
    });

    assert.equal(responded.ok, true);
    assert.equal(responded.infoRequest.status, "RESPONDED");

    const statusFinal = await pool.query(
      `SELECT status FROM "lease_applications" WHERE id = $1`,
      [created.application.id],
    );
    assert.equal(statusFinal.rows[0].status, "IN_REVIEW");
  } finally {
    await cleanupOrg(orgId);
  }
});
