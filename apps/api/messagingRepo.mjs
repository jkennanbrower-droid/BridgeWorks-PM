import crypto from "node:crypto";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function toIso(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function previewText(text, maxLen = 140) {
  const trimmed = String(text ?? "").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function normalizeReactions(value) {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return typeof value === "object" ? value : undefined;
}

export function isStaffish(appId, role) {
  const normalizedRole = String(role || "").toLowerCase();
  return (
    String(appId || "").toLowerCase() === "staff" ||
    ["property_manager", "admin", "maintenance", "staff", "internal", "staff_admin"].includes(
      normalizedRole,
    )
  );
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

export async function ensureOrgId(pool, orgKey) {
  const key = String(orgKey || "").trim();
  if (!key) throw new Error("Missing org key.");

  if (isUuid(key)) {
    const existing = await pool.query('SELECT id FROM "organizations" WHERE id = $1 LIMIT 1', [key]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const name = `Demo Org ${key.slice(0, 8)}`;
    await pool.query('INSERT INTO "organizations" (id, name, slug) VALUES ($1, $2, $3)', [key, name, key]);
    return key;
  }

  const found = await pool.query(
    'SELECT id FROM "organizations" WHERE slug = $1 ORDER BY created_at ASC LIMIT 1',
    [key],
  );
  if (found.rows.length > 0) return found.rows[0].id;

  const id = crypto.randomUUID();
  await pool.query('INSERT INTO "organizations" (id, name, slug) VALUES ($1, $2, $3)', [id, `Demo Org ${key}`, key]);
  return id;
}

async function requireThreadAccess(db, { orgId, actorId, threadId }) {
  const thread = await db.query(
    `SELECT t.id
     FROM "messaging_threads" t
     JOIN "messaging_thread_participants" p
       ON p.thread_id = t.id AND p.org_id = t.org_id AND p.participant_id = $2
     WHERE t.org_id = $1 AND t.id = $3
     LIMIT 1`,
    [orgId, actorId, threadId],
  );
  if (thread.rows.length === 0) return null;
  return thread.rows[0];
}

export async function listThreadParticipantIds(db, { orgId, threadId }) {
  const result = await db.query(
    `SELECT participant_id
     FROM "messaging_thread_participants"
     WHERE org_id = $1 AND thread_id = $2`,
    [orgId, threadId],
  );
  return result.rows.map((r) => String(r.participant_id)).filter(Boolean);
}

async function fetchMessageReactions(db, { orgId, messageId }) {
  const result = await db.query(
    `SELECT COALESCE(jsonb_object_agg(emoji, users), '{}'::jsonb) AS reactions
     FROM (
       SELECT emoji, jsonb_agg(user_id) AS users
       FROM "messaging_reactions"
       WHERE org_id = $1 AND message_id = $2
       GROUP BY emoji
    ) AS grouped`,
    [orgId, messageId],
  );
  const reactions = normalizeReactions(result.rows[0]?.reactions);
  return reactions ?? {};
}

function buildThreadSelect({ includeUnreadForActor = true, excludeInternalUnread = false } = {}) {
  const unreadSql = includeUnreadForActor
    ? `COALESCE((
        SELECT COUNT(*)::int
        FROM "messaging_messages" m
        WHERE m.org_id = t.org_id
          AND m.thread_id = t.id
          AND m.sender_id <> $2
          AND m.created_at > COALESCE(p.last_read_at, to_timestamp(0))
          ${excludeInternalUnread ? 'AND m.internal_only = false' : ""}
      ), 0) AS "unreadCount"`
    : "0::int AS \"unreadCount\"";

  return `
    SELECT
      t.id,
      t.kind,
      t.title,
      t.status,
      t.priority,
      t.channel_default AS "channelDefault",
      t.property_id AS "propertyId",
      t.unit_id AS "unitId",
      t.assignee_id AS "assigneeId",
      t.assignee_label AS "assigneeLabel",
      t.tags,
      t.due_date AS "dueDate",
      t.sla_due_at AS "slaDueAt",
      t.linked_work_order_id AS "linkedWorkOrderId",
      t.linked_task_id AS "linkedTaskId",
      t.last_message_preview AS "lastMessagePreview",
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      ${unreadSql},
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', tp.participant_id,
          'name', tp.display_name,
          'role', tp.role,
          'avatarUrl', tp.avatar_url
        ) ORDER BY tp.created_at ASC)
        FROM "messaging_thread_participants" tp
        WHERE tp.org_id = t.org_id AND tp.thread_id = t.id
      ), '[]'::json) AS "participants",
      COALESCE((
        SELECT json_agg(tf.follower_id ORDER BY tf.follower_id ASC)
        FROM "messaging_thread_followers" tf
        WHERE tf.org_id = t.org_id AND tf.thread_id = t.id
      ), '[]'::json) AS "followers"
    FROM "messaging_threads" t
    JOIN "messaging_thread_participants" p
      ON p.thread_id = t.id AND p.org_id = t.org_id AND p.participant_id = $2
    WHERE t.org_id = $1
  `;
}

function applySort(sortKey) {
  switch (sortKey) {
    case "updated_asc":
      return 'ORDER BY t.updated_at ASC NULLS LAST, t.created_at ASC';
    case "sla_asc":
      return 'ORDER BY t.sla_due_at ASC NULLS LAST, t.updated_at DESC';
    case "priority_desc":
      return `ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 4
          WHEN 'high' THEN 3
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END DESC,
        t.updated_at DESC`;
    case "updated_desc":
    default:
      return 'ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC';
  }
}

function buildUnreadExistsWhere({ excludeInternal } = {}) {
  return `EXISTS (
    SELECT 1
    FROM "messaging_messages" um
    WHERE um.org_id = t.org_id
      AND um.thread_id = t.id
      AND um.sender_id <> $2
      AND um.created_at > COALESCE(p.last_read_at, to_timestamp(0))
      ${excludeInternal ? "AND um.internal_only = false" : ""}
    LIMIT 1
  )`;
}

async function getThreadById(db, ctx, threadId) {
  const staffish = isStaffish(ctx.appId, ctx.role);
  const sql =
    buildThreadSelect({
      includeUnreadForActor: true,
      excludeInternalUnread: !staffish,
    }) + ` AND t.deleted_at IS NULL AND t.id = $3`;

  const result = await db.query(sql, [ctx.orgId, ctx.actorId, threadId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    status: row.status,
    priority: row.priority,
    channelDefault: row.channelDefault,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    lastMessagePreview: row.lastMessagePreview ?? undefined,
    unreadCount: row.unreadCount ?? 0,
    propertyId: row.propertyId ?? undefined,
    unitId: row.unitId ?? undefined,
    assigneeId: row.assigneeId ?? undefined,
    assigneeLabel: row.assigneeLabel ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    dueDate: toIso(row.dueDate),
    slaDueAt: toIso(row.slaDueAt),
    linkedWorkOrderId: row.linkedWorkOrderId ?? undefined,
    linkedTaskId: row.linkedTaskId ?? undefined,
    followers: Array.isArray(row.followers) ? row.followers : [],
    participants: Array.isArray(row.participants) ? row.participants : [],
  };
}

export async function listThreads(pool, ctx, query) {
  const staffish = isStaffish(ctx.appId, ctx.role);
  const parts = [ctx.orgId, ctx.actorId];
  const where = [];

  const includeDeleted = query.tab === "archived";
  where.push(includeDeleted ? "t.deleted_at IS NOT NULL" : "t.deleted_at IS NULL");

  if (query.tab === "groups") where.push("t.kind = 'group'");
  if (query.tab === "flagged") where.push("p.flagged = true");
  if (query.tab === "unread") where.push(buildUnreadExistsWhere({ excludeInternal: !staffish }));

  if (Array.isArray(query.status) && query.status.length > 0) {
    parts.push(query.status);
    where.push(`t.status = ANY($${parts.length}::"MessagingThreadStatus"[])`);
  }

  if (Array.isArray(query.channel) && query.channel.length > 0) {
    parts.push(query.channel);
    where.push(`t.channel_default = ANY($${parts.length}::"MessagingChannel"[])`);
  }

  if (Array.isArray(query.propertyId) && query.propertyId.length > 0) {
    parts.push(query.propertyId);
    where.push(`t.property_id = ANY($${parts.length}::text[])`);
  }

  if (Array.isArray(query.unitId) && query.unitId.length > 0) {
    parts.push(query.unitId);
    where.push(`t.unit_id = ANY($${parts.length}::text[])`);
  }

  if (Array.isArray(query.assigneeId) && query.assigneeId.length > 0) {
    parts.push(query.assigneeId);
    where.push(`t.assignee_id = ANY($${parts.length}::text[])`);
  }

  if (Array.isArray(query.priority) && query.priority.length > 0) {
    parts.push(query.priority);
    where.push(`t.priority = ANY($${parts.length}::"MessagingThreadPriority"[])`);
  }

  if (query.dateFrom) {
    parts.push(query.dateFrom);
    where.push(`t.updated_at >= $${parts.length}::timestamptz`);
  }

  if (query.dateTo) {
    parts.push(query.dateTo);
    where.push(`t.updated_at <= $${parts.length}::timestamptz`);
  }

  if (query.text) {
    parts.push(`%${String(query.text).trim()}%`);
    const idx = parts.length;
    where.push(
      `(t.title ILIKE $${idx} OR t.last_message_preview ILIKE $${idx} OR array_to_string(t.tags, ' ') ILIKE $${idx})`,
    );
  }

  const sqlBase = buildThreadSelect({
    includeUnreadForActor: true,
    excludeInternalUnread: !staffish,
  });

  const sql = sqlBase + (where.length ? ` AND ${where.join(" AND ")}` : "") + ` ${applySort(query.sortKey)}`;

  const result = await pool.query(sql, parts);
  return {
    threads: result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      status: row.status,
      priority: row.priority,
      channelDefault: row.channelDefault,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      lastMessagePreview: row.lastMessagePreview ?? undefined,
      unreadCount: row.unreadCount ?? 0,
      propertyId: row.propertyId ?? undefined,
      unitId: row.unitId ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      assigneeLabel: row.assigneeLabel ?? undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      dueDate: toIso(row.dueDate),
      slaDueAt: toIso(row.slaDueAt),
      linkedWorkOrderId: row.linkedWorkOrderId ?? undefined,
      linkedTaskId: row.linkedTaskId ?? undefined,
      followers: Array.isArray(row.followers) ? row.followers : [],
      participants: Array.isArray(row.participants) ? row.participants : [],
    })),
  };
}

export async function listMessages(pool, ctx, threadId) {
  const staffish = isStaffish(ctx.appId, ctx.role);

  const access = await pool.query(
    `SELECT 1
     FROM "messaging_threads" t
     JOIN "messaging_thread_participants" p
       ON p.thread_id = t.id AND p.org_id = t.org_id AND p.participant_id = $2
     WHERE t.org_id = $1 AND t.id = $3
     LIMIT 1`,
    [ctx.orgId, ctx.actorId, threadId],
  );
  if (access.rows.length === 0) return null;

  const params = [ctx.orgId, threadId];
  let internalWhere = "";
  if (!staffish) internalWhere = "AND m.internal_only = false";

  const result = await pool.query(
    `SELECT
       m.id,
       m.thread_id AS "threadId",
       m.sender_id AS "senderId",
       m.sender_label AS "senderLabel",
       m.body,
       m.deleted_at AS "deletedAt",
       m.deleted_by_id AS "deletedById",
       m.deleted_for_everyone AS "deletedForEveryone",
       m.edited_at AS "editedAt",
       m.edited_by_id AS "editedById",
       m.created_at AS "createdAt",
       m.channel,
       m.internal_only AS "internalOnly",
       m.scheduled_for AS "scheduledFor",
       m.delivery_status AS "deliveryStatus",
       m.delivery_updated_at AS "deliveryUpdatedAt",
       COALESCE(
         json_agg(
           json_build_object(
             'id', a.id,
             'threadId', a.thread_id,
             'messageId', a.message_id,
             'fileName', a.file_name,
             'mimeType', a.mime_type,
             'sizeBytes', a.size_bytes,
             'uploadedAt', a.uploaded_at,
             'uploadedById', a.uploaded_by_id,
             'storageKey', a.storage_key,
             'publicUrl', a.public_url,
             'scanStatus', a.scan_status
           )
         ) FILTER (WHERE a.id IS NOT NULL),
         '[]'::json
       ) AS attachments,
       COALESCE(reactions_agg.reactions, '{}'::jsonb) AS reactions
     FROM "messaging_messages" m
     LEFT JOIN "messaging_attachments" a
       ON a.org_id = m.org_id AND a.thread_id = m.thread_id AND a.message_id = m.id
     LEFT JOIN LATERAL (
       SELECT jsonb_object_agg(emoji, users) AS reactions
       FROM (
         SELECT emoji, jsonb_agg(user_id) AS users
         FROM "messaging_reactions" mr
         WHERE mr.org_id = m.org_id AND mr.message_id = m.id
         GROUP BY emoji
       ) AS grouped
     ) AS reactions_agg ON true
     WHERE m.org_id = $1 AND m.thread_id = $2
     ${internalWhere}
     GROUP BY m.id, reactions_agg.reactions
     ORDER BY m.created_at ASC`,
    params,
  );

  return {
    messages: result.rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      senderId: row.senderId,
      senderLabel: row.senderLabel,
      body: row.body,
      deletedAt: toIso(row.deletedAt),
      deletedById: row.deletedById ?? undefined,
      deletedForEveryone: row.deletedForEveryone ?? undefined,
      editedAt: toIso(row.editedAt),
      editedById: row.editedById ?? undefined,
      createdAt: toIso(row.createdAt),
      channel: row.channel,
      internalOnly: Boolean(row.internalOnly) || undefined,
      scheduledFor: toIso(row.scheduledFor),
      delivery: {
        status: row.deliveryStatus,
        updatedAt: toIso(row.deliveryUpdatedAt),
      },
      attachments: Array.isArray(row.attachments)
        ? row.attachments.map((a) => ({
            id: a.id,
            threadId: a.threadId,
            messageId: a.messageId ?? undefined,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: Number(a.sizeBytes),
            uploadedAt: toIso(a.uploadedAt),
            uploadedById: a.uploadedById,
            storageKey: a.storageKey ?? undefined,
            publicUrl: a.publicUrl ?? undefined,
            scanStatus: a.scanStatus ?? undefined,
          }))
        : [],
      reactions: normalizeReactions(row.reactions),
    })),
  };
}

