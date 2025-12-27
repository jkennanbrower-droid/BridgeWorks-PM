import crypto from "node:crypto";

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

function mapReservation(row) {
  if (!row) return null;
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
      input.targetType ?? "unit_reservation",
      input.targetId ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
    ],
  );
}

export async function createScreeningLock(db, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const unitId = String(input.unitId || "").trim();
  if (!orgId || !applicationId || !unitId) {
    throw new Error("Missing orgId, applicationId, or unitId.");
  }

  const now = input.now ?? new Date();

  const insert = await db.query(
    `
      INSERT INTO "unit_reservations" (
        id,
        org_id,
        application_id,
        unit_id,
        kind,
        status,
        expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'SCREENING_LOCK', 'ACTIVE', $5, $6, $6)
      ON CONFLICT (unit_id)
        WHERE status = 'ACTIVE' AND kind = 'SCREENING_LOCK'
      DO NOTHING
      RETURNING *
    `,
    [
      crypto.randomUUID(),
      orgId,
      applicationId,
      unitId,
      input.expiresAt ?? null,
      now,
    ],
  );

  if (insert.rows.length > 0) {
    const reservation = mapReservation(insert.rows[0]);
    await insertAuditEvent(db, {
      orgId,
      applicationId,
      eventType: "RESERVATION_CREATED",
      targetId: reservation.id,
      metadata: {
        unitId,
        kind: reservation.kind,
        status: reservation.status,
      },
      actorId: input.actorId ?? null,
      createdAt: now,
    });

    return { ok: true, reservation };
  }

  const existing = await db.query(
    `
      SELECT id, application_id, expires_at
      FROM "unit_reservations"
      WHERE unit_id = $1
        AND org_id = $2
        AND status = 'ACTIVE'
        AND kind = 'SCREENING_LOCK'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [unitId, orgId],
  );
  const row = existing.rows[0];
  return {
    ok: false,
    errorCode: "RESERVATION_CONFLICT",
    holderApplicationId: row?.application_id ?? null,
    reservationId: row?.id ?? null,
    expiresAt: toIso(row?.expires_at ?? null),
  };
}

export async function releaseReservation(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const reservationId = String(input.reservationId || "").trim();
  const releaseReasonCode = String(input.releaseReasonCode || "").trim();
  if (!orgId || !reservationId) throw new Error("Missing orgId or reservationId.");
  if (!releaseReasonCode) throw new Error("Missing releaseReasonCode.");

  return await withTx(pool, async (db) => {
    const found = await db.query(
      `
        SELECT *
        FROM "unit_reservations"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [reservationId, orgId],
    );

    if (found.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const reservation = found.rows[0];

    if (reservation.status !== "ACTIVE") {
      return { ok: false, errorCode: "NOT_ACTIVE", status: reservation.status };
    }

    const now = new Date();
    const updated = await db.query(
      `
        UPDATE "unit_reservations"
        SET status = 'RELEASED',
            released_at = $1,
            released_by_id = $2,
            release_reason_code = $3,
            released_reason = $4,
            updated_at = $1
        WHERE id = $5
        RETURNING *
      `,
      [
        now,
        input.releasedById ?? null,
        releaseReasonCode,
        input.releasedReason ?? null,
        reservationId,
      ],
    );

    const mapped = mapReservation(updated.rows[0]);
    await insertAuditEvent(db, {
      orgId,
      applicationId: reservation.application_id,
      eventType: "RESERVATION_RELEASED",
      targetId: reservationId,
      metadata: {
        unitId: reservation.unit_id,
        kind: reservation.kind,
        status: "RELEASED",
        releaseReasonCode,
        releasedReason: input.releasedReason ?? null,
      },
      actorId: input.releasedById ?? null,
      createdAt: now,
    });

    return { ok: true, reservation: mapped };
  });
}

