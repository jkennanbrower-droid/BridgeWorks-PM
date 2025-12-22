"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { Filter, X } from "lucide-react";

import { LineChartPanel } from "./charts/LineChartPanel";
import { LatencyChartPanel } from "./charts/LatencyChartPanel";
import { ErrorsTable } from "./tables/ErrorsTable";
import { LogsListVirtual } from "./lists/LogsListVirtual";
import { TracesListVirtual } from "./lists/TracesListVirtual";
import { useServiceMetrics } from "../_hooks/useServiceMetrics";
import { useServiceErrors } from "../_hooks/useServiceErrors";
import { useServiceTraces } from "../_hooks/useServiceTraces";
import { useServiceLogs } from "../_hooks/useServiceLogs";
import type { OpsStatusResponse } from "../_data/opsTypes";
import type { ServiceSnapshot } from "../_data/healthModels";

type ServiceHealthDrawerProps = {
  open: boolean;
  snapshot: ServiceSnapshot | null;
  range: string;
  refreshMs: number;
  dependencies?: OpsStatusResponse["dependencies"] | null;
  onClose: () => void;
};

const TAB_CLASSES =
  "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white";

export function ServiceHealthDrawer({
  open,
  snapshot,
  range,
  refreshMs,
  dependencies,
  onClose,
}: ServiceHealthDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [logLevel, setLogLevel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const serviceKey = snapshot?.key ?? "API";
  const metrics = useServiceMetrics(serviceKey, range, refreshMs);
  const errors = useServiceErrors(serviceKey, range, searchQuery);
  const traces = useServiceTraces(serviceKey, range, searchQuery);
  const logs = useServiceLogs(serviceKey, range, logLevel, searchQuery);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const latencySeries = useMemo(
    () =>
      metrics.data?.timestamps.map((timestamp, index) => ({
        timestamp,
        p50: metrics.data?.latencyP50[index] ?? null,
        p95: metrics.data?.latencyP95[index] ?? null,
        p99: metrics.data?.latencyP99[index] ?? null,
      })) ?? [],
    [metrics.data],
  );

  const errorSeries = useMemo(
    () =>
      metrics.data?.timestamps.map((timestamp, index) => ({
        timestamp,
        value:
          metrics.data?.errorRate[index] !== null &&
          metrics.data?.errorRate[index] !== undefined
            ? metrics.data.errorRate[index] * 100
            : null,
      })) ?? [],
    [metrics.data],
  );

  const requestSeries = useMemo(
    () =>
      metrics.data?.timestamps.map((timestamp, index) => ({
        timestamp,
        value: metrics.data?.requestsPerMin[index] ?? null,
      })) ?? [],
    [metrics.data],
  );

  useEffect(() => {
    if (snapshot) {
      setActiveTab("overview");
      setSearchQuery("");
      setLogLevel("");
    }
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
          >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {snapshot.label}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    {snapshot.statusText}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {snapshot.statusReason}
                  </p>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-slate-200 px-6 py-3">
                  <Tabs.List className="flex flex-wrap gap-2">
                    <Tabs.Trigger value="overview" className={TAB_CLASSES}>
                      Overview
                    </Tabs.Trigger>
                    <Tabs.Trigger value="metrics" className={TAB_CLASSES}>
                      Metrics
                    </Tabs.Trigger>
                    <Tabs.Trigger value="errors" className={TAB_CLASSES}>
                      Errors
                    </Tabs.Trigger>
                    <Tabs.Trigger value="traces" className={TAB_CLASSES}>
                      Traces
                    </Tabs.Trigger>
                    <Tabs.Trigger value="logs" className={TAB_CLASSES}>
                      Logs
                    </Tabs.Trigger>
                  </Tabs.List>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <Tabs.Content value="overview">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Recent checks
                        </h3>
                        <div className="mt-3 text-sm text-slate-600">
                          <p>Status: {snapshot.check?.ok ? "OK" : "Failed"}</p>
                          <p>Latency: {snapshot.latencyMs ?? "--"} ms</p>
                          <p>Endpoint: {snapshot.check?.pathChecked ?? "--"}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Dependencies
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                          <DependencyBadge
                            label="DB"
                            ok={dependencies?.db.ok ?? null}
                          />
                          <DependencyBadge
                            label="Auth"
                            ok={dependencies?.auth.ok ?? null}
                          />
                          <DependencyBadge
                            label="Storage"
                            ok={dependencies?.storage.ok ?? null}
                          />
                        </div>
                      </div>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="metrics">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Requests/min
                        </p>
                        <LineChartPanel data={requestSeries} color="#16a34a" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Error rate
                        </p>
                        <LineChartPanel data={errorSeries} color="#db2777" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Latency p50 / p95 / p99
                        </p>
                        <LatencyChartPanel data={latencySeries} />
                      </div>
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2">
                        Top endpoints table will appear once metrics are ingested.
                      </div>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="errors">
                    <ErrorsTable items={errors.data?.items ?? []} />
                  </Tabs.Content>

                  <Tabs.Content value="traces">
                    <TracesListVirtual items={traces.data?.items ?? []} />
                  </Tabs.Content>

                  <Tabs.Content value="logs">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Popover.Root>
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            <Filter className="h-3 w-3" />
                            {logLevel ? `Level: ${logLevel}` : "Filter level"}
                          </button>
                        </Popover.Trigger>
                        <Popover.Content
                          sideOffset={8}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg"
                        >
                          <div className="flex flex-col gap-2">
                            {["", "info", "warn", "error"].map((level) => (
                              <button
                                key={level || "all"}
                                type="button"
                                onClick={() => setLogLevel(level)}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-left hover:border-slate-300"
                              >
                                {level ? level.toUpperCase() : "All levels"}
                              </button>
                            ))}
                          </div>
                        </Popover.Content>
                      </Popover.Root>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search logs"
                        className="h-9 flex-1 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <LogsListVirtual items={logs.data?.items ?? []} />
                  </Tabs.Content>
                </div>
              </Tabs.Root>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DependencyBadgeProps = {
  label: string;
  ok: boolean | null;
};

function DependencyBadge({ label, ok }: DependencyBadgeProps) {
  const tone =
    ok === null
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : ok
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}>
      {label} {ok === null ? "Pending" : ok ? "OK" : "Down"}
    </span>
  );
}
