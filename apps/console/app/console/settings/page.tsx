import { PageHeader } from "../_components/PageHeader";

export default function SettingsPage() {
  const allowlist = process.env.CONSOLE_FOUNDER_ALLOWLIST ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Founder configuration, roles, and integration status."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Founder allowlist
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Read-only view of CONSOLE_FOUNDER_ALLOWLIST.
        </p>
        <pre className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          {allowlist || "Not configured"}
        </pre>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Role management, feature flag registry, and integration checks will be
        implemented here.
      </div>
    </div>
  );
}
