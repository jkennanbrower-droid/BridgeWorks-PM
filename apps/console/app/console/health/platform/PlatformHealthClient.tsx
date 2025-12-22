"use client";

import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { format } from "date-fns";

import { SERVICE_DEFINITIONS, type ServiceStatus } from "../_data/services";
import type { OpsServiceCheck } from "../_data/opsTypes";
import type { ServiceSnapshot } from "../_data/healthModels";
import { usePlatformStatus } from "../_hooks/usePlatformStatus";
import { useServiceMetrics } from "../_hooks/useServiceMetrics";
import { OverallHealthHeader } from "../components/OverallHealthHeader";
import { ServiceHealthCard } from "../components/ServiceHealthCard";
import { ServiceHealthDrawer } from "../components/ServiceHealthDrawer";
import { TelemetryBanner } from "../components/TelemetryBanner";
import { HealthSkeleton } from "../components/HealthSkeleton";

const LATENCY_DEGRADED_THRESHOLD_MS = 1500;

function getCheckForService(
  checks: OpsServiceCheck[] | undefined,
  names: string[],
) {
  if (!checks) return null;
  return checks.find((check) => names.includes(check.name)) ?? null;
}

function getStatusFromCheck(check: OpsServiceCheck | null): ServiceStatus {
  if (!check) return "unknown";
  if (!check.ok) return "outage";
  if (check.latencyMs && check.latencyMs > LATENCY_DEGRADED_THRESHOLD_MS) {
    return "degraded";
  }
  return "operational";
}

function formatDeployLabel(timestamp: string | undefined, sha: string | undefined) {
  if (!timestamp && !sha) return "unknown";
  const time = timestamp
    ? format(new Date(timestamp), "MMM d")
    : "unknown";
  const shortSha = sha ? sha.slice(0, 7) : "unknown";
  return `${time} - ${shortSha}`;
}

function buildStatusReason(check: OpsServiceCheck | null, status: ServiceStatus) {
  if (!check) return "Telemetry unavailable";
  if (!check.ok) return `Last check failed (${check.status || "no response"})`;
  if (status === "degraded") return "Latency elevated";
  return "All checks passing";
}

