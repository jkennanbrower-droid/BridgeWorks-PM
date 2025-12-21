import Link from "next/link";

import { getPrisma } from "db";

import { PageHeader } from "../_components/PageHeader";
import { CreateOrgDialog } from "./CreateOrgDialog";

export default async function OrgsPage() {
  const prisma = getPrisma();
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizations"
        subtitle="Manage org access, status, and health signals."
        actions={<CreateOrgDialog />}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No organizations yet.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-t border-slate-100">
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {org.name}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{org.status}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {org.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/console/orgs/${org.id}`}
                      className="text-sm font-semibold text-teal-700 hover:text-teal-600"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
