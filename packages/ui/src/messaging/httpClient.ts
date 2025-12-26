import { getDemoUserById, getDemoUsers } from "../dashboard/demoSession";

import type { MessagingClient } from "./client";
import type {
  Attachment,
  Message,
  MessagingChannel,
  Thread,
  ThreadKind,
  ThreadQuery,
  ViewerContext,
} from "./types";

declare const process: {
  env: Record<string, string | undefined>;
};

type ApiThreadQuery = {
  text?: string;
  tab?: string;
  status?: string[];
  channel?: string[];
  propertyId?: string[];
  unitId?: string[];
  assigneeId?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortKey?: string;
};

function normalizeBaseUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

function participantRoleForAppId(appId: string) {
  const normalized = String(appId || "").toLowerCase();
  if (normalized === "staff") return "staff";
  if (normalized === "user") return "tenant";
  if (normalized === "org") return "org";
  return "internal";
}

function listDemoAppIdsForViewer(viewer: ViewerContext): string[] {
  const base = ["staff", "user", "org"];
  const viewerApp = String(viewer.appId);
  if (!base.includes(viewerApp)) base.push(viewerApp);
  return base;
}

function resolveDemoUser(viewer: ViewerContext, userId: string): { appId: string; user: any } | null {
  const orgId = String(viewer.orgId);
  for (const appId of listDemoAppIdsForViewer(viewer)) {
    const found = getDemoUserById(appId, orgId, userId);
    if (found) return { appId, user: found };
  }
  return null;
}

function toCsv(values: string[] | undefined) {
  const list = (values ?? []).map((v) => String(v).trim()).filter(Boolean);
  return list.length ? list.join(",") : undefined;
}

function buildQueryString(query: ApiThreadQuery) {
  const params = new URLSearchParams();
  if (query.text) params.set("text", query.text);
  if (query.tab) params.set("tab", query.tab);
  const status = toCsv(query.status);
  if (status) params.set("status", status);
  const channel = toCsv(query.channel);
  if (channel) params.set("channel", channel);
  const propertyId = toCsv(query.propertyId);
  if (propertyId) params.set("propertyId", propertyId);
  const unitId = toCsv(query.unitId);
  if (unitId) params.set("unitId", unitId);
  const assigneeId = toCsv(query.assigneeId);
  if (assigneeId) params.set("assigneeId", assigneeId);
  const priority = toCsv(query.priority);
  if (priority) params.set("priority", priority);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.sortKey) params.set("sortKey", query.sortKey);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function readJsonOrText(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
}

export class HttpMessagingClient implements MessagingClient {
  private readonly apiBase: string;
  private readonly viewer: ViewerContext;

  constructor(viewer: ViewerContext) {
    const apiBaseRaw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
    this.apiBase = normalizeBaseUrl(apiBaseRaw);
    this.viewer = viewer;
  }

  private demoHeaders(): Record<string, string> {
    return {
      "x-demo-app-id": String(this.viewer.appId),
      "x-demo-org-id": String(this.viewer.orgId),
      "x-demo-actor-id": String(this.viewer.actorId),
      "x-demo-role": String(this.viewer.roleHint ?? (this.viewer.isStaffView ? "staff" : "tenant")),
      "x-demo-session-id": String(this.viewer.sessionId),
    };
  }

  private async apiFetch(path: string, init: RequestInit = {}) {
    if (!this.apiBase) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set.");
    const headers = new Headers(init.headers ?? {});
    Object.entries(this.demoHeaders()).forEach(([k, v]) => headers.set(k, v));
    if (!headers.has("accept")) headers.set("accept", "application/json");
    return await fetch(`${this.apiBase}${path}`, { ...init, headers });
  }

