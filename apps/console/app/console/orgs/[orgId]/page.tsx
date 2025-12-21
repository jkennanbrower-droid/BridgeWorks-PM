import { notFound } from "next/navigation";

import { getPrisma } from "db";

import { PageHeader } from "../../_components/PageHeader";

export default async function OrgDetailPage({
  params,
}: {
  params: { orgId: string };
}) {
  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
  });

  if (!org) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={org.name}
        subtitle={`Org ID: ${org.id}`}
        actions={
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300">
              Suspend
            </button>
            <button className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300">
              Delete
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">{org.status}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Created
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {org.createdAt.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Primary contact
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {org.primaryContactEmail ?? "Not set"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Health status
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {org.healthStatus ?? "Unknown"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Additional org tabs (Health, Users, Data, Migrations, Flags) will live here.
      </div>
    </div>
  );
}