function computeHealthScore(
  degraded: number,
  outage: number,
  unknown: number,
  dbOk: boolean | null,
) {
  let score = 100;
  score -= degraded * 8;
  score -= outage * 25;
  score -= unknown * 4;
  if (dbOk === false) score -= 20;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

export function PlatformHealthClient() {
  const [range, setRange] = useState("24h");
  const [refreshMs, setRefreshMs] = useState(60_000);
  const [activeService, setActiveService] = useState<ServiceSnapshot | null>(null);
  const [activeTrend, setActiveTrend] = useState<"latency" | "errorRate" | "requests">(
    "latency",
  );
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);

  const status = usePlatformStatus(range, refreshMs);
  const platformMetrics = useServiceMetrics("platform", range, refreshMs);

  const serviceSnapshots = useMemo(() => {
    return SERVICE_DEFINITIONS.map((definition) => {
      const check = getCheckForService(status.data?.services, definition.opsNames);
      const serviceStatus = getStatusFromCheck(check);
      const statusReason = buildStatusReason(check, serviceStatus);
      return {
        key: definition.key,
        label: definition.label,
        icon: definition.icon,
        status: serviceStatus,
        statusText: statusReason,
        statusReason,
        latencyMs: check?.latencyMs ?? null,
        lastDeploy:
          definition.key === "API"
            ? formatDeployLabel(status.data?.api.timestamp, status.data?.api.buildSha)
            : "unknown",
        check,
      } satisfies ServiceSnapshot;
    });
  }, [status.data]);

  const counts = useMemo(() => {
    const degraded = serviceSnapshots.filter((s) => s.status === "degraded").length;
    const outage = serviceSnapshots.filter((s) => s.status === "outage").length;
    const unknown = serviceSnapshots.filter((s) => s.status === "unknown").length;
    return { degraded, outage, unknown, total: serviceSnapshots.length };
  }, [serviceSnapshots]);

  const overallStatus = useMemo(() => {
    if (!status.data) {
      return { label: "Telemetry unavailable", tone: "unknown" as const };
    }
    if (status.data.db.ok === false) {
      return { label: "Major Outage", tone: "down" as const };
    }
    if (counts.outage > 0) {
      return { label: "Partial Outage", tone: "down" as const };
    }
    if (counts.degraded > 0) {
      return { label: "Degraded", tone: "warn" as const };
    }
    return { label: "Operational", tone: "ok" as const };
  }, [counts, status.data]);

  const healthScore = computeHealthScore(
    counts.degraded,
    counts.outage,
    counts.unknown,
    status.data?.db.ok ?? null,
  );

  useEffect(() => {
    if (!activeService) return;
    const updated = serviceSnapshots.find(
      (service) => service.key === activeService.key,
    );
    if (updated) {
      setActiveService(updated);
    }
  }, [activeService, serviceSnapshots]);

  const avgLatency = useMemo(() => {
    const values = serviceSnapshots
      .map((service) => service.latencyMs)
      .filter((value): value is number => value !== null);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [serviceSnapshots]);

  const latestMetricsIndex = platformMetrics.data?.timestamps.length
    ? platformMetrics.data.timestamps.length - 1
    : null;

  const avgErrorRate =
    latestMetricsIndex !== null
      ? platformMetrics.data?.errorRate[latestMetricsIndex] ?? null
      : counts.total
        ? counts.outage / counts.total
        : null;

  const avgAvailability =
    avgErrorRate !== null ? Math.max(0, 100 - avgErrorRate * 100) : null;

  const avgP95Latency =
    latestMetricsIndex !== null
      ? platformMetrics.data?.latencyP95[latestMetricsIndex] ?? avgLatency
      : avgLatency;

  const trend = useMemo(() => {
    const metrics = platformMetrics.data;
    if (!metrics) {
      return { latency: [], errorRate: [], requests: [] };
    }
    return {
      latency: metrics.timestamps.map((timestamp, index) => ({
        timestamp,
        value: metrics.latencyP95[index] ?? null,
      })),
      errorRate: metrics.timestamps.map((timestamp, index) => ({
        timestamp,
        value:
          metrics.errorRate[index] !== null && metrics.errorRate[index] !== undefined
            ? metrics.errorRate[index] * 100
            : null,
      })),
      requests: metrics.timestamps.map((timestamp, index) => ({
        timestamp,
        value: metrics.requestsPerMin[index] ?? null,
      })),
    };
  }, [platformMetrics.data]);

  const lastUpdated = status.data?.api.timestamp
    ? new Date(status.data.api.timestamp)
    : null;
  const dependencies = status.data?.dependencies;
  const dataAgeMs = lastUpdated ? Date.now() - lastUpdated.getTime() : null;
  const staleThresholdMs = refreshMs > 0 ? refreshMs * 2 : 300_000;
  const isStale =
    Boolean(status.error) ||
    (dataAgeMs !== null && dataAgeMs > staleThresholdMs);

  const copyLabel = useMemo(() => {
    const lines = [
      `Platform Health - ${overallStatus.label}`,
      `Updated: ${status.data?.api.timestamp ?? "unknown"}`,
      `DB: ${status.data?.db.ok ? "OK" : "Down"}`,
      ...serviceSnapshots.map(
        (service) => `${service.label}: ${service.status}`,
      ),
    ];
    return lines.join("\n");
  }, [overallStatus.label, serviceSnapshots, status.data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyLabel);
    } catch {
      // ignore clipboard errors
    }
  };

  if (status.isLoading && !status.data) {
    return <HealthSkeleton />;
  }

  if (status.error && !status.data) {
    return (
      <TelemetryBanner
        message={`API did not respond to /ops/status. ${status.error}`}
        requestUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/api/ops/status?range=${range}`}
        onRetry={status.refresh}
      />
    );
  }

  return (
    <Tooltip.Provider>
      <div className="flex flex-col gap-6">
        <OverallHealthHeader
          statusLabel={overallStatus.label}
          statusTone={overallStatus.tone}
          healthScore={healthScore}
          serviceCounts={{
            total: counts.total,
            degraded: counts.degraded,
            outage: counts.outage,
          }}
          kpis={{
            availability: avgAvailability,
            errorRate: avgErrorRate !== null ? avgErrorRate * 100 : null,
            p95Latency: avgP95Latency !== null ? Math.round(avgP95Latency) : null,
            dbLatency: status.data?.db.latencyMs ?? null,
            dbOk: status.data?.db.ok ?? null,
          }}
          trend={trend}
          activeTrend={activeTrend}
          onTrendChange={setActiveTrend}
          range={range}
          onRangeChange={setRange}
          refreshMs={refreshMs}
          onRefreshChange={setRefreshMs}
          lastUpdated={lastUpdated}
          isRefreshing={status.isRefreshing}
          onCopySummary={handleCopy}
          onCreateIncident={() => {
            setIncidentNotice("Incident tooling is not wired yet.");
            setTimeout(() => setIncidentNotice(null), 2500);
          }}
          onRefreshNow={status.refresh}
        />

        {incidentNotice ? (
          <p className="text-xs text-slate-500">{incidentNotice}</p>
        ) : null}

        {isStale ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Data delayed. Telemetry updates may be behind the latest checks.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {serviceSnapshots.map((service) => (
            <ServiceHealthCard
              key={service.key}
              snapshot={service}
              range={range}
              refreshMs={refreshMs}
              onOpen={() => setActiveService(service)}
            />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Incidents & Alerts
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Last 30 days
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                No active incidents. Latest checks are stable.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Platform Dependencies
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Live checks
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DependencyTile
                label="Database"
                status={status.data?.db.ok ? "Healthy" : "Down"}
                metric={
                  status.data?.db.latencyMs
                    ? `${status.data.db.latencyMs} ms`
                    : "--"
                }
              />
              <DependencyTile
                label="Auth (Clerk)"
                status={
                  dependencies?.auth.ok === null || dependencies?.auth.ok === undefined
                    ? "Unknown"
                    : dependencies.auth.ok
                      ? "Healthy"
                      : "Down"
                }
                metric={
                  dependencies?.auth.latencyMs
                    ? `${dependencies.auth.latencyMs} ms`
                    : "Telemetry pending"
                }
              />
              <DependencyTile
                label="Storage (R2)"
                status={
                  dependencies?.storage.ok === null || dependencies?.storage.ok === undefined
                    ? "Unknown"
                    : dependencies.storage.ok
                      ? "Healthy"
                      : "Down"
                }
                metric={
                  dependencies?.storage.latencyMs
                    ? `${dependencies.storage.latencyMs} ms`
                    : "Telemetry pending"
                }
              />
            </div>
          </div>
        </div>

        <ServiceHealthDrawer
          open={Boolean(activeService)}
          snapshot={activeService}
          range={range}
          refreshMs={refreshMs}
          dependencies={status.data?.dependencies ?? null}
          onClose={() => setActiveService(null)}
        />
      </div>
    </Tooltip.Provider>
  );
}

type DependencyTileProps = {
  label: string;
  status: string;
  metric: string;
};

function DependencyTile({ label, status, metric }: DependencyTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{status}</p>
      <p className="mt-1 text-xs text-slate-500">{metric}</p>
    </div>
  );
}
