import { PageHeader } from "../_components/PageHeader";

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metrics"
        subtitle="Platform growth and activation trends."
        actions={
          <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300">
            Export CSV
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Metric charts will render here once platform metrics tables are live.
      </div>
    </div>
  );
}
