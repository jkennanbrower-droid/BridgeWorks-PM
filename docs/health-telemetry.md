# Health + Telemetry (Prometheus-backed)

BridgeWorks Console Health reads service metrics from `apps/api` via `GET /ops/metrics`, and `apps/api` queries Prometheus as the source of truth.

## Metric definitions (real telemetry)

- Requests/min: `rate(bw_http_requests_total[1m]) * 60`
- Error rate: `rate(bw_http_requests_total{status=~"5.."}[5m]) / rate(bw_http_requests_total[5m])`
- Latency p50/p95/p99: `histogram_quantile(0.50|0.95|0.99, sum by (le) (rate(bw_http_request_duration_ms_bucket[5m])))`

All services emit:

- `bw_http_requests_total{service,method,route,status}`
- `bw_http_request_duration_ms_bucket{service,method,route,status,le}`

## Localhost

### 1) Start Prometheus

From repo root:

```bash
docker compose -f infra/observability/docker-compose.yml up -d
```

Or (recommended):

```bash
pnpm dev:obs
```

If Docker Desktop isn't installed, `pnpm dev:obs` prints a warning and continues (Prometheus just won't run).

Prometheus UI: `http://localhost:9090`

### 2) Start all services

From repo root:

```bash
pnpm dev:all
```

`pnpm dev:all` tries to start Prometheus automatically (best-effort). To skip: `SKIP_OBSERVABILITY=1 pnpm dev:all`.

Expected local ports:

- Public: `http://localhost:3100`
- Staff: `http://localhost:3101`
- User: `http://localhost:3102`
- API: `http://localhost:3103`
- Org: `http://localhost:3104`
- Console: `http://localhost:3105`

Metrics endpoints:

- Public: `http://localhost:3100/metrics`
- Staff: `http://localhost:3101/metrics`
- User: `http://localhost:3102/metrics`
- API: `http://localhost:3103/metrics`
- Org: `http://localhost:3104/metrics`
- Console: `http://localhost:3105/metrics`

### 3) Acceptance test (safe stress echo)

Hit each service’s `/api/stress/echo` 50 times (no DB writes):

```powershell
1..50 | % { iwr -UseBasicParsing "http://localhost:3100/api/stress/echo?bytes=256" | Out-Null }
1..50 | % { iwr -UseBasicParsing "http://localhost:3101/api/stress/echo?bytes=256" | Out-Null }
1..50 | % { iwr -UseBasicParsing "http://localhost:3102/api/stress/echo?bytes=256" | Out-Null }
1..50 | % { iwr -UseBasicParsing "http://localhost:3103/api/stress/echo?bytes=256" | Out-Null }
1..50 | % { iwr -UseBasicParsing "http://localhost:3104/api/stress/echo?bytes=256" | Out-Null }
1..50 | % { iwr -UseBasicParsing "http://localhost:3105/api/stress/echo?bytes=256" | Out-Null }
```

Then open Console Health:

- `http://localhost:3105/console/health`
- Verify Requests/min rises for the correct service.
- Verify p95 latency shows non-null values after Prometheus scrapes.
- Verify error rate stays near 0 (unless you force a 500).

## Render

### Services

- Add `bridgeworks-observability` (Prometheus) as a private service (configured in `render.yaml`).
- Prometheus scrapes each Render service’s internal address on port `10000` at `/metrics`.
- `bridgeworks-api` queries Prometheus via `PROMETHEUS_BASE_URL=http://bridgeworks-observability:9090`.

Local docker-compose is dev-only; Render uses `infra/observability/Dockerfile` + `infra/observability/prometheus.render.yml`.

### Env var checklist

`bridgeworks-api`:

- `PROMETHEUS_BASE_URL` (required in production)
- `OPS_ALLOW_TESTS` (optional; enables `/ops/test/*` and `/ops/stress/*` in prod)
- `OPS_KEY` (optional; when set, requires `x-ops-key` header for ops endpoints)

All Next apps:

- `NEXT_PUBLIC_API_BASE_URL` (Console uses this to proxy `/api/ops/*` to the API service)
