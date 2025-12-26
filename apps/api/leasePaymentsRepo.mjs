import crypto from "node:crypto";

import { getPaymentsAdapter } from "./paymentsAdapter.mjs";

const paymentsAdapter = getPaymentsAdapter();

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

function mapPaymentIntent(row) {
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id,
    paymentType: row.payment_type,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    provider: row.provider,
    providerReference: row.provider_reference ?? null,
    providerClientSecret: row.provider_client_secret ?? null,
    attemptsCount: row.attempts_count ?? 0,
    lastFailureCode: row.last_failure_code ?? null,
    lastFailureMessage: row.last_failure_message ?? null,
    lastFailureAt: toIso(row.last_failure_at),
    paidAt: toIso(row.paid_at),
    failedAt: toIso(row.failed_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapPaymentAttempt(row) {
  return {
    id: row.id,
    paymentIntentId: row.payment_intent_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference ?? null,
    failureCode: row.failure_code ?? null,
    failureMessage: row.failure_message ?? null,
    requestPayload: row.request_payload ?? null,
    responsePayload: row.response_payload ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function loadApplication(db, { orgId, applicationId }) {
  const result = await db.query(
    `
      SELECT id, org_id, status, application_fee_status
      FROM "lease_applications"
      WHERE id = $1 AND org_id = $2
      LIMIT 1
      FOR UPDATE
    `,
    [applicationId, orgId],
  );
  return result.rows[0] ?? null;
}

async function loadLatestPaymentIntent(db, { applicationId }) {
  const result = await db.query(
    `
      SELECT *
      FROM "payment_intents"
      WHERE application_id = $1
        AND payment_type = 'APPLICATION_FEE'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [applicationId],
  );
  return result.rows[0] ?? null;
}

async function loadLatestAttempt(db, paymentIntentId) {
  const result = await db.query(
    `
      SELECT *
      FROM "payment_intent_attempts"
      WHERE payment_intent_id = $1
      ORDER BY attempt_number DESC
      LIMIT 1
      FOR UPDATE
    `,
    [paymentIntentId],
  );
  return result.rows[0] ?? null;
}

export async function createApplicationFeeIntent(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Invalid amountCents.");
  }

  const currency = String(input.currency || "USD").toUpperCase();

  return await withTx(pool, async (db) => {
    const application = await loadApplication(db, { orgId, applicationId });
    if (!application) return { ok: false, errorCode: "NOT_FOUND" };
    if (application.status !== "SUBMITTED") {
      return { ok: false, errorCode: "NOT_SUBMITTED", status: application.status };
    }

    const existing = await loadLatestPaymentIntent(db, { applicationId });
    if (existing?.status === "SUCCEEDED") {
      return { ok: true, alreadyPaid: true, paymentIntent: mapPaymentIntent(existing) };
    }

    if (existing && ["REQUIRES_ACTION", "PROCESSING"].includes(existing.status)) {
      return {
        ok: true,
        paymentIntent: mapPaymentIntent(existing),
        clientSecret: existing.provider_client_secret ?? null,
      };
    }

    const adapterResult = await paymentsAdapter.createIntent({
      amountCents,
      currency,
      metadata: input.metadata ?? null,
    });

    const now = new Date();
    const attemptNumber = (existing?.attempts_count ?? 0) + 1;
    const provider = adapterResult.provider;
    const providerReference = adapterResult.providerReference ?? null;
    const providerClientSecret = adapterResult.clientSecret ?? null;
    const status = adapterResult.status;

    let paymentIntentRow = existing;

    if (!paymentIntentRow) {
      const insert = await db.query(
        `
          INSERT INTO "payment_intents" (
            id,
            org_id,
            application_id,
            payment_type,
            status,
            amount_cents,
            currency,
            provider,
            provider_reference,
            provider_client_secret,
            attempts_count,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'APPLICATION_FEE', $4, $5, $6, $7, $8, $9, $10, $11, $11)
          RETURNING *
        `,
        [
          crypto.randomUUID(),
          orgId,
          applicationId,
          status,
          amountCents,
          currency,
          provider,
          providerReference,
          providerClientSecret,
          attemptNumber,
          now,
        ],
      );
      paymentIntentRow = insert.rows[0];
    } else {
      const update = await db.query(
        `
          UPDATE "payment_intents"
          SET status = $1,
              amount_cents = $2,
              currency = $3,
              provider = $4,
              provider_reference = $5,
              provider_client_secret = $6,
              attempts_count = $7,
              last_failure_code = NULL,
              last_failure_message = NULL,
              last_failure_at = NULL,
              updated_at = $8
          WHERE id = $9
          RETURNING *
        `,
        [
          status,
          amountCents,
          currency,
          provider,
          providerReference,
          providerClientSecret,
          attemptNumber,
          now,
          paymentIntentRow.id,
        ],
      );
      paymentIntentRow = update.rows[0];
    }

    await db.query(
      `
        INSERT INTO "payment_intent_attempts" (
          id,
          payment_intent_id,
          attempt_number,
          status,
          provider,
          provider_reference,
          request_payload,
          response_payload,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      `,
      [
        crypto.randomUUID(),
        paymentIntentRow.id,
        attemptNumber,
        status,
        provider,
        providerReference,
        { amountCents, currency, metadata: input.metadata ?? null },
        adapterResult.response ?? null,
        now,
      ],
    );

    await db.query(
      `
        UPDATE "lease_applications"
        SET application_fee_status = 'PENDING',
            updated_at = $1
        WHERE id = $2
      `,
      [now, applicationId],
    );

    return {
      ok: true,
      paymentIntent: mapPaymentIntent(paymentIntentRow),
      clientSecret: providerClientSecret,
    };
  });
}

export async function confirmApplicationFeePayment(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const application = await loadApplication(db, { orgId, applicationId });
    if (!application) return { ok: false, errorCode: "NOT_FOUND" };
    if (application.status !== "SUBMITTED") {
      return { ok: false, errorCode: "NOT_SUBMITTED", status: application.status };
    }

    const paymentIntentRow = await loadLatestPaymentIntent(db, { applicationId });
    if (!paymentIntentRow) return { ok: false, errorCode: "NO_PAYMENT_INTENT" };

    if (paymentIntentRow.status === "SUCCEEDED") {
      return { ok: true, alreadyPaid: true, paymentIntent: mapPaymentIntent(paymentIntentRow) };
    }

    const attemptRow = await loadLatestAttempt(db, paymentIntentRow.id);
    if (!attemptRow) return { ok: false, errorCode: "NO_PAYMENT_ATTEMPT" };

    const adapterResult = await paymentsAdapter.confirmIntent({
      providerReference: paymentIntentRow.provider_reference,
      confirmation: input.confirmation ?? {},
    });

    const now = new Date();
    const status = adapterResult.status;
    const failureCode = adapterResult.failureCode ?? null;
    const failureMessage = adapterResult.failureMessage ?? null;
    const lastFailureAt = status === "FAILED" ? now : null;

    await db.query(
      `
        UPDATE "payment_intent_attempts"
        SET status = $1,
            failure_code = $2,
            failure_message = $3,
            response_payload = $4,
            updated_at = $5
        WHERE id = $6
      `,
      [
        status,
        failureCode,
        failureMessage,
        adapterResult.response ?? null,
        now,
        attemptRow.id,
      ],
    );

    const paidAt = status === "SUCCEEDED" ? now : null;
    const failedAt = status === "FAILED" ? now : null;
    const failureReason = status === "FAILED" ? failureMessage : null;

    const updatedIntent = await db.query(
      `
        UPDATE "payment_intents"
        SET status = $1,
            paid_at = $2,
            failed_at = $3,
            failure_reason = $4,
            last_failure_code = $5,
            last_failure_message = $6,
            last_failure_at = $7,
            updated_at = $8
        WHERE id = $9
        RETURNING *
      `,
      [
        status,
        paidAt,
        failedAt,
        failureReason,
        failureCode,
        failureMessage,
        lastFailureAt,
        now,
        paymentIntentRow.id,
      ],
    );

    const feeStatus = status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED";
    await db.query(
      `
        UPDATE "lease_applications"
        SET application_fee_status = $1,
            updated_at = $2
        WHERE id = $3
      `,
      [feeStatus, now, applicationId],
    );

    const response = {
      ok: status === "SUCCEEDED",
      paymentIntent: mapPaymentIntent(updatedIntent.rows[0]),
      attempt: mapPaymentAttempt({
        ...attemptRow,
        status,
        failure_code: failureCode,
        failure_message: failureMessage,
        response_payload: adapterResult.response ?? null,
        updated_at: now,
      }),
    };

    if (status === "FAILED") {
      response.errorCode = "PAYMENT_FAILED";
    }

    return response;
  });
}

export async function listApplicationFeePaymentAttempts(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const result = await pool.query(
    `
      SELECT a.*
      FROM "payment_intent_attempts" a
      JOIN "payment_intents" p ON p.id = a.payment_intent_id
      JOIN "lease_applications" l ON l.id = p.application_id
      WHERE l.org_id = $1
        AND l.id = $2
        AND p.payment_type = 'APPLICATION_FEE'
      ORDER BY a.attempt_number ASC
    `,
    [orgId, applicationId],
  );

  return result.rows.map(mapPaymentAttempt);
}
