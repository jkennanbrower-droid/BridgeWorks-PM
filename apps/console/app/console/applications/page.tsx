import Link from "next/link";

import { getPrisma } from "db";

export default async function ApplicationsPage() {
  const prisma = getPrisma();
  const applications = await prisma.onboardingApplication.findMany({
    where: { status: "submitted" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Submitted applications</h2>
        <p className="mt-2 text-sm text-slate-600">
          Review new organization requests awaiting approval.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No submitted applications right now.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="border-t border-slate-100">
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {app.orgName}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {app.contactEmail}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {app.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/console/applications/${app.id}`}
                      className="text-sm font-semibold text-teal-700 hover:text-teal-600"
                    >
                      Review
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
