import { PageHeader } from "../_components/PageHeader";

export default function HealthPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform Health"
        subtitle="Service status and operational signals across BridgeWorks."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {[
          "Public",
          "User",
          "Staff",
          "Org",
          "API",
          "Console",
        ].map((service) => (
          <div
            key={service}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {service}
            </p>
            <p className="mt-3 text-lg font-semibold text-emerald-700">
              Operational
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Live telemetry not configured yet.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
