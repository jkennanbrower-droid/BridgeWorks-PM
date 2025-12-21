import { notFound } from "next/navigation";

import { getPrisma } from "db";

import { PageHeader } from "../../_components/PageHeader";
import { UserActions } from "./UserActions";

export default async function UserDetailPage({
  params,
}: {
  params: { personId: string };
}) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!isUuid.test(params.personId)) {
    notFound();
  }

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
          <UserActions
            personId={person.id}
            name={person.name}
            email={person.email}
            platformRole={person.platformRole}
            status={person.status}
            clerkUserId={person.clerkUserId}
          />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Clerk
          </h2>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {person.clerkUserId ?? "No Clerk account linked"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Membership, security, and audit tabs will be implemented here.
      </div>
    </div>
  );
}
