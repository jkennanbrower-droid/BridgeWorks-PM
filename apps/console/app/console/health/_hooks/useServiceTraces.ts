import { fetchOpsTraces } from "../_data/opsClient";
import type { OpsTracesResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function useServiceTraces(
  service: string,
  range: string,
  query: string,
  refreshMs = 0,
  limit = 150,
) {
  return usePolling<OpsTracesResponse>(
    (signal) => fetchOpsTraces(service, range, query, limit, signal),
    [service, range, query, limit],
    { refreshMs },
  );
}
