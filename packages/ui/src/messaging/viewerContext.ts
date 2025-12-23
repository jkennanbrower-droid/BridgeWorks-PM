import { setActiveDemoUserRole } from "../dashboard/demoSession";

import type { ViewerContext } from "./types";

export function buildViewerContext(input: {
  appId: string;
  role: string;
  isStaffView: boolean;
}): ViewerContext {
  const session = setActiveDemoUserRole(input.appId, input.role);
  return {
    appId: input.appId,
    orgId: session.orgId,
    actorId: session.actorId,
    roleHint: input.role,
    isStaffView: input.appId === "staff",
    sessionId: session.sessionId,
  };
}
