"use client";

import { useEffect, useRef } from "react";

import type { ServiceHealth } from "../_data/healthTypes";

type ServiceHealthDrawerProps = {
  open: boolean;
  service: ServiceHealth | null;
  onClose: () => void;
};

const STATUS_TONES: Record<ServiceHealth["status"], string> = {
  operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-700",
  outage: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

export function ServiceHealthDrawer({
  open,
  service,
  onClose,
}: ServiceHealthDrawerProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      lastActiveRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 h-full w-full rounded-t-2xl bg-white shadow-xl md:max-w-2xl md:rounded-none">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {service.label}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {service.statusLabel}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {service.statusReason}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_TONES[service.status]}`}
              >
                {service.statusLabel}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Overview
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <a
                    href={service.links.errors}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-slate-300"
                  >
                    Errors
                  </a>
                  <a
                    href={service.links.traces}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-slate-300"
                  >
                    Traces
                  </a>
                  <a
                    href={service.links.logs}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-slate-300"
                  >
                    Logs
                  </a>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Last deploy {service.lastDeploy}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Golden signals
                </h3>
                <div className="mt-3 grid gap-3 text-xs text-slate-500">
                  {/* TODO: Replace placeholders with /ops/metrics series once available. */}
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    Requests/min chart placeholder
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    Error rate chart placeholder
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    Latency p50/p95/p99 chart placeholder
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Top problems
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Top failing routes: none detected.</li>
                  <li>Top errors: none reported.</li>
                  <li>Slowest endpoints: telemetry pending.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Dependencies
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>DB: {service.key === "API" ? "See summary" : "Unknown"}</li>
                  <li>Auth (Clerk): Unknown</li>
                  <li>Storage (R2/S3): Unknown</li>
                </ul>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deployments & changes
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Latest deploy: {service.lastDeploy}</li>
                <li>Recent changes: none correlated yet.</li>
                <li>Next rollout window: not scheduled.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