  private async apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.apiFetch(path, init);
    const payload = await readJsonOrText(res);
    if (!res.ok) {
      const msg = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : String(payload);
      throw new Error(msg || `Request failed (${res.status}).`);
    }
    if (typeof payload === "object" && payload && "ok" in payload && payload.ok === false) {
      throw new Error(String(payload.error ?? "Request failed."));
    }
    return payload as T;
  }

  async listThreads(query: ThreadQuery): Promise<{ threads: Thread[] }> {
    const qs = buildQueryString({
      ...query,
      status: query.status,
      channel: query.channel,
      propertyId: query.propertyId,
      unitId: query.unitId,
      assigneeId: query.assigneeId,
      priority: query.priority,
    });
    return await this.apiJson<{ threads: Thread[] }>(`/messaging/threads${qs}`, { method: "GET" });
  }

  async listMessages(threadId: string): Promise<{ messages: Message[] }> {
    const list = await this.apiJson<{ messages: Message[] }>(
      `/messaging/threads/${encodeURIComponent(threadId)}/messages`,
      { method: "GET" },
    );

    void this.apiJson(`/messaging/threads/${encodeURIComponent(threadId)}/read`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {
      // best-effort
    });

    return list;
  }

  async createThread(input: {
    title: string;
    kind: ThreadKind;
    channel: MessagingChannel;
    participantIds: string[];
    tags?: string[];
    propertyId?: string;
    unitId?: string;
  }): Promise<Thread> {
    const participants = input.participantIds.map((id) => {
      const resolved = resolveDemoUser(this.viewer, id);
      const displayName = resolved?.user?.displayName ?? id;
      const role = participantRoleForAppId(resolved?.appId ?? String(this.viewer.appId));
      return { participantId: id, displayName, role, avatarUrl: resolved?.user?.avatarUrl };
    });

    return await this.apiJson<Thread>(`/messaging/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, participants }),
    });
  }

  private async uploadAttachment(file: File): Promise<{ key: string; url?: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await this.apiFetch(`/r2-upload`, { method: "POST", body: formData });
    const payload = await readJsonOrText(res);
    if (!res.ok || !payload || typeof payload !== "object" || payload.ok !== true) {
      const msg = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "Upload failed.";
      throw new Error(msg);
    }
    return { key: String(payload.key), url: payload.url ? String(payload.url) : undefined };
  }

  async sendMessage(
    threadId: string,
    input: {
      body: string;
      channel?: MessagingChannel;
      attachments?: Array<
        Pick<Attachment, "fileName" | "mimeType" | "sizeBytes"> & {
          publicUrl?: string;
          storageKey?: string;
          file?: File;
        }
      >;
      scheduledFor?: string;
      internalOnly?: boolean;
    },
  ): Promise<Message> {
    const attachments = (input.attachments ?? []).slice();
    const uploadedAttachments = [];

    for (const att of attachments) {
      if (att.storageKey && att.publicUrl) {
        uploadedAttachments.push(att);
        continue;
      }
      if (!att.file) {
        uploadedAttachments.push(att);
        continue;
      }
      const uploaded = await this.uploadAttachment(att.file);
      uploadedAttachments.push({
        fileName: att.fileName,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        storageKey: uploaded.key,
        publicUrl: uploaded.url,
      });
    }

    return await this.apiJson<Message>(`/messaging/threads/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: input.body,
        channel: input.channel,
        scheduledFor: input.scheduledFor,
        internalOnly: input.internalOnly,
        attachments: uploadedAttachments,
      }),
    });
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    await this.apiFetch(
      `/messaging/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    );
  }

  async editMessage(threadId: string, messageId: string, body: string): Promise<void> {
    await this.apiJson(
      `/messaging/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  }

  async addReaction(threadId: string, messageId: string, emoji: string): Promise<void> {
    await this.apiJson(
      `/messaging/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/reactions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emoji }),
      },
    );
  }

  async removeReaction(threadId: string, messageId: string, emoji: string): Promise<void> {
    const qs = `?emoji=${encodeURIComponent(emoji)}`;
    await this.apiJson(
      `/messaging/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/reactions${qs}`,
      { method: "DELETE" },
    );
  }

  async getReadReceipts(threadId: string): Promise<{
    receipts: Array<{ userId: string; displayName: string; lastReadAt: string }>;
  }> {
    try {
      return await this.apiJson(`/messaging/threads/${encodeURIComponent(threadId)}/read-receipts`, { method: "GET" });
    } catch {
      return { receipts: [] };
    }
  }

  async updateThread(threadId: string, patch: any): Promise<Thread> {
    return await this.apiJson<Thread>(`/messaging/threads/${encodeURIComponent(threadId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async bulkUpdateThreads(threadIds: string[], action: any): Promise<{ updated: Thread[] }> {
    return await this.apiJson<{ updated: Thread[] }>(`/messaging/threads/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadIds, action }),
    });
  }

  async searchGlobal(input: { text: string }): Promise<{ threads: Thread[]; messages: Message[]; attachments: Attachment[] }> {
    const qs = `?text=${encodeURIComponent(input.text)}`;
    return await this.apiJson(`/messaging/search${qs}`, { method: "GET" });
  }

  getParticipants() {
    const orgId = String(this.viewer.orgId);
    const byId = new Map<string, { id: string; name: string; role: any; avatarUrl?: string }>();

    for (const appId of listDemoAppIdsForViewer(this.viewer)) {
      const users = getDemoUsers(appId, orgId);
      for (const user of users) {
        if (byId.has(user.id)) continue;
        byId.set(user.id, {
          id: user.id,
          name: user.displayName,
          role: participantRoleForAppId(appId),
          avatarUrl: user.avatarUrl,
        });
      }
    }

    return Array.from(byId.values());
  }

  getAudit(_threadId: string) {
    return [];
  }
}