export async function createThread(pool, ctx, input) {
  return withTx(pool, async (db) => {
    const threadId = crypto.randomUUID();
    const now = new Date();

    await db.query(
      `INSERT INTO "messaging_threads" (
        id, org_id, kind, title, status, priority, channel_default,
        property_id, unit_id, tags, created_at, updated_at
      ) VALUES (
        $1, $2, $3::"MessagingThreadKind", $4, $5::"MessagingThreadStatus", $6::"MessagingThreadPriority", $7::"MessagingChannel",
        $8, $9, $10::text[], $11, $11
      )`,
      [
        threadId,
        ctx.orgId,
        input.kind,
        input.title,
        "open",
        "normal",
        input.channel,
        input.propertyId ?? null,
        input.unitId ?? null,
        input.tags ?? [],
        now,
      ],
    );

    const participantIds = Array.from(
      new Set([...(input.participantIds ?? []), ctx.actorId].filter(Boolean)),
    );
    const detailsById = new Map(
      (input.participants ?? []).map((p) => [p.participantId, p]),
    );

    for (const participantId of participantIds) {
      const details = detailsById.get(participantId);
      const role = String(details?.role ?? (participantId === ctx.actorId ? ctx.role : "tenant") ?? "tenant");
      const displayName = String(details?.displayName ?? participantId);
      const avatarUrl = details?.avatarUrl ?? null;
      await db.query(
        `INSERT INTO "messaging_thread_participants" (
          id, thread_id, org_id, participant_id, role, display_name, avatar_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $8
        )
        ON CONFLICT (thread_id, participant_id) DO UPDATE
          SET role = EXCLUDED.role,
              display_name = EXCLUDED.display_name,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = EXCLUDED.updated_at`,
        [crypto.randomUUID(), threadId, ctx.orgId, participantId, role, displayName, avatarUrl, now],
      );
    }

    await db.query(
      `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        crypto.randomUUID(),
        ctx.orgId,
        threadId,
        "thread.created",
        ctx.actorId,
        ctx.actorId,
        JSON.stringify({ title: input.title, kind: input.kind, channel: input.channel }),
        now,
      ],
    );

    return await getThreadById(db, ctx, threadId);
  });
}

async function getMessageById(db, ctx, { threadId, messageId }) {
  const staffish = isStaffish(ctx.appId, ctx.role);
  const internalWhere = staffish ? "" : "AND m.internal_only = false";

  const result = await db.query(
    `SELECT
       m.id,
       m.thread_id AS "threadId",
       m.sender_id AS "senderId",
       m.sender_label AS "senderLabel",
       m.body,
       m.deleted_at AS "deletedAt",
       m.deleted_by_id AS "deletedById",
       m.deleted_for_everyone AS "deletedForEveryone",
       m.edited_at AS "editedAt",
       m.edited_by_id AS "editedById",
       m.created_at AS "createdAt",
       m.channel,
       m.internal_only AS "internalOnly",
       m.scheduled_for AS "scheduledFor",
       m.delivery_status AS "deliveryStatus",
       m.delivery_updated_at AS "deliveryUpdatedAt",
       COALESCE(
         json_agg(
           json_build_object(
             'id', a.id,
             'threadId', a.thread_id,
             'messageId', a.message_id,
             'fileName', a.file_name,
             'mimeType', a.mime_type,
             'sizeBytes', a.size_bytes,
             'uploadedAt', a.uploaded_at,
             'uploadedById', a.uploaded_by_id,
             'storageKey', a.storage_key,
             'publicUrl', a.public_url,
             'scanStatus', a.scan_status
           )
         ) FILTER (WHERE a.id IS NOT NULL),
         '[]'::json
       ) AS attachments,
       COALESCE(reactions_agg.reactions, '{}'::jsonb) AS reactions
     FROM "messaging_messages" m
     LEFT JOIN "messaging_attachments" a
       ON a.org_id = m.org_id AND a.thread_id = m.thread_id AND a.message_id = m.id
     LEFT JOIN LATERAL (
       SELECT jsonb_object_agg(emoji, users) AS reactions
       FROM (
         SELECT emoji, jsonb_agg(user_id) AS users
         FROM "messaging_reactions" mr
         WHERE mr.org_id = m.org_id AND mr.message_id = m.id
         GROUP BY emoji
       ) AS grouped
     ) AS reactions_agg ON true
     WHERE m.org_id = $1 AND m.thread_id = $2 AND m.id = $3
     ${internalWhere}
     GROUP BY m.id, reactions_agg.reactions
     LIMIT 1`,
    [ctx.orgId, threadId, messageId],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderId,
    senderLabel: row.senderLabel,
    body: row.body,
    deletedAt: toIso(row.deletedAt),
    deletedById: row.deletedById ?? undefined,
    deletedForEveryone: row.deletedForEveryone ?? undefined,
    editedAt: toIso(row.editedAt),
    editedById: row.editedById ?? undefined,
    createdAt: toIso(row.createdAt),
    channel: row.channel,
    internalOnly: Boolean(row.internalOnly) || undefined,
    scheduledFor: toIso(row.scheduledFor),
    delivery: { status: row.deliveryStatus, updatedAt: toIso(row.deliveryUpdatedAt) },
    attachments: Array.isArray(row.attachments)
      ? row.attachments.map((a) => ({
          id: a.id,
          threadId: a.threadId,
          messageId: a.messageId ?? undefined,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: Number(a.sizeBytes),
          uploadedAt: toIso(a.uploadedAt),
          uploadedById: a.uploadedById,
          storageKey: a.storageKey ?? undefined,
          publicUrl: a.publicUrl ?? undefined,
          scanStatus: a.scanStatus ?? undefined,
        }))
      : [],
    reactions: normalizeReactions(row.reactions),
  };
}

export async function sendMessage(pool, ctx, threadId, input) {
  const staffish = isStaffish(ctx.appId, ctx.role);

  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return null;

    const now = new Date();
    const messageId = crypto.randomUUID();

    const channel = input.channel ?? "portal";
    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;

    const deliveryStatus =
      scheduledFor != null
        ? "queued"
        : channel === "portal"
          ? "sent"
          : "queued"; // Provider webhooks update via PATCH /messaging/messages/:id/status

    const internalOnly = staffish ? Boolean(input.internalOnly) : false; // TODO: real RBAC.

    const senderLabelRow = await db.query(
      `SELECT display_name
       FROM "messaging_thread_participants"
       WHERE org_id = $1 AND thread_id = $2 AND participant_id = $3
       LIMIT 1`,
      [ctx.orgId, threadId, ctx.actorId],
    );
    const senderLabel = senderLabelRow.rows[0]?.display_name ?? ctx.actorId;

    await db.query(
      `INSERT INTO "messaging_messages" (
        id, org_id, thread_id, sender_id, sender_label, body, channel,
        internal_only, scheduled_for, delivery_status, delivery_updated_at, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::"MessagingChannel",
        $8, $9, $10::"MessagingDeliveryStatus", $11, $11
      )`,
      [
        messageId,
        ctx.orgId,
        threadId,
        ctx.actorId,
        senderLabel,
        input.body,
        channel,
        internalOnly,
        scheduledFor,
        deliveryStatus,
        now,
      ],
    );

    const attachments = Array.isArray(input.attachments) ? input.attachments : [];
    for (const att of attachments) {
      await db.query(
        `INSERT INTO "messaging_attachments" (
          id, org_id, thread_id, message_id, file_name, mime_type, size_bytes,
          uploaded_by_id, uploaded_at, storage_key, public_url, scan_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::bigint,
          $8, $9, $10, $11, $12
        )`,
        [
          crypto.randomUUID(),
          ctx.orgId,
          threadId,
          messageId,
          att.fileName,
          att.mimeType,
          att.sizeBytes,
          ctx.actorId,
          now,
          att.storageKey ?? null,
          att.publicUrl ?? null,
          att.scanStatus ?? null,
        ],
      );
    }

    if (!internalOnly) {
      await db.query(
        `UPDATE "messaging_threads"
         SET updated_at = $3,
             last_message_preview = $4
         WHERE org_id = $1 AND id = $2`,
        [ctx.orgId, threadId, now, previewText(input.body)],
      );
    } else {
      await db.query(`UPDATE "messaging_threads" SET updated_at = $3 WHERE org_id = $1 AND id = $2`, [
        ctx.orgId,
        threadId,
        now,
      ]);
    }

    await db.query(
      `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        crypto.randomUUID(),
        ctx.orgId,
        threadId,
        "message.sent",
        ctx.actorId,
        senderLabel,
        JSON.stringify({
          channel,
          attachmentCount: attachments.length,
          internalOnly,
        }),
        now,
      ],
    );

    return await getMessageById(db, ctx, { threadId, messageId });
  });
}

