"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import CountUp from "react-countup";

import { Sparkline } from "./charts/Sparkline";
import { useServiceMetrics } from "../_hooks/useServiceMetrics";
import type { ServiceSnapshot } from "../_data/healthModels";

type ServiceHealthCardProps = {
  snapshot: ServiceSnapshot;
  range: string;
  refreshMs: number;
  onOpen: () => void;
};

const STATUS_STYLES: Record<
  ServiceSnapshot["status"],
  { label: string; className: string }
> = {
  operational: {
    label: "Operational",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  degraded: {
    label: "Degraded",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  outage: {
    label: "Outage",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  unknown: {
    label: "Unknown",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

const FALLBACK_AVAILABILITY: Record<ServiceSnapshot["status"], number | null> = {
  operational: 100,
  degraded: 99,
  outage: 0,
  unknown: null,
};

export function ServiceHealthCard({
  snapshot,
  range,
  refreshMs,
  onOpen,
}: ServiceHealthCardProps) {
  const { data: metrics } = useServiceMetrics(snapshot.key, range, refreshMs);
  const statusStyle = STATUS_STYLES[snapshot.status];

  const lastIndex = metrics?.timestamps.length
    ? metrics.timestamps.length - 1
    : null;
  const lastLatency =
    lastIndex !== null ? metrics?.latencyP95[lastIndex] ?? null : null;
  const lastErrorRate =
    lastIndex !== null ? metrics?.errorRate[lastIndex] ?? null : null;

  const errorRatePct = lastErrorRate !== null ? lastErrorRate * 100 : null;
  const availability =
    errorRatePct !== null
      ? Math.max(0, 100 - errorRatePct)
      : FALLBACK_AVAILABILITY[snapshot.status];
  const p95Latency =
    lastLatency !== null
      ? Math.round(lastLatency)
      : snapshot.latencyMs
        ? Math.round(snapshot.latencyMs)
        : null;

  const sparklineLatency = useMemo(
    () =>
      metrics?.timestamps.map((timestamp, index) => ({
        timestamp,
        value: metrics.latencyP95[index] ?? null,
      })) ?? [],
    [metrics],
  );

  const sparklineErrors = useMemo(
    () =>
      metrics?.timestamps.map((timestamp, index) => ({
        timestamp,
        value:
          metrics.errorRate[index] !== null && metrics.errorRate[index] !== undefined
            ? metrics.errorRate[index] * 100
            : null,
      })) ?? [],
    [metrics],
  );

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      onClick={onOpen}
      className="flex h-full cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="text-left" aria-label={`Open ${snapshot.label} details`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600">
              <snapshot.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {snapshot.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {snapshot.statusText}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyle.className}`}
          >
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
        <MetricChip label="Availability" value={availability} suffix="%" decimals={2} />
        <MetricChip label="Error rate" value={errorRatePct} suffix="%" decimals={2} />
        <MetricChip label="P95 latency" value={p95Latency} suffix="ms" decimals={0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Latency
          </p>
          <Sparkline data={sparklineLatency} color="#2563eb" height={64} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Error rate
          </p>
          <Sparkline data={sparklineErrors} color="#db2777" height={64} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>Last deploy {snapshot.lastDeploy}</span>
        <span>{snapshot.statusReason}</span>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <ActionButton
          label="Errors"
          href={`/console/health/platform/errors?service=${snapshot.key}`}
        />
        <ActionButton
          label="Traces"
          href={`/console/health/platform/traces?service=${snapshot.key}`}
        />
        <ActionButton
          label="Logs"
          href={`/console/health/platform/logs?service=${snapshot.key}`}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}

type MetricChipProps = {
  label: string;
  value: number | null;
  suffix?: string;
  decimals?: number;
};

function MetricChip({ label, value, suffix, decimals = 2 }: MetricChipProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900">
        {value === null ? (
          "--"
        ) : (
          <CountUp end={value} decimals={decimals} duration={0.5} preserveValue />
        )}
        {suffix ? <span className="text-xs text-slate-500"> {suffix}</span> : null}
      </p>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  href: string;
};

function ActionButton({ label, href }: ActionButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
        >
          {label}
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white"
        >
          View {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
