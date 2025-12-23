import { useMemo } from "react";

import type { MessagingClient } from "./client";
import { MockMessagingClient } from "./mockClient";
import type { ViewerContext } from "./types";

const clientByNamespace = new Map<string, MessagingClient>();

export function useMessagingClient(viewer: ViewerContext): MessagingClient {
  const namespaceKey = `bw.messaging.mock.v1.${viewer.appId}.${viewer.orgId}.${viewer.actorId}`;
  return useMemo(() => {
    const existing = clientByNamespace.get(namespaceKey);
    if (existing) return existing;
    const created = new MockMessagingClient(viewer);
    clientByNamespace.set(namespaceKey, created);
    return created;
    // TODO (Prompt 3): swap to HttpMessagingClient, keep signature unchanged.
  }, [namespaceKey, viewer]);
}