export async function releaseReservationsForApplication(db, input) {
  const orgId = String(input.orgId || "").trim();
  const applicationId = String(input.applicationId || "").trim();
  const releaseReasonCode = String(input.releaseReasonCode || "").trim();
  if (!orgId || !applicationId) throw new Error("Missing orgId or applicationId.");
  if (!releaseReasonCode) throw new Error("Missing releaseReasonCode.");

  const now = input.now ?? new Date();

  const active = await db.query(
    `
      SELECT *
      FROM "unit_reservations"
      WHERE org_id = $1
        AND application_id = $2
        AND status = 'ACTIVE'
    `,
    [orgId, applicationId],
  );

  if (active.rows.length === 0) {
    return { ok: true, released: 0 };
  }

  const ids = active.rows.map((row) => row.id);
  await db.query(
    `
      UPDATE "unit_reservations"
      SET status = 'RELEASED',
          released_at = $1,
          released_by_id = $2,
          release_reason_code = $3,
          released_reason = $4,
          updated_at = $1
      WHERE id = ANY($5::uuid[])
    `,
    [
      now,
      input.releasedById ?? null,
      releaseReasonCode,
      input.releaseReason ?? null,
      ids,
    ],
  );

  for (const row of active.rows) {
    await insertAuditEvent(db, {
      orgId,
      applicationId,
      eventType: "RESERVATION_RELEASED",
      targetId: row.id,
      metadata: {
        unitId: row.unit_id,
        kind: row.kind,
        status: "RELEASED",
        releaseReasonCode,
        releasedReason: input.releaseReason ?? null,
      },
      actorId: input.releasedById ?? null,
      createdAt: now,
    });
  }

  return { ok: true, released: active.rows.length };
}

export async function expireReservations(pool, input = {}) {
  const now = input.now ?? new Date();
  return await withTx(pool, async (db) => {
    const expired = await db.query(
      `
        SELECT *
        FROM "unit_reservations"
        WHERE status = 'ACTIVE'
          AND expires_at IS NOT NULL
          AND expires_at <= $1
      `,
      [now],
    );

    if (expired.rows.length === 0) return { ok: true, expired: 0 };

    const ids = expired.rows.map((row) => row.id);
    await db.query(
      `
        UPDATE "unit_reservations"
        SET status = 'EXPIRED',
            released_at = $1,
            release_reason_code = 'EXPIRED',
            released_reason = 'Auto-expired',
            updated_at = $1
        WHERE id = ANY($2::uuid[])
      `,
      [now, ids],
    );

    for (const row of expired.rows) {
      await insertAuditEvent(db, {
        orgId: row.org_id,
        applicationId: row.application_id,
        eventType: "RESERVATION_EXPIRED",
        targetId: row.id,
        metadata: {
          unitId: row.unit_id,
          kind: row.kind,
          status: "EXPIRED",
        },
        actorId: null,
        createdAt: now,
      });
    }

    return { ok: true, expired: expired.rows.length };
  });
}

export async function upgradeScreeningLockToSoftHold(pool, input) {
  const orgId = String(input.orgId || "").trim();
  const reservationId = String(input.reservationId || "").trim();
  if (!orgId || !reservationId) throw new Error("Missing orgId or reservationId.");

  return await withTx(pool, async (db) => {
    const found = await db.query(
      `
        SELECT *
        FROM "unit_reservations"
        WHERE id = $1 AND org_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [reservationId, orgId],
    );
    if (found.rows.length === 0) return { ok: false, errorCode: "NOT_FOUND" };
    const reservation = found.rows[0];
    if (reservation.status !== "ACTIVE") {
      return { ok: false, errorCode: "NOT_ACTIVE", status: reservation.status };
    }
    if (reservation.kind !== "SCREENING_LOCK") {
      return { ok: false, errorCode: "INVALID_KIND", kind: reservation.kind };
    }

    try {
      const now = new Date();
      const updated = await db.query(
        `
          UPDATE "unit_reservations"
          SET kind = 'SOFT_HOLD',
              updated_at = $1
          WHERE id = $2
          RETURNING *
        `,
        [now, reservationId],
      );

      await insertAuditEvent(db, {
        orgId,
        applicationId: reservation.application_id,
        eventType: "RESERVATION_CREATED",
        targetId: reservationId,
        metadata: {
          unitId: reservation.unit_id,
          kind: "SOFT_HOLD",
          status: reservation.status,
        },
        actorId: input.actorId ?? null,
        createdAt: now,
      });

      return { ok: true, reservation: mapReservation(updated.rows[0]) };
    } catch (e) {
      if (String(e?.code) === "23505") {
        return { ok: false, errorCode: "HOLD_CONFLICT" };
      }
      throw e;
    }
  });
}