export async function updateThread(pool, ctx, threadId, patch) {
  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return null;

    const now = new Date();
    const sets = [];
    const values = [ctx.orgId, threadId];

    function addSet(column, value, cast = "") {
      values.push(value);
      sets.push(`${column} = $${values.length}${cast}`);
    }

    if (patch.status) addSet("status", patch.status, '::"MessagingThreadStatus"');
    if (patch.priority) addSet("priority", patch.priority, '::"MessagingThreadPriority"');
    if (typeof patch.assigneeId !== "undefined") addSet("assignee_id", patch.assigneeId ?? null);
    if (typeof patch.assigneeLabel !== "undefined") addSet("assignee_label", patch.assigneeLabel ?? null);
    if (typeof patch.tags !== "undefined") addSet("tags", patch.tags ?? [], "::text[]");
    if (typeof patch.dueDate !== "undefined") addSet("due_date", patch.dueDate ? new Date(patch.dueDate) : null);
    if (typeof patch.slaDueAt !== "undefined") addSet("sla_due_at", patch.slaDueAt ? new Date(patch.slaDueAt) : null);
    if (typeof patch.linkedWorkOrderId !== "undefined")
      addSet("linked_work_order_id", patch.linkedWorkOrderId ?? null);
    if (typeof patch.linkedTaskId !== "undefined") addSet("linked_task_id", patch.linkedTaskId ?? null);

    addSet("updated_at", now);

    if (sets.length > 0) {
      await db.query(
        `UPDATE "messaging_threads" SET ${sets.join(", ")} WHERE org_id = $1 AND id = $2`,
        values,
      );
    }

    if (typeof patch.followers !== "undefined") {
      const followerIds = Array.from(new Set((patch.followers ?? []).filter(Boolean)));
      await db.query(`DELETE FROM "messaging_thread_followers" WHERE org_id = $1 AND thread_id = $2`, [
        ctx.orgId,
        threadId,
      ]);
      for (const followerId of followerIds) {
        await db.query(
          `INSERT INTO "messaging_thread_followers" (id, org_id, thread_id, follower_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (thread_id, follower_id) DO NOTHING`,
          [crypto.randomUUID(), ctx.orgId, threadId, followerId],
        );
      }
    }

    await db.query(
      `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        crypto.randomUUID(),
        ctx.orgId,
        threadId,
        "thread.updated",
        ctx.actorId,
        ctx.actorId,
        JSON.stringify({ patch }), // TODO: store richer diffs + RBAC enforcement.
        now,
      ],
    );

    return await getThreadById(db, ctx, threadId);
  });
}

export async function bulkUpdateThreads(pool, ctx, threadIds, action) {
  return withTx(pool, async (db) => {
    const ids = Array.from(new Set((threadIds ?? []).filter(Boolean)));
    if (ids.length === 0) return { updated: [] };

    const now = new Date();

    if (action.type === "mark_resolved") {
      await db.query(
        `UPDATE "messaging_threads"
         SET status = 'resolved'::"MessagingThreadStatus", updated_at = $3
         WHERE org_id = $1 AND id = ANY($2::uuid[])`,
        [ctx.orgId, ids, now],
      );
    } else if (action.type === "reassign") {
      await db.query(
        `UPDATE "messaging_threads"
         SET assignee_id = $3, assignee_label = $4, updated_at = $5
         WHERE org_id = $1 AND id = ANY($2::uuid[])`,
        [ctx.orgId, ids, action.assigneeId, action.assigneeLabel, now],
      );
    } else if (action.type === "add_tag") {
      await db.query(
        `UPDATE "messaging_threads"
         SET tags = (
           SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(tags, '{}'::text[]) || ARRAY[$3]::text[]))
         ),
         updated_at = $4
         WHERE org_id = $1 AND id = ANY($2::uuid[])`,
        [ctx.orgId, ids, action.tag, now],
      );
    } else {
      throw new Error("Unsupported bulk action.");
    }

    for (const id of ids) {
      await db.query(
        `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          crypto.randomUUID(),
          ctx.orgId,
          id,
          `thread.bulk.${action.type}`,
          ctx.actorId,
          ctx.actorId,
          JSON.stringify({ action, count: ids.length }),
          now,
        ],
      );
    }

    const updated = [];
    for (const id of ids) {
      const thread = await getThreadById(db, ctx, id);
      if (thread) updated.push(thread);
    }
    return { updated };
  });
}

