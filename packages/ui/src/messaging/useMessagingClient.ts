import { useMemo } from "react";

import type { MessagingClient } from "./client";
import { messagingFlags } from "./flags";
import { HttpMessagingClient } from "./httpClient";
import { MockMessagingClient } from "./mockClient";
import type { ViewerContext } from "./types";

declare const process: {
  env: Record<string, string | undefined>;
};

const clientByNamespace = new Map<string, MessagingClient>();

export function useMessagingClient(viewer: ViewerContext): MessagingClient {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const useApi = Boolean(apiBase) && messagingFlags.useApi;
  const namespaceKey = useApi
    ? `bw.messaging.api.v1.${apiBase}.${viewer.appId}.${viewer.orgId}.${viewer.actorId}`
    : `bw.messaging.mock.v1.${viewer.appId}.${viewer.orgId}.${viewer.actorId}`;
  return useMemo(() => {
    const existing = clientByNamespace.get(namespaceKey);
    if (existing) return existing;
    if (!useApi) {
      const created = new MockMessagingClient(viewer);
      clientByNamespace.set(namespaceKey, created);
      return created;
    }

    const http = new HttpMessagingClient(viewer);
    const mock = new MockMessagingClient(viewer);
    let degradedToMock = false;

    const wrap = <TArgs extends any[], TResult>(
      fn: (client: MessagingClient, ...args: TArgs) => Promise<TResult>,
    ) => {
      return async (...args: TArgs) => {
        if (degradedToMock) return await fn(mock, ...args);
        try {
          return await fn(http, ...args);
        } catch (e) {
          degradedToMock = true;
          // TODO: surface a non-blocking UI toast when toast infra exists.
          console.warn("Messaging API unavailable; falling back to mock.", e);
          return await fn(mock, ...args);
        }
      };
    };

    const wrapNoFallback = <TArgs extends any[], TResult>(
      fn: (client: MessagingClient, ...args: TArgs) => Promise<TResult>,
    ) => {
      return async (...args: TArgs) => {
        if (degradedToMock) return await fn(mock, ...args);
        return await fn(http, ...args);
      };
    };

    const created: MessagingClient = {
      listThreads: wrap((c, q) => c.listThreads(q)),
      listMessages: wrap((c, id) => c.listMessages(id)),
      createThread: wrap((c, input) => c.createThread(input)),
      sendMessage: wrap((c, id, input) => c.sendMessage(id, input)),
      deleteMessage: wrap((c, id, msgId) => c.deleteMessage(id, msgId)),
      editMessage: wrapNoFallback((c, id, msgId, body) => c.editMessage(id, msgId, body)),
      addReaction: wrapNoFallback((c, id, msgId, emoji) => c.addReaction(id, msgId, emoji)),
      removeReaction: wrapNoFallback((c, id, msgId, emoji) => c.removeReaction(id, msgId, emoji)),
      getReadReceipts: wrap((c, id) => c.getReadReceipts(id)),
      updateThread: wrap((c, id, patch) => c.updateThread(id, patch)),
      bulkUpdateThreads: wrap((c, ids, action) => c.bulkUpdateThreads(ids, action)),
      searchGlobal: wrap((c, input) => c.searchGlobal(input)),
      resetDemoSessionData: mock.resetDemoSessionData?.bind(mock),
    };

    (created as any).getParticipants = () =>
      (http as any).getParticipants?.() ?? (mock as any).getParticipants?.() ?? [];
    (created as any).getAudit = (threadId: string) =>
      (http as any).getAudit?.(threadId) ?? (mock as any).getAudit?.(threadId) ?? [];

    clientByNamespace.set(namespaceKey, created);
    return created;
  }, [namespaceKey, viewer]);
}
