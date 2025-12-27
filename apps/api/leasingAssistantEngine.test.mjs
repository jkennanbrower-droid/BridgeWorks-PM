import test from "node:test";
import assert from "node:assert/strict";

import { computeAssistantPlan } from "./leasingAssistantEngine.mjs";

test("assistant plan selects document action when docs missing", () => {
  const plan = computeAssistantPlan({
    snapshot: {
      application: { status: "SUBMITTED", applicationFeeStatus: "SUCCEEDED" },
      parties: [{ id: "p1", status: "COMPLETE" }],
      requirements: [
        { id: "r1", requirementType: "DOCUMENT", status: "PENDING", isRequired: true, name: "ID" },
      ],
      payments: [{ id: "pay", status: "SUCCEEDED" }],
      reservations: [],
      infoRequests: [],
    },
    now: "2025-01-01T00:00:00.000Z",
  });

  assert.equal(plan.nextAction.key, "COLLECT_DOCUMENTS");
  assert.ok(plan.recommendations.some((rec) => rec.actionKey === "REQUEST_MISSING_DOCS"));
});

test("assistant plan waits on applicant when needs info", () => {
  const plan = computeAssistantPlan({
    snapshot: {
      application: { status: "NEEDS_INFO", applicationFeeStatus: "SUCCEEDED" },
      parties: [{ id: "p1", status: "COMPLETE" }],
      requirements: [],
      payments: [{ id: "pay", status: "SUCCEEDED" }],
      reservations: [],
      infoRequests: [{ id: "info", status: "OPEN" }],
    },
    now: "2025-01-01T00:00:00.000Z",
  });

  assert.equal(plan.nextAction.key, "WAITING_ON_APPLICANT");
});

test("assistant plan recommends payment retry when unpaid", () => {
  const plan = computeAssistantPlan({
    snapshot: {
      application: { status: "SUBMITTED", applicationFeeStatus: "PENDING" },
      parties: [{ id: "p1", status: "COMPLETE" }],
      requirements: [],
      payments: [{ id: "pay", status: "FAILED" }],
      reservations: [],
      infoRequests: [],
    },
    now: "2025-01-01T00:00:00.000Z",
  });

  assert.ok(plan.recommendations.some((rec) => rec.actionKey === "RETRY_PAYMENT"));
});
