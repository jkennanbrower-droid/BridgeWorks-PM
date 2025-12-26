import test from "node:test";
import assert from "node:assert/strict";

import { evaluateRefundEligibility } from "./evaluators";
import { pickActiveRefundPolicy } from "./refundPolicy";
import { pickEffectiveWorkflowConfig } from "./workflowConfig";
import type { RefundPolicySnapshot, WorkflowConfigSnapshot } from "./types";

test("property override wins over org + jurisdiction defaults", () => {
  const asOfDate = new Date("2025-01-01T00:00:00.000Z");

  const orgDefault: WorkflowConfigSnapshot = {
    id: "org-default-v1",
    orgId: "org-1",
    propertyId: null,
    jurisdictionCode: null,
    version: 1,
    config: { fastTrack: { enabled: false } },
    effectiveAt: new Date("2024-01-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const jurisdictionDefault: WorkflowConfigSnapshot = {
    id: "jurisdiction-default-v1",
    orgId: "org-1",
    propertyId: null,
    jurisdictionCode: "CA",
    version: 1,
    config: { fastTrack: { enabled: true, criteria: [{ id: "J1" }] } },
    effectiveAt: new Date("2024-01-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const propertyOverride: WorkflowConfigSnapshot = {
    id: "property-override-v2",
    orgId: "org-1",
    propertyId: "prop-1",
    jurisdictionCode: null,
    version: 2,
    config: { fastTrack: { enabled: true, criteria: [{ id: "P1" }] } },
    effectiveAt: new Date("2024-06-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const result = pickEffectiveWorkflowConfig(
    [orgDefault, jurisdictionDefault, propertyOverride],
    {
      propertyId: "prop-1",
      jurisdictionCode: "CA",
      asOfDate,
    },
  );

  assert.equal(result.source, "property");
  assert.equal(result.config?.id, "property-override-v2");
});

test("refund policy selection uses effectiveAt for versioned choice", () => {
  const base: Omit<
    RefundPolicySnapshot,
    "id" | "version" | "effectiveAt" | "expiredAt"
  > = {
    orgId: "org-1",
    policyType: "FULL_REFUND",
    jurisdictionCode: "CA",
    paymentType: "APPLICATION_FEE",
    refundPercentage: null,
    refundWindowHours: 48,
    conditions: null,
    isActive: true,
  };

  const v1: RefundPolicySnapshot = {
    ...base,
    id: "policy-v1",
    version: 1,
    effectiveAt: new Date("2025-01-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const v2: RefundPolicySnapshot = {
    ...base,
    id: "policy-v2",
    version: 2,
    effectiveAt: new Date("2025-06-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const asOfBeforeV2 = new Date("2025-05-31T23:59:59.000Z");
  const selectedBefore = pickActiveRefundPolicy([v1, v2], {
    jurisdictionCode: "CA",
    paymentType: "APPLICATION_FEE",
    asOfDate: asOfBeforeV2,
  });
  assert.equal(selectedBefore?.id, "policy-v1");
  assert.equal(selectedBefore?.version, 1);

  const asOfAfterV2 = new Date("2025-06-01T00:00:00.000Z");
  const selectedAfter = pickActiveRefundPolicy([v1, v2], {
    jurisdictionCode: "CA",
    paymentType: "APPLICATION_FEE",
    asOfDate: asOfAfterV2,
  });
  assert.equal(selectedAfter?.id, "policy-v2");
  assert.equal(selectedAfter?.version, 2);
});

test("refund eligibility evaluator is deterministic and reports policy version", () => {
  const asOfDate = new Date("2025-06-02T00:00:00.000Z");
  const paidAt = new Date("2025-06-01T12:00:00.000Z");

  const policy: RefundPolicySnapshot = {
    id: "policy-v2",
    orgId: "org-1",
    version: 2,
    policyType: "FULL_REFUND",
    jurisdictionCode: "CA",
    paymentType: "APPLICATION_FEE",
    refundPercentage: null,
    refundWindowHours: 48,
    conditions: null,
    isActive: true,
    effectiveAt: new Date("2025-06-01T00:00:00.000Z"),
    expiredAt: null,
  };

  const input = {
    paymentIntent: {
      paymentType: "APPLICATION_FEE" as const,
      status: "SUCCEEDED" as const,
      amountCents: 2500,
      paidAt,
    },
    policy,
    asOfDate,
  };

  const first = evaluateRefundEligibility(input);
  const second = evaluateRefundEligibility(input);

  assert.deepEqual(first, second);
  assert.equal(first.policyVersion, 2);
  assert.equal(first.policyId, "policy-v2");
  assert.equal(first.eligible, true);
});

