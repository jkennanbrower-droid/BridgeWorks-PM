import { fetchOpsDependenciesStatus } from "../_data/opsClient";
import type { OpsDependenciesResponse } from "../_data/opsTypes";
import { usePolling } from "./usePolling";

export function useDependenciesStatus(refreshMs: number) {
  return usePolling<OpsDependenciesResponse>(
    (signal) => fetchOpsDependenciesStatus(signal),
    [],
    { refreshMs },
  );
}
