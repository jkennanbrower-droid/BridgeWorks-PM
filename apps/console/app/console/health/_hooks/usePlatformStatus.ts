import { fetchOpsStatus } from "../_data/opsClient";
import type { OpsStatusResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function usePlatformStatus(range: string, refreshMs: number) {
  return usePolling<OpsStatusResponse>(
    (signal) => fetchOpsStatus(range, signal),
    [range],
    { refreshMs },
  );
}
