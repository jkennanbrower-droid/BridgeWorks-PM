import express from "express";
import { z } from "zod";

import {
  bulkUpdateThreads,
  createThread,
  ensureOrgId,
  isStaffish,
  listMessages,
  listThreads,
  markThreadRead,
  searchGlobal,
  sendMessage,
  updateThread,
} from "./messagingRepo.mjs";

function getHeader(req, name) {
  const value = req.headers[String(name).toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseCsv(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseOptionalIso(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function errorJson(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function hintForDbError(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/relation \"messaging_/i.test(message) && /does not exist/i.test(message)) {
    return "Messaging DB schema missing. Run `pnpm db:bootstrap-messaging` (or `pnpm db:migrate`).";
  }
  return null;
}

function buildDemoContext(req) {
  const appId = getHeader(req, "x-demo-app-id") ?? null;
  const orgKey = getHeader(req, "x-demo-org-id") ?? null;
  const actorId = getHeader(req, "x-demo-actor-id") ?? null;
  const role = getHeader(req, "x-demo-role") ?? null;
  const sessionId = getHeader(req, "x-demo-session-id") ?? null;

  return {
    appId: appId ? String(appId) : null,
    orgKey: orgKey ? String(orgKey) : null,
    actorId: actorId ? String(actorId) : null,
    role: role ? String(role) : null,
    sessionId: sessionId ? String(sessionId) : null,
  };
}

export function registerMessagingRoutes({ app, pool, noStore, logger }) {
  const router = express.Router();

  router.use((req, res, next) => {
    noStore(res);
    next();
  });

  router.use(async (req, res, next) => {
    const ctx = buildDemoContext(req);
    if (!ctx.orgKey || !ctx.actorId) return errorJson(res, 401, "Missing demo context.");

    try {
      const orgId = await ensureOrgId(pool, ctx.orgKey);
      // NOTE (Prompt 2.5): sessionId is session-only; do not use it for persistence scoping.
      req.messagingCtx = {
        appId: ctx.appId ?? "demo",
        orgId,
        orgKey: ctx.orgKey,
        actorId: ctx.actorId,
        role: ctx.role ?? "demo",
        sessionId: ctx.sessionId ?? null,
      };
      return next();
    } catch (e) {
      logger?.warn?.({ err: e }, "messaging ensureOrgId failed");
      return errorJson(res, 500, "Failed to resolve org.");
    }
  });

  router.get("/threads", async (req, res) => {
    try {
      const ctx = req.messagingCtx;

      const query = {
        text: String(req.query.text ?? "").trim() || undefined,
        tab: String(req.query.tab ?? "").trim() || undefined,
        status: parseCsv(req.query.status),
        channel: parseCsv(req.query.channel),
        propertyId: parseCsv(req.query.propertyId),
        unitId: parseCsv(req.query.unitId),
        assigneeId: parseCsv(req.query.assigneeId),
        priority: parseCsv(req.query.priority),
        dateFrom: parseOptionalIso(req.query.dateFrom),
        dateTo: parseOptionalIso(req.query.dateTo),
        sortKey: String(req.query.sortKey ?? "").trim() || undefined,
      };

      const result = await listThreads(pool, ctx, query);
      return res.json(result);
    } catch (e) {
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /messaging/threads failed");
      return errorJson(res, 500, hint ?? "Failed to list threads.");
    }
  });

  router.get("/threads/:threadId/messages", async (req, res) => {
    try {
      const ctx = req.messagingCtx;
      const threadId = String(req.params.threadId || "");
      if (!threadId) return errorJson(res, 400, "Missing threadId.");

      const list = await listMessages(pool, ctx, threadId);
      if (!list) return errorJson(res, 404, "Thread not found.");
      return res.json(list);
    } catch (e) {
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /messaging/threads/:threadId/messages failed");
      return errorJson(res, 500, hint ?? "Failed to list messages.");
    }
  });

  router.post("/threads", async (req, res) => {
    const schema = z.object({
      title: z.string().trim().min(1),
      kind: z.enum(["direct", "group"]),
      channel: z.enum(["portal", "sms", "email"]),
      participantIds: z.array(z.string().min(1)).min(1),
      tags: z.array(z.string().min(1)).optional(),
      propertyId: z.string().min(1).optional(),
      unitId: z.string().min(1).optional(),
      participants: z
        .array(
          z.object({
            participantId: z.string().min(1),
            role: z.string().min(1).optional(),
            displayName: z.string().min(1).optional(),
            avatarUrl: z.string().min(1).optional(),
          }),
        )
        .optional(),
    });

    try {
      const ctx = req.messagingCtx;
      const input = schema.parse(req.body);
      const created = await createThread(pool, ctx, input);
      if (!created) return errorJson(res, 500, "Failed to create thread.");
      return res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /messaging/threads failed");
      return errorJson(res, 500, hint ?? "Failed to create thread.");
    }
  });

  router.post("/threads/:threadId/messages", async (req, res) => {
    const schema = z.object({
      body: z.string().trim().min(1),
      channel: z.enum(["portal", "sms", "email"]).optional(),
      attachments: z
        .array(
          z.object({
            fileName: z.string().min(1),
            mimeType: z.string().min(1),
            sizeBytes: z.number().int().nonnegative(),
            storageKey: z.string().min(1).optional(),
            publicUrl: z.string().min(1).optional(),
          }),
        )
        .optional(),
      scheduledFor: z.string().datetime().optional(),
      internalOnly: z.boolean().optional(),
    });

    try {
      const ctx = req.messagingCtx;
      const threadId = String(req.params.threadId || "");
      if (!threadId) return errorJson(res, 400, "Missing threadId.");

      const input = schema.parse(req.body);
      const created = await sendMessage(pool, ctx, threadId, input);
      if (!created) return errorJson(res, 404, "Thread not found.");
      return res.status(201).json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /messaging/threads/:threadId/messages failed");
      return errorJson(res, 500, hint ?? "Failed to send message.");
    }
  });

  router.patch("/threads/:threadId", async (req, res) => {
    const schema = z.object({
      status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      assigneeId: z.string().optional().nullable(),
      assigneeLabel: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      dueDate: z.string().datetime().optional().nullable(),
      slaDueAt: z.string().datetime().optional().nullable(),
      linkedWorkOrderId: z.string().optional().nullable(),
      linkedTaskId: z.string().optional().nullable(),
      followers: z.array(z.string().min(1)).optional(),
    });

    try {
      const ctx = req.messagingCtx;
      const threadId = String(req.params.threadId || "");
      if (!threadId) return errorJson(res, 400, "Missing threadId.");

      const patch = schema.parse(req.body);
      const updated = await updateThread(pool, ctx, threadId, patch);
      if (!updated) return errorJson(res, 404, "Thread not found.");
      return res.json(updated);
    } catch (e) {
      if (e instanceof z.ZodError) return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "PATCH /messaging/threads/:threadId failed");
      return errorJson(res, 500, hint ?? "Failed to update thread.");
    }
  });

  router.post("/threads/bulk", async (req, res) => {
    const schema = z.object({
      threadIds: z.array(z.string().min(1)).min(1),
      action: z.discriminatedUnion("type", [
        z.object({ type: z.literal("mark_resolved") }),
        z.object({ type: z.literal("reassign"), assigneeId: z.string().min(1), assigneeLabel: z.string().min(1) }),
        z.object({ type: z.literal("add_tag"), tag: z.string().min(1) }),
      ]),
    });

    try {
      const ctx = req.messagingCtx;
      const input = schema.parse(req.body);
      const result = await bulkUpdateThreads(pool, ctx, input.threadIds, input.action);
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /messaging/threads/bulk failed");
      return errorJson(res, 500, hint ?? "Failed to bulk update threads.");
    }
  });

  router.get("/search", async (req, res) => {
    try {
      const ctx = req.messagingCtx;
      const text = String(req.query.text ?? "").trim();
      if (!text) return errorJson(res, 400, "Missing text.");

      const result = await searchGlobal(pool, ctx, text);
      return res.json(result);
    } catch (e) {
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /messaging/search failed");
      return errorJson(res, 500, hint ?? "Failed to search.");
    }
  });

  router.post("/threads/:threadId/read", async (req, res) => {
    try {
      const ctx = req.messagingCtx;
      const threadId = String(req.params.threadId || "");
      if (!threadId) return errorJson(res, 400, "Missing threadId.");

      const result = await markThreadRead(pool, ctx, threadId);
      if (!result) return errorJson(res, 404, "Thread not found.");
      return res.json(result);
    } catch (e) {
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /messaging/threads/:threadId/read failed");
      return errorJson(res, 500, hint ?? "Failed to mark read.");
    }
  });

  // TODO: integrate auth via Clerk and RBAC enforcement.
  // TODO (Prompt 4): realtime, delivery provider jobs, notifications.

  app.use("/messaging", router);
  app.use("/api/messaging", router);
}