export async function searchGlobal(pool, ctx, text) {
  const q = String(text || "").trim();
  if (!q) return { threads: [], messages: [], attachments: [] };

  const staffish = isStaffish(ctx.appId, ctx.role);
  const like = `%${q}%`;

  const threadsRes = await pool.query(
    `SELECT id, title, last_message_preview AS "lastMessagePreview", updated_at AS "updatedAt"
     FROM "messaging_threads"
     WHERE org_id = $1 AND deleted_at IS NULL
       AND (title ILIKE $2 OR last_message_preview ILIKE $2 OR array_to_string(tags, ' ') ILIKE $2)
     ORDER BY updated_at DESC
     LIMIT 50`,
    [ctx.orgId, like],
  );

  const messagesRes = await pool.query(
    `SELECT id, thread_id AS "threadId", sender_id AS "senderId", sender_label AS "senderLabel",
            body, created_at AS "createdAt", channel, internal_only AS "internalOnly",
            scheduled_for AS "scheduledFor", delivery_status AS "deliveryStatus", delivery_updated_at AS "deliveryUpdatedAt"
     FROM "messaging_messages"
     WHERE org_id = $1
       AND body ILIKE $2
       ${staffish ? "" : "AND internal_only = false"}
     ORDER BY created_at DESC
     LIMIT 50`,
    [ctx.orgId, like],
  );

  const attachmentsRes = await pool.query(
    `SELECT id, thread_id AS "threadId", message_id AS "messageId", file_name AS "fileName", mime_type AS "mimeType",
            size_bytes AS "sizeBytes", uploaded_at AS "uploadedAt", uploaded_by_id AS "uploadedById",
            storage_key AS "storageKey", public_url AS "publicUrl", scan_status AS "scanStatus"
     FROM "messaging_attachments"
     WHERE org_id = $1 AND file_name ILIKE $2
     ORDER BY uploaded_at DESC
     LIMIT 50`,
    [ctx.orgId, like],
  );

  const threadIds = Array.from(new Set(threadsRes.rows.map((r) => r.id)));
  const { threads } = threadIds.length
    ? await listThreads(pool, ctx, { tab: "all", sortKey: "updated_desc" })
    : { threads: [] };

  const threadsById = new Map(threads.map((t) => [t.id, t]));

  return {
    threads: threadIds.map((id) => threadsById.get(id)).filter(Boolean),
    messages: messagesRes.rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      senderId: row.senderId,
      senderLabel: row.senderLabel,
      body: row.body,
      createdAt: toIso(row.createdAt),
      channel: row.channel,
      internalOnly: Boolean(row.internalOnly) || undefined,
      scheduledFor: toIso(row.scheduledFor),
      delivery: { status: row.deliveryStatus, updatedAt: toIso(row.deliveryUpdatedAt) },
      attachments: [],
    })),
    attachments: attachmentsRes.rows.map((a) => ({
      id: a.id,
      threadId: a.threadId,
      messageId: a.messageId ?? undefined,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: Number(a.sizeBytes),
      uploadedAt: toIso(a.uploadedAt),
      uploadedById: a.uploadedById,
      storageKey: a.storageKey ?? undefined,
      publicUrl: a.publicUrl ?? undefined,
      scanStatus: a.scanStatus ?? undefined,
    })),
  };
}

