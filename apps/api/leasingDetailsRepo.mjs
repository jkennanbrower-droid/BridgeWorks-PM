import crypto from "node:crypto";

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapApplication(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    propertyId: row.property_id,
    unitId: row.unit_id ?? null,
    status: row.status,
    applicationType: row.application_type,
    priority: row.priority,
    screeningDepth: row.screening_depth,
    relocationStatus: row.relocation_status ?? null,
    desiredMoveInDate: row.desired_move_in_date ? String(row.desired_move_in_date) : null,
    desiredLeaseTermMonths: row.desired_lease_term_months ?? null,
    duplicateCheckHash: row.duplicate_check_hash ?? null,
    applicationFeeStatus: row.application_fee_status ?? null,
    submittedAt: toIso(row.submitted_at),
    expiresAt: toIso(row.expires_at),
    withdrawnAt: toIso(row.withdrawn_at),
    withdrawnReasonCode: row.withdrawn_reason_code ?? null,
    withdrawnReason: row.withdrawn_reason ?? null,
    decisionedAt: toIso(row.decisioned_at),
    closedAt: toIso(row.closed_at),
    closedReason: row.closed_reason ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapParty(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    role: row.role,
    status: row.status,
    email: row.email,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    phone: row.phone ?? null,
    inviteToken: row.invite_token ?? null,
    inviteSentAt: toIso(row.invite_sent_at),
    joinedAt: toIso(row.joined_at),
    completedAt: toIso(row.completed_at),
    abandonedAt: toIso(row.abandoned_at),
    abandonedReasonCode: row.abandoned_reason_code ?? null,
    reminderCount: row.reminder_count ?? 0,
    lastReminderAt: toIso(row.last_reminder_at),
    screeningConsentAt: toIso(row.screening_consent_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapReservation(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id,
    unitId: row.unit_id,
    kind: row.kind,
    status: row.status,
    expiresAt: toIso(row.expires_at),
    releasedAt: toIso(row.released_at),
    releaseReasonCode: row.release_reason_code ?? null,
    releasedReason: row.released_reason ?? null,
    convertedAt: toIso(row.converted_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapRequirement(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    partyId: row.party_id ?? null,
    infoRequestId: row.info_request_id ?? null,
    requirementType: row.requirement_type,
    status: row.status,
    name: row.name,
    description: row.description ?? null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
    dueDate: toIso(row.due_date),
    completedAt: toIso(row.completed_at),
    waivedAt: toIso(row.waived_at),
    waivedById: row.waived_by_id ?? null,
    waivedReason: row.waived_reason ?? null,
    metadata: row.metadata ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapDocument(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    partyId: row.party_id,
    requirementItemId: row.requirement_item_id ?? null,
    documentType: row.document_type,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key,
    publicUrl: row.public_url ?? null,
    verificationStatus: row.verification_status,
    verifiedAt: toIso(row.verified_at),
    verifiedById: row.verified_by_id ?? null,
    rejectedAt: toIso(row.rejected_at),
    rejectedById: row.rejected_by_id ?? null,
    rejectedReason: row.rejected_reason ?? null,
    validFrom: toIso(row.valid_from),
    validUntil: toIso(row.valid_until),
    expiredAt: toIso(row.expired_at),
    uploadedAt: toIso(row.uploaded_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapPaymentIntent(row) {
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
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
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
    processedAt: toIso(row.processed_at),
    failedAt: toIso(row.failed_at),
    failureReason: row.failure_reason ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapDecision(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    version: row.version,
    criteriaVersion: row.criteria_version ?? null,
    outcome: row.outcome,
    decisionDate: toIso(row.decision_date),
    decidedById: row.decided_by_id,
    reasonCodes: row.reason_codes ?? null,
    incomeCalculationMethod: row.income_calculation_method ?? null,
    incomeVerifiedMonthlyCents: row.income_verified_monthly_cents ?? null,
    incomeVerifiedAnnualCents: row.income_verified_annual_cents ?? null,
    incomePassed: row.income_passed ?? null,
    incomeNotes: row.income_notes ?? null,
    criminalReviewStatus: row.criminal_review_status ?? null,
    criminalRecordSummary: row.criminal_record_summary ?? null,
    criminalReviewNotes: row.criminal_review_notes ?? null,
    criminalReviewedAt: toIso(row.criminal_reviewed_at),
    criminalReviewedById: row.criminal_reviewed_by_id ?? null,
    conditions: row.conditions ?? null,
    notes: row.notes ?? null,
    riskAssessmentId: row.risk_assessment_id ?? null,
    overrideRequestId: row.override_request_id ?? null,
    isOverride: row.is_override,
    previousDecisionId: row.previous_decision_id ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapScore(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    scoreType: row.score_type,
    scoreValue: row.score_value,
    maxScore: row.max_score ?? null,
    factors: row.factors ?? null,
    calculatedAt: toIso(row.calculated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapOverride(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id,
    requestedById: row.requested_by_id,
    requestType: row.request_type,
    status: row.status,
    originalOutcome: row.original_outcome ?? null,
    requestedOutcome: row.requested_outcome ?? null,
    originalPriority: row.original_priority ?? null,
    requestedPriority: row.requested_priority ?? null,
    justification: row.justification ?? null,
    reviewedById: row.reviewed_by_id ?? null,
    reviewedAt: toIso(row.reviewed_at),
    reviewNotes: row.review_notes ?? null,
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapAuditEvent(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id ?? null,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorType: row.actor_type,
    targetType: row.target_type ?? null,
    targetId: row.target_id ?? null,
    metadata: row.metadata ?? null,
    createdAt: toIso(row.created_at),
  };
}

function mapInfoRequest(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    applicationId: row.application_id,
    partyId: row.party_id ?? null,
    status: row.status,
    message: row.message ?? null,
    requestedItems: row.requested_items ?? null,
    unlockScopes: row.unlock_scopes ?? null,
    respondedAt: toIso(row.responded_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function insertAuditEvent(db, input) {
  const actorId = input.actorId ?? input.orgId;
  const actorType = input.actorId ? "person" : "system";
  await db.query(
    `
      INSERT INTO "lease_audit_events" (
        id,
        org_id,
        application_id,
        event_type,
        actor_id,
        actor_type,
        target_type,
        target_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      crypto.randomUUID(),
      input.orgId,
      input.applicationId ?? null,
      input.eventType,
      actorId,
      actorType,
      input.targetType ?? "lease_application",
      input.targetId ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
    ],
  );
}

export async function listRequirements(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const requirementsResult = await pool.query(
    `
      SELECT r.*
      FROM "requirement_items" r
      JOIN "lease_applications" a ON a.id = r.application_id
      WHERE a.org_id = $1 AND r.application_id = $2
      ORDER BY r.sort_order ASC, r.created_at ASC
    `,
    [orgId, applicationId],
  );

  const requirementIds = requirementsResult.rows.map((row) => row.id);

  const documentsResult = requirementIds.length
    ? await pool.query(
        `
          SELECT *
          FROM "documents"
          WHERE requirement_item_id = ANY($1::uuid[])
        `,
        [requirementIds],
      )
    : { rows: [] };

  const documentsByRequirement = new Map();
  for (const doc of documentsResult.rows) {
    const list = documentsByRequirement.get(doc.requirement_item_id) ?? [];
    list.push(mapDocument(doc));
    documentsByRequirement.set(doc.requirement_item_id, list);
  }

  return {
    ok: true,
    requirements: requirementsResult.rows.map((row) => ({
      ...mapRequirement(row),
      documents: documentsByRequirement.get(row.id) ?? [],
    })),
  };
}

export async function listInfoRequests(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const result = await pool.query(
    `
      SELECT ir.*
      FROM "info_requests" ir
      JOIN "lease_applications" a ON a.id = ir.application_id
      WHERE a.org_id = $1 AND ir.application_id = $2
      ORDER BY ir.created_at DESC
    `,
    [orgId, applicationId],
  );

  return { ok: true, infoRequests: result.rows.map(mapInfoRequest) };
}

export async function getApplicationDetail(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  const applicationResult = await pool.query(
    `
      SELECT *
      FROM "lease_applications"
      WHERE id = $1 AND org_id = $2
      LIMIT 1
    `,
    [applicationId, orgId],
  );

  if (applicationResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

  if (input.actorId) {
    const now = new Date();
    await insertAuditEvent(pool, {
      orgId,
      applicationId,
      eventType: "APPLICATION_VIEWED",
      targetId: applicationId,
      actorId: input.actorId,
      createdAt: now,
      metadata: { source: input.source ?? "staff_ui" },
    });
  }

  const partiesResult = await pool.query(
    `SELECT * FROM "application_parties" WHERE application_id = $1 ORDER BY created_at ASC`,
    [applicationId],
  );

  const reservationsResult = await pool.query(
    `SELECT * FROM "unit_reservations" WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  );

  const paymentsResult = await pool.query(
    `SELECT * FROM "payment_intents" WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  );

  const paymentIntentIds = paymentsResult.rows.map((row) => row.id);

  const attemptsResult = paymentIntentIds.length
    ? await pool.query(
        `SELECT * FROM "payment_intent_attempts" WHERE payment_intent_id = ANY($1::uuid[]) ORDER BY attempt_number ASC`,
        [paymentIntentIds],
      )
    : { rows: [] };

  const refundsResult = paymentIntentIds.length
    ? await pool.query(
        `SELECT * FROM "refund_requests" WHERE payment_intent_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
        [paymentIntentIds],
      )
    : { rows: [] };

  const decisionsResult = await pool.query(
    `SELECT * FROM "decision_records" WHERE application_id = $1 ORDER BY decision_date DESC NULLS LAST, created_at DESC`,
    [applicationId],
  );

  const scoresResult = await pool.query(
    `SELECT * FROM "application_scores" WHERE application_id = $1 ORDER BY calculated_at DESC, created_at DESC`,
    [applicationId],
  );

  const overridesResult = await pool.query(
    `SELECT * FROM "override_requests" WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  );

  const auditResult = await pool.query(
    `SELECT * FROM "lease_audit_events" WHERE application_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [applicationId],
  );

  const requirements = await listRequirements(pool, { orgId, applicationId });
  const infoRequests = await listInfoRequests(pool, { orgId, applicationId });

  const attemptsByIntent = new Map();
  for (const attempt of attemptsResult.rows) {
    const list = attemptsByIntent.get(attempt.payment_intent_id) ?? [];
    list.push(mapPaymentAttempt(attempt));
    attemptsByIntent.set(attempt.payment_intent_id, list);
  }

  const refundsByIntent = new Map();
  for (const refund of refundsResult.rows) {
    const list = refundsByIntent.get(refund.payment_intent_id) ?? [];
    list.push(mapRefundRequest(refund));
    refundsByIntent.set(refund.payment_intent_id, list);
  }

  return {
    ok: true,
    application: mapApplication(applicationResult.rows[0]),
    parties: partiesResult.rows.map(mapParty),
    reservations: reservationsResult.rows.map(mapReservation),
    requirements: requirements.requirements ?? [],
    infoRequests: infoRequests.infoRequests ?? [],
    payments: paymentsResult.rows.map((row) => ({
      ...mapPaymentIntent(row),
      attempts: attemptsByIntent.get(row.id) ?? [],
      refundRequests: refundsByIntent.get(row.id) ?? [],
    })),
    decisions: decisionsResult.rows.map(mapDecision),
    scores: scoresResult.rows.map(mapScore),
    overrideRequests: overridesResult.rows.map(mapOverride),
    auditEvents: auditResult.rows.map(mapAuditEvent),
  };
}
