import { fetchOpsLogs } from "../_data/opsClient";
import type { OpsLogsResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function useServiceLogs(
  service: string,
  range: string,
  level: string,
  query: string,
  refreshMs = 0,
  limit = 200,
) {
  return usePolling<OpsLogsResponse>(
    (signal) => fetchOpsLogs(service, range, level, query, limit, signal),
    [service, range, level, query, limit],
    { refreshMs },
  );
}
