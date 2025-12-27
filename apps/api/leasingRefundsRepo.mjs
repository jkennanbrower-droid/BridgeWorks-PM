import crypto from "node:crypto";

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function evaluateRefundEligibility({ paymentIntent, policy, asOfDate }) {
  if (!policy) {
    return {
      eligible: false,
      decisionReasonCode: "NO_POLICY",
      policyVersion: null,
      policyId: null,
      eligibleAmountCents: null,
    };
  }

  if (!policy.isActive) {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_INACTIVE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (
    policy.effectiveAt.getTime() > asOfDate.getTime() ||
    (policy.expiredAt && policy.expiredAt.getTime() <= asOfDate.getTime())
  ) {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_NOT_EFFECTIVE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (paymentIntent.status !== "SUCCEEDED") {
    return {
      eligible: false,
      decisionReasonCode: "PAYMENT_NOT_SUCCEEDED",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (!paymentIntent.paidAt) {
    return {
      eligible: false,
      decisionReasonCode: "PAYMENT_NOT_PAID",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (policy.refundWindowHours !== null) {
    const msSincePaid = asOfDate.getTime() - paymentIntent.paidAt.getTime();
    const maxMs = policy.refundWindowHours * 60 * 60 * 1000;
    if (msSincePaid > maxMs) {
      return {
        eligible: false,
        decisionReasonCode: "OUTSIDE_REFUND_WINDOW",
        policyVersion: policy.version,
        policyId: policy.id,
        eligibleAmountCents: null,
      };
    }
  }

  if (policy.policyType === "NO_REFUND") {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_NO_REFUND",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (policy.policyType === "FULL_REFUND") {
    return {
      eligible: true,
      decisionReasonCode: "ELIGIBLE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: paymentIntent.amountCents,
    };
  }

  if (policy.policyType === "PARTIAL_REFUND" || policy.policyType === "TIME_BASED") {
    if (policy.refundPercentage === null) {
      return {
        eligible: false,
        decisionReasonCode: "MISSING_REFUND_PERCENTAGE",
        policyVersion: policy.version,
        policyId: policy.id,
        eligibleAmountCents: null,
      };
    }
    const eligibleAmountCents = Math.floor(
      (paymentIntent.amountCents * policy.refundPercentage) / 100,
    );
    return {
      eligible: eligibleAmountCents > 0,
      decisionReasonCode: eligibleAmountCents > 0 ? "ELIGIBLE" : "MISSING_REFUND_PERCENTAGE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: eligibleAmountCents > 0 ? eligibleAmountCents : null,
    };
  }

  return {
    eligible: false,
    decisionReasonCode: "NO_POLICY",
    policyVersion: policy.version,
    policyId: policy.id,
    eligibleAmountCents: null,
  };
}

function pickActiveRefundPolicy(policies, { jurisdictionCode, paymentType, asOfDate }) {
  const active = policies.filter((p) =>
    p.isActive &&
    p.effectiveAt.getTime() <= asOfDate.getTime() &&
    (!p.expiredAt || p.expiredAt.getTime() > asOfDate.getTime()),
  );
  if (active.length === 0) return null;

  const scored = active
    .filter((p) => {
      if (jurisdictionCode && p.jurisdictionCode !== null) {
        return p.jurisdictionCode === jurisdictionCode;
      }
      return true;
    })
    .sort((left, right) => {
      const leftJurisdictionMatch =
        jurisdictionCode && left.jurisdictionCode === jurisdictionCode ? 2 : 0;
      const rightJurisdictionMatch =
        jurisdictionCode && right.jurisdictionCode === jurisdictionCode ? 2 : 0;
      const leftJurisdictionFallback = left.jurisdictionCode === null ? 1 : 0;
      const rightJurisdictionFallback = right.jurisdictionCode === null ? 1 : 0;
      const leftJurisdictionScore = leftJurisdictionMatch + leftJurisdictionFallback;
      const rightJurisdictionScore = rightJurisdictionMatch + rightJurisdictionFallback;
      if (leftJurisdictionScore !== rightJurisdictionScore) {
        return rightJurisdictionScore - leftJurisdictionScore;
      }

      const leftPaymentMatch = paymentType && left.paymentType === paymentType ? 2 : 0;
      const rightPaymentMatch = paymentType && right.paymentType === paymentType ? 2 : 0;
      const leftPaymentFallback = left.paymentType === null ? 1 : 0;
      const rightPaymentFallback = right.paymentType === null ? 1 : 0;
      const leftPaymentScore = leftPaymentMatch + leftPaymentFallback;
      const rightPaymentScore = rightPaymentMatch + rightPaymentFallback;
      if (leftPaymentScore !== rightPaymentScore) {
        return rightPaymentScore - leftPaymentScore;
      }

      if (left.version !== right.version) return right.version - left.version;
      const leftEffective = left.effectiveAt.getTime();
      const rightEffective = right.effectiveAt.getTime();
      if (leftEffective !== rightEffective) return rightEffective - leftEffective;
      return String(left.id).localeCompare(String(right.id));
    });

  return scored[0] ?? null;
}

async function withTx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw e;
  } finally {
    client.release();
  }
}

function mapRefundRequest(row) {
  return {
    id: row.id,
    paymentIntentId: row.payment_intent_id,
    status: row.status,
    policyId: row.policy_id ?? null,
    policyVersion: row.policy_version ?? null,
    decisionReasonCode: row.decision_reason_code ?? null,
    eligibleAmountCents: row.eligible_amount_cents ?? null,
    requestedAmountCents: row.requested_amount_cents,
    approvedAmountCents: row.approved_amount_cents ?? null,
    reason: row.reason,
    requestedById: row.requested_by_id,
    reviewedById: row.reviewed_by_id ?? null,
    reviewedAt: toIso(row.reviewed_at),
    reviewNotes: row.review_notes ?? null,
    stripeRefundId: row.stripe_refund_id ?? null,
    processedAt: toIso(row.processed_at),
    failedAt: toIso(row.failed_at),
    failureReason: row.failure_reason ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function loadRefundPolicies(db, { orgId, jurisdictionCode, paymentType, asOfDate }) {
  const params = [orgId, asOfDate];
  let clause = "";

  if (jurisdictionCode) {
    params.push(jurisdictionCode);
    clause += ` AND (jurisdiction_code = $${params.length} OR jurisdiction_code IS NULL)`;
  }

  if (paymentType) {
    params.push(paymentType);
    clause += ` AND (payment_type = $${params.length} OR payment_type IS NULL)`;
  }

  const result = await db.query(
    `
      SELECT
        id,
        version,
        org_id,
        policy_type,
        jurisdiction_code,
        payment_type,
        refund_percentage,
        refund_window_hours,
        conditions,
        is_active,
        effective_at,
        expired_at
      FROM "refund_policies"
      WHERE org_id = $1
        AND effective_at <= $2
        AND (expired_at IS NULL OR expired_at > $2)
        ${clause}
    `,
    params,
  );

  return result.rows.map((row) => ({
    id: row.id,
    version: row.version,
    orgId: row.org_id,
    policyType: row.policy_type,
    jurisdictionCode: row.jurisdiction_code ?? null,
    paymentType: row.payment_type ?? null,
    refundPercentage: row.refund_percentage ?? null,
    refundWindowHours: row.refund_window_hours ?? null,
    conditions: row.conditions ?? null,
    isActive: row.is_active,
    effectiveAt: row.effective_at,
    expiredAt: row.expired_at ?? null,
  }));
}

export async function evaluateRefundForPayment(db, input) {
  const now = input.asOfDate ?? new Date();
  const policies = await loadRefundPolicies(db, {
    orgId: input.orgId,
    jurisdictionCode: input.jurisdictionCode ?? null,
    paymentType: input.paymentType ?? null,
    asOfDate: now,
  });

  const policy = pickActiveRefundPolicy(policies, {
    jurisdictionCode: input.jurisdictionCode ?? null,
    paymentType: input.paymentType ?? null,
    asOfDate: now,
  });

  return evaluateRefundEligibility({
    paymentIntent: input.paymentIntent,
    policy,
    asOfDate: now,
  });
}

export async function createRefundRequestWithDecision(db, input) {
  const now = input.asOfDate ?? new Date();
  const requestedAmountCents =
    input.requestedAmountCents ?? input.decision.eligibleAmountCents ?? 0;

  const insert = await db.query(
    `
      INSERT INTO "refund_requests" (
        id,
        payment_intent_id,
        status,
        policy_id,
        policy_version,
        decision_reason_code,
        eligible_amount_cents,
        requested_amount_cents,
        reason,
        requested_by_id,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $10
      )
      RETURNING *
    `,
    [
      crypto.randomUUID(),
      input.paymentIntentId,
      input.decision.policyId,
      input.decision.policyVersion,
      input.decision.decisionReasonCode,
      input.decision.eligibleAmountCents,
      requestedAmountCents,
      input.reason ?? "Refund requested",
      input.requestedById,
      now,
    ],
  );

  return mapRefundRequest(insert.rows[0]);
}

export async function createRefundRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const paymentIntentId = String(input.paymentIntentId || "").trim();
  const requestedById = String(input.requestedById || "").trim();
  if (!orgId || !paymentIntentId || !requestedById) {
    throw new Error("Missing orgId, paymentIntentId, or requestedById.");
  }

  return await withTx(pool, async (db) => {
    const paymentResult = await db.query(
      `
        SELECT id, org_id, status, payment_type, amount_cents, paid_at, refund_policy_id
        FROM "payment_intents"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [paymentIntentId, orgId],
    );

    if (paymentResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const payment = paymentResult.rows[0];

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const decision = await evaluateRefundForPayment(db, {
      orgId,
      jurisdictionCode: input.jurisdictionCode ?? null,
      paymentType: payment.payment_type,
      asOfDate: now,
      paymentIntent: {
        paymentType: payment.payment_type,
        status: payment.status,
        amountCents: payment.amount_cents,
        paidAt: payment.paid_at ?? null,
      },
    });

    if (!decision.eligible) {
      return {
        ok: false,
        errorCode: "NOT_ELIGIBLE",
        decision,
      };
    }

    const requestedAmountCents =
      input.requestedAmountCents ?? decision.eligibleAmountCents ?? 0;

    const insert = await db.query(
      `
        INSERT INTO "refund_requests" (
          id,
          payment_intent_id,
          status,
          policy_id,
          policy_version,
          decision_reason_code,
          eligible_amount_cents,
          requested_amount_cents,
          reason,
          requested_by_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $10
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        paymentIntentId,
        decision.policyId,
        decision.policyVersion,
        decision.decisionReasonCode,
        decision.eligibleAmountCents,
        requestedAmountCents,
        input.reason ?? "Refund requested",
        requestedById,
        now,
      ],
    );

    return { ok: true, refundRequest: mapRefundRequest(insert.rows[0]), decision };
  });
}

export async function reviewRefundRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const refundRequestId = String(input.refundRequestId || "").trim();
  const reviewerId = String(input.reviewerId || "").trim();
  const status = String(input.status || "").trim();
  if (!orgId || !refundRequestId || !reviewerId || !status) {
    throw new Error("Missing orgId, refundRequestId, reviewerId, or status.");
  }

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT rr.*
        FROM "refund_requests" rr
        JOIN "payment_intents" pi ON pi.id = rr.payment_intent_id
        WHERE rr.id = $1 AND pi.org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [refundRequestId, orgId],
    );

    if (existing.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const request = existing.rows[0];

    if (request.status !== "PENDING") {
      return { ok: false, errorCode: "INVALID_STATUS", status: request.status };
    }

    if (!["APPROVED", "DENIED"].includes(status)) {
      return { ok: false, errorCode: "INVALID_STATUS_VALUE" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const approvedAmountCents =
      status === "APPROVED"
        ? input.approvedAmountCents ?? request.eligible_amount_cents ?? request.requested_amount_cents
        : null;

    const updated = await db.query(
      `
        UPDATE "refund_requests"
        SET status = $1::"refund_request_status",
            approved_amount_cents = $2,
            reviewed_by_id = $3,
            reviewed_at = $4,
            review_notes = $5,
            updated_at = $4
        WHERE id = $6
        RETURNING *
      `,
      [
        status,
        approvedAmountCents,
        reviewerId,
        now,
        input.reviewNotes ?? null,
        refundRequestId,
      ],
    );

    return { ok: true, refundRequest: mapRefundRequest(updated.rows[0]) };
  });
}

export async function processRefundRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const refundRequestId = String(input.refundRequestId || "").trim();
  if (!orgId || !refundRequestId) {
    throw new Error("Missing orgId or refundRequestId.");
  }

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT rr.*
        FROM "refund_requests" rr
        JOIN "payment_intents" pi ON pi.id = rr.payment_intent_id
        WHERE rr.id = $1 AND pi.org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [refundRequestId, orgId],
    );

    if (existing.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const request = existing.rows[0];

    if (request.status !== "APPROVED") {
      return { ok: false, errorCode: "INVALID_STATUS", status: request.status };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const updated = await db.query(
      `
        UPDATE "refund_requests"
        SET status = 'PROCESSED',
            processed_at = $1,
            stripe_refund_id = $2,
            updated_at = $1
        WHERE id = $3
        RETURNING *
      `,
      [now, input.providerRefundId ?? null, refundRequestId],
    );

    return { ok: true, refundRequest: mapRefundRequest(updated.rows[0]) };
  });
}

export async function failRefundRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const refundRequestId = String(input.refundRequestId || "").trim();
  if (!orgId || !refundRequestId) {
    throw new Error("Missing orgId or refundRequestId.");
  }

  return await withTx(pool, async (db) => {
    const existing = await db.query(
      `
        SELECT rr.*
        FROM "refund_requests" rr
        JOIN "payment_intents" pi ON pi.id = rr.payment_intent_id
        WHERE rr.id = $1 AND pi.org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [refundRequestId, orgId],
    );

    if (existing.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const updated = await db.query(
      `
        UPDATE "refund_requests"
        SET status = 'FAILED',
            failed_at = $1,
            failure_reason = $2,
            updated_at = $1
        WHERE id = $3
        RETURNING *
      `,
      [now, input.failureReason ?? null, refundRequestId],
    );

    return { ok: true, refundRequest: mapRefundRequest(updated.rows[0]) };
  });
}

export async function listRefundRequests(pool, input) {
  const orgId = String(input.orgId || "").trim();
  if (!orgId) throw new Error("Missing orgId.");

  const status = input.status ? String(input.status) : null;
  const params = [orgId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `AND rr.status = $${params.length}::"refund_request_status"`;
  }

  const result = await pool.query(
    `
      SELECT rr.*
      FROM "refund_requests" rr
      JOIN "payment_intents" pi ON pi.id = rr.payment_intent_id
      WHERE pi.org_id = $1
      ${statusClause}
      ORDER BY rr.created_at DESC
    `,
    params,
  );

  return { ok: true, refundRequests: result.rows.map(mapRefundRequest) };
}
