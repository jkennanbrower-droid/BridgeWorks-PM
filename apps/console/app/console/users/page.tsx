import Link from "next/link";

import { getPrisma } from "db";

import { PageHeader } from "../_components/PageHeader";
import { InviteUserDialog } from "./InviteUserDialog";

export default async function UsersPage() {
  const prisma = getPrisma();
  const people = await prisma.person.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        subtitle="Manage platform staff and org membership access."
        actions={<InviteUserDialog />}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No users found yet.
                </td>
              </tr>
            ) : (
              people.map((person) => (
                <tr key={person.id} className="border-t border-slate-100">
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {person.name ?? "Unnamed"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{person.email}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {person.platformRole ?? "unassigned"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{person.status}</td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/console/users/${person.id}`}
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
