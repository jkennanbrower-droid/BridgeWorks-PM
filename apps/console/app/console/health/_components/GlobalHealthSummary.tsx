type StatusPillProps = {
  label: string;
  tone: "ok" | "warn" | "down" | "unknown";
};

type GlobalHealthSummaryProps = {
  overallStatus: StatusPillProps;
  incidents: { sev1: number; sev2: number; sev3: number };
  kpis: {
    apiAvailability: string;
    apiErrorRate: string;
    apiP95Latency: string;
    dbStatus: string;
  };
  warning?: string | null;
};

const STATUS_TONES: Record<StatusPillProps["tone"], string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  down: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

export function GlobalHealthSummary({
  overallStatus,
  incidents,
  kpis,
  warning,
}: GlobalHealthSummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_TONES[overallStatus.tone]}`}
        >
          {overallStatus.label}
        </span>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            SEV1 {incidents.sev1}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            SEV2 {incidents.sev2}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            SEV3 {incidents.sev3}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            API availability {kpis.apiAvailability}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            API error rate {kpis.apiErrorRate}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            API p95 {kpis.apiP95Latency}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            DB {kpis.dbStatus}
          </span>
        </div>

        {warning ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            {warning}
          </span>
        ) : null}
      </div>
    </div>
  );
}
