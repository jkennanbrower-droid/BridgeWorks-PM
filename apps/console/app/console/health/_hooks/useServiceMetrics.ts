import { fetchOpsMetrics } from "../_data/opsClient";
import type { OpsMetricsResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function useServiceMetrics(
  service: string,
  range: string,
  refreshMs: number,
) {
  return usePolling<OpsMetricsResponse>(
    (signal) => fetchOpsMetrics(service, range, signal),
    [service, range],
    { refreshMs },
  );
}
