import crypto from "node:crypto";

import { startApplication, submitApplication } from "./leasingApplicationsRepo.mjs";
import { attachDocument, createInfoRequest, generateRequirementItems } from "./leasingRequirementsRepo.mjs";
import { createApplicationFeeIntent, confirmApplicationFeePayment } from "./leasePaymentsRepo.mjs";
import { createApplicationScore, makeDecision } from "./leasingDecisioningRepo.mjs";

function isUuidLike(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function randomEmail() {
  return `demo+${crypto.randomUUID().slice(0, 8)}@bridgeworks.invalid`;
}

async function ensureOrganization(pool, input) {
  const candidate = isUuidLike(input.orgId) ? input.orgId : null;
  if (candidate) {
    const existing = await pool.query(
      `SELECT id, name, slug FROM "organizations" WHERE id = $1 LIMIT 1`,
      [candidate],
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
  }

  const orgId = candidate ?? crypto.randomUUID();
  const name = input.orgName ?? `Demo Org ${orgId.slice(0, 6)}`;
  const slug = input.orgSlug ?? `demo-${orgId.slice(0, 8)}`;
  const now = new Date();

  await pool.query(
    `
      INSERT INTO "organizations" (id, name, slug, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', $4, $4)
      ON CONFLICT (id) DO NOTHING
    `,
    [orgId, name, slug, now],
  );

  return { id: orgId, name, slug };
}

async function ensureScreeningConsentTemplate(pool, orgId) {
  const existing = await pool.query(
    `
      SELECT id, version
      FROM "screening_consent_templates"
      WHERE is_active = true
        AND (org_id = $1 OR org_id IS NULL)
      ORDER BY (org_id IS NULL) ASC, version DESC, effective_at DESC
      LIMIT 1
    `,
    [orgId],
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const now = new Date();
  const insert = await pool.query(
    `
      INSERT INTO "screening_consent_templates" (
        id, org_id, version, name, content, is_active, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, 1, $3, $4, true, $5, $5, $5)
      RETURNING id, version
    `,
    [
      crypto.randomUUID(),
      orgId,
      "Screening Consent v1",
      "By submitting, you consent to screening checks required for leasing.",
      now,
    ],
  );

  return insert.rows[0];
}

async function ensureWorkflowConfig(pool, orgId) {
  const existing = await pool.query(
    `
      SELECT id, version
      FROM "workflow_configs"
      WHERE org_id = $1
      ORDER BY version DESC, effective_at DESC
      LIMIT 1
    `,
    [orgId],
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const now = new Date();
  const config = {
    submit: {
      ttlDays: 30,
      jointRequiredCoApplicants: 1,
    },
    unitIntake: {
      mode: "OPEN",
      capSubmits: 1,
    },
    requirements: {
      items: [
        {
          id: "req-id",
          name: "Government ID",
          requirementType: "DOCUMENT",
          documentType: "GOVERNMENT_ID",
          partyRoles: ["PRIMARY"],
          isRequired: true,
          sortOrder: 1,
        },
        {
          id: "req-income",
          name: "Proof of income",
          requirementType: "DOCUMENT",
          documentType: "PROOF_OF_INCOME",
          partyRoles: ["PRIMARY"],
          isRequired: true,
          sortOrder: 2,
        },
        {
          id: "req-employment",
          name: "Employment letter",
          requirementType: "DOCUMENT",
          documentType: "EMPLOYMENT_LETTER",
          partyRoles: ["PRIMARY"],
          isRequired: false,
          sortOrder: 3,
        },
      ],
    },
    draft: {
      ttlDays: 14,
    },
    coApplicantAbandonment: {
      days: 5,
      reminderCadenceDays: 2,
    },
    automation: {
      enabled: true,
      reminderCadenceDays: 2,
      maxReminders: 3,
      staleAfterDays: 7,
      submittedTtlDays: 30,
      screeningTimeoutDays: 7,
      docExpiryDays: 30,
      slaHoursByPriority: {
        STANDARD: 48,
        PRIORITY: 24,
        EMERGENCY: 12,
      },
    },
  };

  const insert = await pool.query(
    `
      INSERT INTO "workflow_configs" (
        id, org_id, property_id, jurisdiction_code, version, config, effective_at, created_at, updated_at
      )
      VALUES ($1, $2, NULL, NULL, 1, $3::jsonb, $4, $4, $4)
      RETURNING id, version
    `,
    [crypto.randomUUID(), orgId, JSON.stringify(config), now],
  );

  return insert.rows[0];
}

async function ensureRefundPolicy(pool, orgId) {
  const existing = await pool.query(
    `
      SELECT id, version
      FROM "refund_policies"
      WHERE org_id = $1
      ORDER BY version DESC, effective_at DESC
      LIMIT 1
    `,
    [orgId],
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const now = new Date();
  const insert = await pool.query(
    `
      INSERT INTO "refund_policies" (
        id,
        org_id,
        name,
        version,
        policy_type,
        payment_type,
        refund_percentage,
        refund_window_hours,
        is_active,
        effective_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 1, 'FULL_REFUND', 'APPLICATION_FEE', 100, 72, true, $4, $4, $4)
      RETURNING id, version
    `,
    [crypto.randomUUID(), orgId, "Default Application Fee Refund", now],
  );

  return insert.rows[0];
}

export async function createMockApplication(pool, input) {
  const scenario = input.scenario ?? "submitted";
  const org = await ensureOrganization(pool, input ?? {});
  const propertyId = isUuidLike(input.propertyId) ? input.propertyId : crypto.randomUUID();
  const unitId = isUuidLike(input.unitId) ? input.unitId : crypto.randomUUID();

  await ensureScreeningConsentTemplate(pool, org.id);
  await ensureWorkflowConfig(pool, org.id);
  await ensureRefundPolicy(pool, org.id);

  const primaryEmail = input.email ?? randomEmail();
  const primary = {
    email: primaryEmail,
    firstName: input.firstName ?? "Taylor",
    lastName: input.lastName ?? "Resident",
    phone: input.phone ?? "(555) 555-0101",
  };

  const startResult = await startApplication(pool, {
    orgId: org.id,
    propertyId,
    unitId,
    applicationType: "INDIVIDUAL",
    primary,
    currentStep: "profile",
    formData: {
      desiredMoveInDate: new Date().toISOString().slice(0, 10),
      leaseTermMonths: 12,
      monthlyIncomeCents: 450000,
      employer: "Acme Corp",
    },
  });

  const applicationId = startResult.application?.id;
  const partyId = startResult.party?.id;
  if (!applicationId || !partyId) {
    return { ok: false, errorCode: "START_FAILED" };
  }

  if (scenario !== "draft") {
    const now = new Date();
    await pool.query(
      `
        UPDATE "application_parties"
        SET status = 'COMPLETE', joined_at = $1, completed_at = $1, updated_at = $1
        WHERE id = $2
      `,
      [now, partyId],
    );

    const submitResult = await submitApplication(pool, {
      orgId: org.id,
      applicationId,
      consent: {
        partyId,
        signature: {
          agreed: true,
          name: `${primary.firstName} ${primary.lastName}`.trim() || primary.email,
          timestamp: now.toISOString(),
        },
        ip: "127.0.0.1",
      },
    });

    if (!submitResult.ok) {
      return { ok: false, errorCode: submitResult.errorCode ?? "SUBMIT_FAILED" };
    }

    const requirementsResult = await generateRequirementItems(pool, {
      orgId: org.id,
      applicationId,
    });

    if (requirementsResult.ok && requirementsResult.items?.length) {
      const firstReq = requirementsResult.items[0];
      await attachDocument(pool, {
        orgId: org.id,
        applicationId,
        partyId,
        requirementItemId: firstReq.id,
        documentType: firstReq.metadata?.documentType ?? "GOVERNMENT_ID",
        fileName: "demo-id.pdf",
        mimeType: "application/pdf",
        sizeBytes: 155000,
        storageKey: `mock/${applicationId}/demo-id.pdf`,
      });
    }

    await createApplicationFeeIntent(pool, {
      orgId: org.id,
      applicationId,
      amountCents: input.amountCents ?? 4500,
      currency: "USD",
    });

    if (input.paymentOutcome) {
      await confirmApplicationFeePayment(pool, {
        orgId: org.id,
        applicationId,
        confirmation: { outcome: input.paymentOutcome },
      });
    }
  }

  if (scenario === "needs_info") {
    await createInfoRequest(pool, {
      orgId: org.id,
      applicationId,
      targetPartyId: partyId,
      message: "Please provide your most recent pay stub.",
      itemsToRequest: [
        {
          name: "Recent pay stub",
          description: "Upload your latest pay stub for verification.",
          requirementType: "DOCUMENT",
          documentType: "PROOF_OF_INCOME",
          partyId,
          isRequired: true,
          sortOrder: 1,
        },
      ],
    });
  }

  if (scenario === "decisioned") {
    await createApplicationScore(pool, {
      orgId: org.id,
      applicationId,
      scoreType: "LEASE_SCORE",
      scoreValue: 82,
      maxScore: 100,
    });

    await makeDecision(pool, {
      orgId: org.id,
      applicationId,
      decidedById: org.id,
      outcome: "APPROVED",
      criteriaVersion: 1,
      structuredReasonCodes: { reasons: ["MEETS_INCOME", "NO_NEGATIVE_SCREENING"] },
      incomeData: {
        method: "GROSS_MONTHLY",
        verifiedMonthlyCents: 450000,
        passed: true,
        notes: "Demo income verified",
      },
      criminalData: {
        status: "CLEAR",
        notes: "No adverse findings",
      },
      notes: "Auto-approved demo decision",
    });
  }

  return {
    ok: true,
    orgId: org.id,
    propertyId,
    unitId,
    application: startResult.application,
    party: startResult.party,
    draftSession: startResult.draftSession,
  };
}
