import { PageHeader } from "../_components/PageHeader";

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support Tools"
        subtitle="Lookup orgs and users, resend invites, and create support sessions."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Org lookup</h2>
          <p className="mt-2 text-sm text-slate-600">
            Search by org name or ID to jump directly to detail tabs.
          </p>
          <input
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search orgs"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">User lookup</h2>
          <p className="mt-2 text-sm text-slate-600">
            Find a user to resend invites or check status.
          </p>
          <input
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search users"
          />
        </div>
      </div>
    </div>
  );
}
