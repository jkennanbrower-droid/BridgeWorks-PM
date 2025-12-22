"use client";

import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { format } from "date-fns";
import { Play, X } from "lucide-react";

import type { OpsStressStatusResponse } from "../_data/opsTypes";

export type StressConfig = {
  durationSec: number;
  rps: number;
  concurrency: number;
  bytes: number;
  ms: number;
  targets: string[];
};

type StressTestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: StressConfig;
  onConfigChange: (next: StressConfig) => void;
  onRun: () => void;
  status: OpsStressStatusResponse | null;
  isRunning: boolean;
  error: string | null;
};

const TARGET_OPTIONS = [
  { key: "api", label: "API" },
  { key: "public", label: "Public" },
  { key: "user", label: "User" },
  { key: "staff", label: "Staff" },
  { key: "org", label: "Org" },
  { key: "console", label: "Console" },
];

export function StressTestDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onRun,
  status,
  isRunning,
  error,
}: StressTestDialogProps) {
  const hasStatus = Boolean(status);
  const summary = status?.summary;
  const startedAt = status?.startedAt
    ? format(new Date(status.startedAt), "h:mm a")
    : null;
  const finishedAt = status?.finishedAt
    ? format(new Date(status.finishedAt), "h:mm a")
    : null;

  const targetsText = useMemo(
    () => config.targets.map((value) => value.toUpperCase()).join(", "),
    [config.targets],
  );

  const toggleTarget = (key: string) => {
    const exists = config.targets.includes(key);
    const nextTargets = exists
      ? config.targets.filter((target) => target !== key)
      : [...config.targets, key];
    onConfigChange({ ...config, targets: nextTargets });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  Stress Test
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-600">
                  Generate safe synthetic load on selected services.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Configuration
                </p>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    Duration (sec)
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={config.durationSec}
                      onChange={(event) =>
                        onConfigChange({
                          ...config,
                          durationSec: Number(event.target.value || 0),
                        })
                      }
                      className="h-9 w-24 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    Requests/sec
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={config.rps}
                      onChange={(event) =>
                        onConfigChange({
                          ...config,
                          rps: Number(event.target.value || 0),
                        })
                      }
                      className="h-9 w-24 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    Concurrency
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={config.concurrency}
                      onChange={(event) =>
                        onConfigChange({
                          ...config,
                          concurrency: Number(event.target.value || 0),
                        })
                      }
                      className="h-9 w-24 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    Payload (bytes)
                    <input
                      type="number"
                      min={0}
                      max={262144}
                      value={config.bytes}
                      onChange={(event) =>
                        onConfigChange({
                          ...config,
                          bytes: Number(event.target.value || 0),
                        })
                      }
                      className="h-9 w-24 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    Delay (ms)
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={config.ms}
                      onChange={(event) =>
                        onConfigChange({
                          ...config,
                          ms: Number(event.target.value || 0),
                        })
                      }
                      className="h-9 w-24 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Targets
                </p>
                <div className="mt-3 grid gap-2">
                  {TARGET_OPTIONS.map((target) => (
                    <label
                      key={target.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      {target.label}
                      <input
                        type="checkbox"
                        checked={config.targets.includes(target.key)}
                        onChange={() => toggleTarget(target.key)}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Selected: {targetsText || "None"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRun}
                disabled={isRunning || config.targets.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                {isRunning ? "Running stress test" : "Run Stress Test"}
              </button>
              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            </div>

            <AnimatePresence mode="wait">
              {hasStatus ? (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Live Status
                    </p>
                    <span className="text-xs font-semibold text-slate-500">
                      {startedAt ? `Started ${startedAt}` : "Not started"}
                      {finishedAt ? ` · Finished ${finishedAt}` : ""}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Sent
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        <CountUp end={summary?.sent ?? 0} preserveValue />
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Errors
                      </p>
                      <p className="text-lg font-semibold text-rose-600">
                        <CountUp end={summary?.errors ?? 0} preserveValue />
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        P95 Latency
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {summary?.p95LatencyMs !== null &&
                        summary?.p95LatencyMs !== undefined ? (
                          <>
                            <CountUp end={summary.p95LatencyMs} preserveValue decimals={0} />
                            <span className="text-xs text-slate-500"> ms</span>
                          </>
                        ) : (
                          "--"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {status?.targets.map((target) => (
                      <div
                        key={target.key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-slate-700">{target.label}</span>
                        <span className="text-slate-500">
                          {target.errors} err ·{" "}
                          {target.p95LatencyMs !== null && target.p95LatencyMs !== undefined
                            ? `${Math.round(target.p95LatencyMs)} ms p95`
                            : "--"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {status?.skippedTargets?.length ? (
                    <div className="mt-3 text-xs text-slate-500">
                      Skipped:{" "}
                      {status.skippedTargets
                        .map((target) => `${target.key} (${target.reason})`)
                        .join(", ")}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
