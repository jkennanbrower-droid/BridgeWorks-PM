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

    // API is enabled: use the DB-backed HTTP client only.
    // This avoids mixing mock + API data (which can lead to "Thread not found" on edits).
    const http = new HttpMessagingClient(viewer);
    clientByNamespace.set(namespaceKey, http);
    return http;
  }, [namespaceKey, viewer]);
}