export async function deleteMessage(pool, ctx, threadId, messageId) {
  const staffish = isStaffish(ctx.appId, ctx.role);

  return withTx(pool, async (db) => {
    // Verify thread access
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return { ok: false, error: "Thread not found." };

    // Check message exists and get sender
    const msgResult = await db.query(
      `SELECT id, sender_id, deleted_at
       FROM "messaging_messages"
       WHERE org_id = $1 AND thread_id = $2 AND id = $3
       LIMIT 1`,
      [ctx.orgId, threadId, messageId],
    );

    if (msgResult.rows.length === 0) {
      return { ok: false, error: "Message not found." };
    }

    const msg = msgResult.rows[0];

    // Already deleted
    if (msg.deleted_at) {
      return { ok: true, alreadyDeleted: true };
    }

    // RBAC: Allow delete if sender OR staffish
    const isSender = msg.sender_id === ctx.actorId;
    if (!isSender && !staffish) {
      return { ok: false, error: "Not authorized to delete this message." };
    }

    const now = new Date();

    // Soft delete: overwrite body, clear attachments, set deleted fields
    await db.query(
      `UPDATE "messaging_messages"
       SET body = $4,
           deleted_at = $5,
           deleted_by_id = $6,
           deleted_for_everyone = true
       WHERE org_id = $1 AND thread_id = $2 AND id = $3`,
      [ctx.orgId, threadId, messageId, "This message was deleted.", now, ctx.actorId],
    );

    // Clear attachments for this message
    await db.query(
      `DELETE FROM "messaging_attachments"
       WHERE org_id = $1 AND thread_id = $2 AND message_id = $3`,
      [ctx.orgId, threadId, messageId],
    );

    // Create audit event
    await db.query(
      `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        crypto.randomUUID(),
        ctx.orgId,
        threadId,
        "message.deleted",
        ctx.actorId,
        ctx.actorId,
        JSON.stringify({ messageId }),
        now,
      ],
    );

    return { ok: true, messageId, threadId };
  });
}

export async function editMessage(pool, ctx, threadId, messageId, body) {
  const staffish = isStaffish(ctx.appId, ctx.role);
  const nextBody = String(body ?? "").trim();
  if (!nextBody) return { ok: false, error: "Body is required." };

  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return { ok: false, error: "Thread not found." };

    const msgResult = await db.query(
      `SELECT id, sender_id, internal_only, deleted_at
       FROM "messaging_messages"
       WHERE org_id = $1 AND thread_id = $2 AND id = $3
       LIMIT 1`,
      [ctx.orgId, threadId, messageId],
    );
    if (msgResult.rows.length === 0) return { ok: false, error: "Message not found." };

    const msg = msgResult.rows[0];
    if (msg.deleted_at) return { ok: false, error: "Cannot edit a deleted message." };

    const isSender = msg.sender_id === ctx.actorId;
    if (!isSender && !staffish) return { ok: false, error: "Not authorized to edit this message." };

    const now = new Date();

    await db.query(
      `UPDATE "messaging_messages"
       SET body = $4,
           edited_at = $5,
           edited_by_id = $6
       WHERE org_id = $1 AND thread_id = $2 AND id = $3`,
      [ctx.orgId, threadId, messageId, nextBody, now, ctx.actorId],
    );

    // Keep thread preview in sync when editing the latest public message.
    if (!msg.internal_only) {
      const latestPublic = await db.query(
        `SELECT id
         FROM "messaging_messages"
         WHERE org_id = $1 AND thread_id = $2 AND internal_only = false
         ORDER BY created_at DESC
         LIMIT 1`,
        [ctx.orgId, threadId],
      );
      const latestId = latestPublic.rows[0]?.id;
      if (latestId === messageId) {
        await db.query(
          `UPDATE "messaging_threads"
           SET updated_at = $3,
               last_message_preview = $4
           WHERE org_id = $1 AND id = $2`,
          [ctx.orgId, threadId, now, previewText(nextBody)],
        );
      } else {
        await db.query(`UPDATE "messaging_threads" SET updated_at = $3 WHERE org_id = $1 AND id = $2`, [
          ctx.orgId,
          threadId,
          now,
        ]);
      }
    } else {
      await db.query(`UPDATE "messaging_threads" SET updated_at = $3 WHERE org_id = $1 AND id = $2`, [
        ctx.orgId,
        threadId,
        now,
      ]);
    }

    await db.query(
      `INSERT INTO "messaging_thread_audit" (id, org_id, thread_id, type, actor_id, actor_label, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        crypto.randomUUID(),
        ctx.orgId,
        threadId,
        "message.edited",
        ctx.actorId,
        ctx.actorId,
        JSON.stringify({ messageId }),
        now,
      ],
    );

    const updated = await getMessageById(db, ctx, { threadId, messageId });
    return { ok: true, message: updated };
  });
}

