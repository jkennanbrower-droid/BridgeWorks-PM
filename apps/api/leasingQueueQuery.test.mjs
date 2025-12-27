import test from "node:test";
import assert from "node:assert/strict";

import { parseQueueQuery } from "./leasingQueueQuery.mjs";

test("queue query defaults page and pageSize", () => {
  const orgId = "2c8c2477-9f15-4e4b-bb2c-31e3e2b59f2f";
  const result = parseQueueQuery({ orgId });

  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 25);
  assert.equal(result.statuses?.length ?? 0, 0);
});

test("queue query parses multi filters", () => {
  const orgId = "2c8c2477-9f15-4e4b-bb2c-31e3e2b59f2f";
  const propertyIdA = "11db67e0-21c2-4ad0-a13d-1e23a97daae1";
  const propertyIdB = "22db67e0-21c2-4ad0-a13d-1e23a97daae2";

  const result = parseQueueQuery({
    orgId,
    propertyId: `${propertyIdA},${propertyIdB}`,
    unitType: "STUDIO,ONE_BED",
    status: "SUBMITTED,IN_REVIEW",
    priority: "PRIORITY,EMERGENCY",
    q: "test@example.com",
    page: "2",
    pageSize: "50",
    missingDocs: "1",
  });

  assert.deepEqual(result.propertyIds, [propertyIdA, propertyIdB]);
  assert.deepEqual(result.unitTypes, ["STUDIO", "ONE_BED"]);
  assert.deepEqual(result.statuses, ["SUBMITTED", "IN_REVIEW"]);
  assert.deepEqual(result.priorities, ["PRIORITY", "EMERGENCY"]);
  assert.equal(result.q, "test@example.com");
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 50);
  assert.equal(result.flags.missingDocs, true);
});

test("queue query clamps pageSize", () => {
  const orgId = "2c8c2477-9f15-4e4b-bb2c-31e3e2b59f2f";
  const result = parseQueueQuery({ orgId, pageSize: "200" });

  assert.equal(result.pageSize, 100);
});

test("queue query rejects invalid enums", () => {
  const orgId = "2c8c2477-9f15-4e4b-bb2c-31e3e2b59f2f";
  assert.throws(() => {
    parseQueueQuery({ orgId, status: "SUBMITTED,INVALID" });
  });
});
