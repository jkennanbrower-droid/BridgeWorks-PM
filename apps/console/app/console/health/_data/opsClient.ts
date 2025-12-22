import type {
  OpsDependenciesResponse,
  OpsErrorsResponse,
  OpsLogsResponse,
  OpsMetricsResponse,
  OpsStressRunResponse,
  OpsStressStatusResponse,
  OpsStatusResponse,
  OpsTestRunResponse,
  OpsTracesResponse,
} from "./opsTypes";

type FetchOptions = {
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
  method?: "GET" | "POST";
  body?: unknown;
};

function buildUrl(path: string, query?: FetchOptions["query"]) {
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3105";
  const url = new URL(`/api/ops/${path}`, base);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function fetchJson<T>(path: string, options: FetchOptions = {}) {
  const method = options.method ?? "GET";
  const res = await fetch(buildUrl(path, options.query), {
    method,
    cache: "no-store",
    signal: options.signal,
    headers:
      method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchOpsStatus(range?: string, signal?: AbortSignal) {
  return fetchJson<OpsStatusResponse>("status", {
    query: range ? { range } : undefined,
    signal,
  });
}

export function fetchOpsDependenciesStatus(signal?: AbortSignal) {
  return fetchJson<OpsDependenciesResponse>("dependencies/status", { signal });
}

export function fetchOpsMetrics(
  service: string,
  range?: string,
  signal?: AbortSignal,
) {
  return fetchJson<OpsMetricsResponse>("metrics", {
    query: { service, range },
    signal,
  });
}

export function fetchOpsErrors(
  service: string,
  range?: string,
  query?: string,
  limit?: number,
  signal?: AbortSignal,
) {
  return fetchJson<OpsErrorsResponse>("errors", {
    query: { service, range, query, limit },
    signal,
  });
}

export function fetchOpsTraces(
  service: string,
  range?: string,
  query?: string,
  limit?: number,
  signal?: AbortSignal,
) {
  return fetchJson<OpsTracesResponse>("traces", {
    query: { service, range, query, limit },
    signal,
  });
}

export function fetchOpsLogs(
  service: string,
  range?: string,
  level?: string,
  query?: string,
  limit?: number,
  signal?: AbortSignal,
) {
  return fetchJson<OpsLogsResponse>("logs", {
    query: { service, range, level, query, limit },
    signal,
  });
}

export function runOpsTest(signal?: AbortSignal) {
  return fetchJson<OpsTestRunResponse>("test/run", {
    method: "POST",
    signal,
  });
}

export function runOpsStress(
  payload: {
    durationSec: number;
    rps: number;
    concurrency: number;
    targets: string[];
    bytes?: number;
    ms?: number;
  },
  signal?: AbortSignal,
) {
  return fetchJson<OpsStressRunResponse>("stress/run", {
    method: "POST",
    body: payload,
    signal,
  });
}

export function fetchOpsStressStatus(runId: string, signal?: AbortSignal) {
  return fetchJson<OpsStressStatusResponse>("stress/status", {
    query: { id: runId },
    signal,
  });
}
