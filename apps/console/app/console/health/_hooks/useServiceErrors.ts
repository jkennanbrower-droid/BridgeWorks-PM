import { fetchOpsErrors } from "../_data/opsClient";
import type { OpsErrorsResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function useServiceErrors(
  service: string,
  range: string,
  query: string,
  refreshMs = 0,
  limit = 200,
) {
  return usePolling<OpsErrorsResponse>(
    (signal) => fetchOpsErrors(service, range, query, limit, signal),
    [service, range, query, limit],
    { refreshMs },
  );
}
