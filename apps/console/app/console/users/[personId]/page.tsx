import { notFound } from "next/navigation";

import { getPrisma } from "db";

import { PageHeader } from "../../_components/PageHeader";

export default async function UserDetailPage({
  params,
}: {
  params: { personId: string };
}) {
  const prisma = getPrisma();
  const person = await prisma.person.findUnique({
    where: { id: params.personId },
  });

  if (!person) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={person.name ?? person.email}
        subtitle={`User ID: ${person.id}`}
        actions={
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300">
              Disable
            </button>
            <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300">
              Edit roles
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Platform Role
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {person.platformRole ?? "unassigned"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status
          </h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">{person.status}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Membership, security, and audit tabs will be implemented here.
      </div>
    </div>
  );
}
