import crypto from "node:crypto";

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveAlternatives(alternatives, relocationStatus) {
  if (!alternatives) return null;
  if (Array.isArray(alternatives)) return alternatives;
  if (isPlainObject(alternatives)) {
    if (relocationStatus && Object.prototype.hasOwnProperty.call(alternatives, relocationStatus)) {
      return alternatives[relocationStatus];
    }
    if (Object.prototype.hasOwnProperty.call(alternatives, "default")) {
      return alternatives.default;
    }
  }
  return alternatives;
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
    scanStatus: row.scan_status ?? null,
    scanResult: row.scan_result ?? null,
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

function pickEffectiveWorkflowConfig(configs, { propertyId, jurisdictionCode }) {
  const candidates = configs.filter((c) => {
    if (propertyId && c.property_id === propertyId) return true;
    return c.property_id === null;
  });

  if (propertyId) {
    const propertyScoped = candidates
      .filter((c) => c.property_id === propertyId)
      .sort((left, right) => {
        const leftJurisdictionMatch =
          jurisdictionCode && left.jurisdiction_code === jurisdictionCode ? 1 : 0;
        const rightJurisdictionMatch =
          jurisdictionCode && right.jurisdiction_code === jurisdictionCode ? 1 : 0;
        if (leftJurisdictionMatch !== rightJurisdictionMatch) {
          return rightJurisdictionMatch - leftJurisdictionMatch;
        }
        if (left.version !== right.version) return right.version - left.version;
        const leftEffective = new Date(left.effective_at).getTime();
        const rightEffective = new Date(right.effective_at).getTime();
        if (leftEffective !== rightEffective) return rightEffective - leftEffective;
        return String(left.id).localeCompare(String(right.id));
      });

    if (propertyScoped.length > 0) return propertyScoped[0];
  }

  const orgDefault = candidates
    .filter((c) => c.property_id === null && c.jurisdiction_code === null)
    .sort((left, right) => {
      if (left.version !== right.version) return right.version - left.version;
      const leftEffective = new Date(left.effective_at).getTime();
      const rightEffective = new Date(right.effective_at).getTime();
      if (leftEffective !== rightEffective) return rightEffective - leftEffective;
      return String(left.id).localeCompare(String(right.id));
    });
  if (orgDefault.length > 0) return orgDefault[0];

  if (jurisdictionCode) {
    const jurisdictionDefault = candidates
      .filter((c) => c.property_id === null && c.jurisdiction_code === jurisdictionCode)
      .sort((left, right) => {
        if (left.version !== right.version) return right.version - left.version;
        const leftEffective = new Date(left.effective_at).getTime();
        const rightEffective = new Date(right.effective_at).getTime();
        if (leftEffective !== rightEffective) return rightEffective - leftEffective;
        return String(left.id).localeCompare(String(right.id));
      });
    if (jurisdictionDefault.length > 0) return jurisdictionDefault[0];
  }

  return null;
}

async function loadEffectiveWorkflowConfig(pool, { orgId, propertyId, jurisdictionCode, asOfDate }) {
  const params = [orgId, asOfDate];
  let paramIndex = params.length;

  let propertyClause = "property_id IS NULL";
  if (propertyId) {
    params.push(propertyId);
    paramIndex += 1;
    propertyClause = `(property_id = $${paramIndex} OR property_id IS NULL)`;
  }

  let jurisdictionClause = "true";
  if (jurisdictionCode) {
    params.push(jurisdictionCode);
    paramIndex += 1;
    jurisdictionClause = `(jurisdiction_code = $${paramIndex} OR jurisdiction_code IS NULL)`;
  }

  const result = await pool.query(
    `
      SELECT id, org_id, property_id, jurisdiction_code, version, config, effective_at, expired_at
      FROM "workflow_configs"
      WHERE org_id = $1
        AND effective_at <= $2
        AND (expired_at IS NULL OR expired_at > $2)
        AND ${propertyClause}
        AND ${jurisdictionClause}
      ORDER BY version DESC, effective_at DESC, id ASC
    `,
    params,
  );

  return pickEffectiveWorkflowConfig(result.rows, { propertyId, jurisdictionCode });
}

export async function generateRequirementItems(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const applicationResult = await db.query(
      `
        SELECT id, org_id, property_id, relocation_status
        FROM "lease_applications"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [applicationId, orgId],
    );

    if (applicationResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const application = applicationResult.rows[0];

    const partiesResult = await db.query(
      `SELECT id, role FROM "application_parties" WHERE application_id = $1`,
      [applicationId],
    );
    const parties = partiesResult.rows.map((row) => ({ id: row.id, role: row.role }));

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const workflowConfig = await loadEffectiveWorkflowConfig(db, {
      orgId,
      propertyId: application.property_id,
      jurisdictionCode: input.jurisdictionCode ?? null,
      asOfDate: now,
    });

    const definitions = Array.isArray(workflowConfig?.config?.requirements?.items)
      ? workflowConfig.config.requirements.items
      : [];

    const created = [];

    for (const [index, def] of definitions.entries()) {
      if (!def || !def.name) continue;

      const relocationStatuses = Array.isArray(def.relocationStatuses)
        ? def.relocationStatuses
        : null;
      if (relocationStatuses) {
        const status = application.relocation_status;
        if (!status || !relocationStatuses.includes(status)) continue;
      }

      const partyRoles = Array.isArray(def.partyRoles) ? def.partyRoles : null;
      const applicableParties = partyRoles
        ? parties.filter((party) => partyRoles.includes(party.role))
        : [null];

      const requirementType =
        def.requirementType ?? (def.documentType ? "DOCUMENT" : "CUSTOM");
      const isRequired = def.isRequired ?? true;
      const sortOrder = Number.isFinite(def.sortOrder) ? Math.floor(def.sortOrder) : index;

      const alternatives = resolveAlternatives(def.alternatives, application.relocation_status);
      const baseMetadata = {
        ...(isPlainObject(def.metadata) ? def.metadata : {}),
        source: "WORKFLOW_CONFIG",
      };
      if (def.id) baseMetadata.templateId = def.id;
      if (def.documentType) baseMetadata.documentType = def.documentType;
      if (partyRoles) baseMetadata.partyRoles = partyRoles;
      if (relocationStatuses) baseMetadata.relocationStatuses = relocationStatuses;
      if (alternatives) baseMetadata.alternatives = alternatives;

      for (const party of applicableParties) {
        const result = await db.query(
          `
            INSERT INTO "requirement_items" (
              id, application_id, party_id, info_request_id, requirement_type, status,
              name, description, is_required, sort_order, metadata, created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5::"requirement_type", 'PENDING',
              $6, $7, $8, $9, $10::jsonb, $11, $11
            )
            RETURNING *
          `,
          [
            crypto.randomUUID(),
            applicationId,
            party?.id ?? null,
            null,
            requirementType,
            def.name,
            def.description ?? null,
            isRequired,
            sortOrder,
            Object.keys(baseMetadata).length > 0 ? baseMetadata : null,
            now,
          ],
        );

        created.push(mapRequirement(result.rows[0]));
      }
    }

    return {
      ok: true,
      configId: workflowConfig?.id ?? null,
      configVersion: workflowConfig?.version ?? null,
      items: created,
    };
  });
}

export async function attachDocument(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const partyId = String(input.partyId || "").trim();
  if (!orgId || !applicationId || !partyId) {
    throw new Error("Missing orgId, applicationId, or partyId.");
  }

  return await withTx(pool, async (db) => {
    const appResult = await db.query(
      `SELECT id FROM "lease_applications" WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [applicationId, orgId],
    );
    if (appResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const partyResult = await db.query(
      `SELECT id FROM "application_parties" WHERE id = $1 AND application_id = $2 LIMIT 1`,
      [partyId, applicationId],
    );
    if (partyResult.rows.length === 0) return { ok: false, errorCode: "PARTY_NOT_FOUND" };

    let requirementItemId = input.requirementItemId ? String(input.requirementItemId) : null;
    if (requirementItemId) {
      const requirementResult = await db.query(
        `SELECT id, party_id FROM "requirement_items" WHERE id = $1 AND application_id = $2 LIMIT 1`,
        [requirementItemId, applicationId],
      );
      if (requirementResult.rows.length === 0) {
        return { ok: false, errorCode: "REQUIREMENT_NOT_FOUND" };
      }
      const requirementPartyId = requirementResult.rows[0].party_id;
      if (requirementPartyId && requirementPartyId !== partyId) {
        return { ok: false, errorCode: "REQUIREMENT_PARTY_MISMATCH" };
      }
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const sizeBytes = Number(input.sizeBytes);
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
      return { ok: false, errorCode: "INVALID_SIZE" };
    }

    const validFrom = toDate(input.validFrom);
    const validUntil = toDate(input.validUntil);

    const insertResult = await db.query(
      `
        INSERT INTO "documents" (
          id, org_id, party_id, requirement_item_id, document_type, file_name, mime_type,
          size_bytes, storage_key, public_url, scan_status, scan_result,
          valid_from, valid_until, uploaded_at, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5::"document_type", $6, $7,
          $8::bigint, $9, $10, $11, $12::jsonb,
          $13, $14, $15, $15, $15
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        orgId,
        partyId,
        requirementItemId,
        input.documentType,
        input.fileName,
        input.mimeType,
        sizeBytes,
        input.storageKey ?? null,
        input.publicUrl ?? null,
        input.scanStatus ?? null,
        input.scanResult ?? null,
        validFrom,
        validUntil,
        now,
      ],
    );

    if (requirementItemId) {
      await db.query(
        `
          UPDATE "requirement_items"
          SET status = 'SUBMITTED', updated_at = $2
          WHERE id = $1 AND status <> 'WAIVED'
        `,
        [requirementItemId, now],
      );
    }

    return { ok: true, document: mapDocument(insertResult.rows[0]) };
  });
}

export async function updateDocumentVerification(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const documentId = String(input.documentId || "").trim();
  const action = String(input.action || "").toUpperCase();
  if (!orgId || !documentId || !action) {
    throw new Error("Missing orgId, documentId, or action.");
  }

  if (action !== "VERIFY" && action !== "REJECT") {
    throw new Error("Invalid action.");
  }

  return await withTx(pool, async (db) => {
    const docResult = await db.query(
      `
        SELECT id, requirement_item_id, verification_status
        FROM "documents"
        WHERE id = $1 AND org_id = $2
        FOR UPDATE
      `,
      [documentId, orgId],
    );

    if (docResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const currentStatus = docResult.rows[0].verification_status;
    const requirementItemId = docResult.rows[0].requirement_item_id;

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    if (action === "VERIFY") {
      if (!["UPLOADED", "REJECTED"].includes(currentStatus)) {
        return { ok: false, errorCode: "INVALID_STATUS", status: currentStatus };
      }

      await db.query(
        `
          UPDATE "documents"
          SET verification_status = 'VERIFIED',
              verified_at = $1,
              verified_by_id = $2,
              rejected_at = NULL,
              rejected_by_id = NULL,
              rejected_reason = NULL,
              expired_at = NULL,
              updated_at = $1
          WHERE id = $3
        `,
        [now, input.reviewerId ?? null, documentId],
      );

      if (requirementItemId) {
        await db.query(
          `
            UPDATE "requirement_items"
            SET status = 'APPROVED', completed_at = $2, updated_at = $2
            WHERE id = $1 AND status <> 'WAIVED'
          `,
          [requirementItemId, now],
        );
      }
    } else if (action === "REJECT") {
      if (!["UPLOADED", "VERIFIED"].includes(currentStatus)) {
        return { ok: false, errorCode: "INVALID_STATUS", status: currentStatus };
      }

      await db.query(
        `
          UPDATE "documents"
          SET verification_status = 'REJECTED',
              rejected_at = $1,
              rejected_by_id = $2,
              rejected_reason = $3,
              verified_at = NULL,
              verified_by_id = NULL,
              expired_at = NULL,
              updated_at = $1
          WHERE id = $4
        `,
        [now, input.reviewerId ?? null, input.rejectedReason ?? null, documentId],
      );

      if (requirementItemId) {
        await db.query(
          `
            UPDATE "requirement_items"
            SET status = 'REJECTED', updated_at = $2
            WHERE id = $1 AND status <> 'WAIVED'
          `,
          [requirementItemId, now],
        );
      }
    }

    const updated = await db.query(
      `SELECT * FROM "documents" WHERE id = $1`,
      [documentId],
    );

    return { ok: true, document: mapDocument(updated.rows[0]) };
  });
}

export async function expireDocuments(pool, input = {}) {
  const orgId = input.orgId ? String(input.orgId) : null;
  const asOfDate = toDate(input.asOfDate) ?? new Date();
  const params = [asOfDate];
  let orgClause = "";

  if (orgId) {
    params.push(orgId);
    orgClause = `AND org_id = $${params.length}`;
  }

  const expired = await pool.query(
    `
      UPDATE "documents"
      SET verification_status = 'EXPIRED',
          expired_at = $1,
          updated_at = $1
      WHERE valid_until IS NOT NULL
        AND valid_until <= $1
        AND verification_status = 'VERIFIED'
        ${orgClause}
      RETURNING id, requirement_item_id
    `,
    params,
  );

  const requirementIds = expired.rows
    .map((row) => row.requirement_item_id)
    .filter(Boolean);

  if (requirementIds.length > 0) {
    await pool.query(
      `
        UPDATE "requirement_items"
        SET status = 'EXPIRED', updated_at = $2
        WHERE id = ANY($1::uuid[])
          AND status <> 'WAIVED'
      `,
      [requirementIds, asOfDate],
    );
  }

  return {
    ok: true,
    expiredCount: expired.rows.length,
    requirementItemIds: requirementIds,
  };
}

export async function createInfoRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");

  return await withTx(pool, async (db) => {
    const applicationResult = await db.query(
      `
        SELECT id, status
        FROM "lease_applications"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [applicationId, orgId],
    );

    if (applicationResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const applicationStatus = applicationResult.rows[0].status;
    if (!["SUBMITTED", "IN_REVIEW", "NEEDS_INFO"].includes(applicationStatus)) {
      return { ok: false, errorCode: "INVALID_STATUS", status: applicationStatus };
    }

    const partiesResult = await db.query(
      `SELECT id FROM "application_parties" WHERE application_id = $1`,
      [applicationId],
    );
    const partyIds = new Set(partiesResult.rows.map((row) => row.id));

    const targetPartyId = input.targetPartyId ? String(input.targetPartyId) : null;
    if (targetPartyId && !partyIds.has(targetPartyId)) {
      return { ok: false, errorCode: "PARTY_NOT_FOUND" };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    const infoRequestId = crypto.randomUUID();
    const itemsToRequest = Array.isArray(input.itemsToRequest)
      ? input.itemsToRequest
      : [];

    await db.query(
      `
        INSERT INTO "info_requests" (
          id, org_id, application_id, party_id, status, message,
          requested_items, unlock_scopes, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, 'OPEN', $5,
          $6::jsonb, $7::jsonb, $8, $8
        )
      `,
      [
        infoRequestId,
        orgId,
        applicationId,
        targetPartyId,
        input.message ?? null,
        itemsToRequest.length > 0 ? itemsToRequest : null,
        Array.isArray(input.unlockScopes) ? input.unlockScopes : null,
        now,
      ],
    );

    const createdRequirements = [];
    for (const [index, item] of itemsToRequest.entries()) {
      if (!item || !item.name) continue;
      const itemPartyId = item.partyId ?? targetPartyId ?? null;
      if (itemPartyId && !partyIds.has(itemPartyId)) {
        return { ok: false, errorCode: "PARTY_NOT_FOUND" };
      }

      const requirementType =
        item.requirementType ?? (item.documentType ? "DOCUMENT" : "CUSTOM");
      const isRequired = item.isRequired ?? true;
      const sortOrder = Number.isFinite(item.sortOrder) ? Math.floor(item.sortOrder) : index;

      const metadata = {
        ...(isPlainObject(item.metadata) ? item.metadata : {}),
        source: "INFO_REQUEST",
      };
      if (item.documentType) metadata.documentType = item.documentType;
      if (item.alternatives) metadata.alternatives = item.alternatives;

      const inserted = await db.query(
        `
          INSERT INTO "requirement_items" (
            id, application_id, party_id, info_request_id, requirement_type, status,
            name, description, is_required, sort_order, metadata, created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5::"requirement_type", 'PENDING',
            $6, $7, $8, $9, $10::jsonb, $11, $11
          )
          RETURNING *
        `,
        [
          crypto.randomUUID(),
          applicationId,
          itemPartyId,
          infoRequestId,
          requirementType,
          item.name,
          item.description ?? null,
          isRequired,
          sortOrder,
          Object.keys(metadata).length > 0 ? metadata : null,
          now,
        ],
      );

      createdRequirements.push(mapRequirement(inserted.rows[0]));
    }

    await db.query(
      `
        UPDATE "lease_applications"
        SET status = 'NEEDS_INFO', updated_at = $2
        WHERE id = $1
      `,
      [applicationId, now],
    );

    const infoRequestResult = await db.query(
      `SELECT * FROM "info_requests" WHERE id = $1`,
      [infoRequestId],
    );

    return {
      ok: true,
      infoRequest: mapInfoRequest(infoRequestResult.rows[0]),
      requirements: createdRequirements,
    };
  });
}

export async function respondToInfoRequest(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const infoRequestId = String(input.infoRequestId || "").trim();
  if (!orgId || !applicationId || !infoRequestId) {
    throw new Error("Missing orgId, applicationId, or infoRequestId.");
  }

  return await withTx(pool, async (db) => {
    const infoResult = await db.query(
      `
        SELECT id, status
        FROM "info_requests"
        WHERE id = $1 AND org_id = $2 AND application_id = $3
        LIMIT 1
        FOR UPDATE
      `,
      [infoRequestId, orgId, applicationId],
    );

    if (infoResult.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };

    const currentStatus = infoResult.rows[0].status;
    if (currentStatus !== "OPEN") {
      return { ok: false, errorCode: "INVALID_STATUS", status: currentStatus };
    }

    const nowResult = await db.query("SELECT NOW() AS now");
    const now = nowResult.rows[0]?.now ? new Date(nowResult.rows[0].now) : new Date();

    await db.query(
      `
        UPDATE "info_requests"
        SET status = 'RESPONDED', responded_at = $1, updated_at = $1
        WHERE id = $2
      `,
      [now, infoRequestId],
    );

    const openCount = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM "info_requests"
        WHERE application_id = $1 AND status = 'OPEN'
      `,
      [applicationId],
    );

    let applicationStatus = null;
    if ((openCount.rows[0]?.count ?? 0) === 0) {
      const updatedApp = await db.query(
        `
          UPDATE "lease_applications"
          SET status = CASE
            WHEN status = 'NEEDS_INFO' THEN 'IN_REVIEW'
            ELSE status
          END,
          updated_at = $2
          WHERE id = $1
          RETURNING status
        `,
        [applicationId, now],
      );
      applicationStatus = updatedApp.rows[0]?.status ?? null;
    }

    const refreshed = await db.query(
      `SELECT * FROM "info_requests" WHERE id = $1`,
      [infoRequestId],
    );

    return {
      ok: true,
      infoRequest: mapInfoRequest(refreshed.rows[0]),
      applicationStatus,
    };
  });
}
