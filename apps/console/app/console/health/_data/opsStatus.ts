export type OpsServiceCheck = {
  name: string;
  pathChecked: string;
  ok: boolean;
  status: number;
  latencyMs: number | null;
};

export type OpsStatusResponse = {
  api: {
    ok: boolean;
    uptimeSec: number;
    nodeVersion: string;
    pid: number;
    hostname: string;
    timestamp: string;
    buildSha?: string;
  };
  db: {
    ok: boolean;
    latencyMs: number | null;
    now?: string;
    error?: string;
  };
  services: OpsServiceCheck[];
};

type FetchOpsStatusOptions = {
  range?: string;
  signal?: AbortSignal;
};

export async function fetchOpsStatus({ range, signal }: FetchOpsStatusOptions) {
  const url = new URL(
    "/api/ops/status",
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3105",
  );
  if (range) {
    url.searchParams.set("range", range);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    signal,
    headers: {
      "x-requested-with": "console-health",
    },
  });

  if (!res.ok) {
    throw new Error(`ops/status returned ${res.status}`);
  }

  return (await res.json()) as OpsStatusResponse;
}