export async function addReaction(pool, ctx, threadId, messageId, emoji) {
  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return { ok: false, error: "Thread not found." };

    const msgResult = await db.query(
      `SELECT id
       FROM "messaging_messages"
       WHERE org_id = $1 AND thread_id = $2 AND id = $3
       LIMIT 1`,
      [ctx.orgId, threadId, messageId],
    );

    if (msgResult.rows.length === 0) {
      return { ok: false, error: "Message not found." };
    }

    await db.query(
      `INSERT INTO "messaging_reactions" (
        id, org_id, thread_id, message_id, user_id, emoji, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [crypto.randomUUID(), ctx.orgId, threadId, messageId, ctx.actorId, emoji, new Date()],
    );

    const reactions = await fetchMessageReactions(db, { orgId: ctx.orgId, messageId });
    return { ok: true, reactions };
  });
}

export async function removeReaction(pool, ctx, threadId, messageId, emoji) {
  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return { ok: false, error: "Thread not found." };

    const msgResult = await db.query(
      `SELECT id
       FROM "messaging_messages"
       WHERE org_id = $1 AND thread_id = $2 AND id = $3
       LIMIT 1`,
      [ctx.orgId, threadId, messageId],
    );

    if (msgResult.rows.length === 0) {
      return { ok: false, error: "Message not found." };
    }

    await db.query(
      `DELETE FROM "messaging_reactions"
       WHERE org_id = $1 AND thread_id = $2 AND message_id = $3 AND user_id = $4 AND emoji = $5`,
      [ctx.orgId, threadId, messageId, ctx.actorId, emoji],
    );

    const reactions = await fetchMessageReactions(db, { orgId: ctx.orgId, messageId });
    return { ok: true, reactions };
  });
}

export async function updateMessageStatus(pool, { orgId, messageId, status }) {
  const validStatuses = ["queued", "sent", "delivered", "read", "failed"];
  if (!validStatuses.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const now = new Date();
  const result = await pool.query(
    `UPDATE "messaging_messages"
     SET delivery_status = $3::"MessagingDeliveryStatus",
         delivery_updated_at = $4
     WHERE org_id = $1 AND id = $2
     RETURNING id, thread_id AS "threadId", delivery_status AS "deliveryStatus"`,
    [orgId, messageId, status, now],
  );

  if (result.rows.length === 0) {
    return { ok: false, error: "Message not found." };
  }

  return { ok: true, message: result.rows[0] };
}

export async function markThreadRead(pool, ctx, threadId) {
  return withTx(pool, async (db) => {
    const access = await requireThreadAccess(db, { orgId: ctx.orgId, actorId: ctx.actorId, threadId });
    if (!access) return null;

    const now = new Date();
    const update = await db.query(
      `UPDATE "messaging_thread_participants"
       SET last_read_at = $4, updated_at = $4
       WHERE org_id = $1 AND thread_id = $2 AND participant_id = $3`,
      [ctx.orgId, threadId, ctx.actorId, now],
    );

    if (update.rowCount === 0) {
      await db.query(
        `INSERT INTO "messaging_thread_participants" (
          id, thread_id, org_id, participant_id, role, display_name, last_read_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $7, $7
        )
        ON CONFLICT (thread_id, participant_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at, updated_at = EXCLUDED.updated_at`,
        [crypto.randomUUID(), threadId, ctx.orgId, ctx.actorId, String(ctx.role || "tenant"), ctx.actorId, now],
      );
    }

    return { ok: true };
  });
}
