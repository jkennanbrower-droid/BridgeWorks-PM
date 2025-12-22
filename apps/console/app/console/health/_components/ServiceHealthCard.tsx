import type { MouseEvent } from "react";

import type { ServiceHealth } from "../_data/healthTypes";

const STATUS_STYLES: Record<
  ServiceHealth["status"],
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

type ServiceHealthCardProps = {
  service: ServiceHealth;
  onOpen: () => void;
};

function shouldIgnoreCardClick(event: MouseEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return Boolean(target.closest("a"));
}

export function ServiceHealthCard({ service, onOpen }: ServiceHealthCardProps) {
  const statusStyle = STATUS_STYLES[service.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (shouldIgnoreCardClick(event)) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {service.label}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {service.statusReason}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyle.className}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Availability
          </p>
          <p className="mt-1 text-sm text-slate-900">{service.availability}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Error rate
          </p>
          <p className="mt-1 text-sm text-slate-900">{service.errorRate}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            p95 latency
          </p>
          <p className="mt-1 text-sm text-slate-900">{service.p95Latency}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>Last deploy {service.lastDeploy}</span>
        {service.topIssue ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
            {service.topIssue}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
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
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-slate-300"
        >
          Details
        </button>
      </div>
    </div>
  );
}
