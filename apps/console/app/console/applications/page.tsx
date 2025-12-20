import Link from "next/link";

import { getPrisma } from "db";

import { PageHeader } from "../_components/PageHeader";

const STATUS_TABS = [
  { value: "submitted", label: "Submitted" },
  { value: "provisioning", label: "Provisioning" },
  { value: "provisioned", label: "Provisioned" },
  { value: "rejected", label: "Rejected" },
  { value: "provisioning_failed", label: "Failed" },
] as const;

type ApplicationStatusTab = (typeof STATUS_TABS)[number]["value"];

function isApplicationStatusTab(value: string): value is ApplicationStatusTab {
  return STATUS_TABS.some((tab) => tab.value === value);
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const statusParam =
    typeof searchParams?.status === "string" ? searchParams.status : "submitted";
  const activeStatus: ApplicationStatusTab = isApplicationStatusTab(statusParam)
    ? statusParam
    : "submitted";

  const prisma = getPrisma();
  const applications = await prisma.onboardingApplication.findMany({
    where: { status: activeStatus },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        subtitle="Review onboarding requests and manage provisioning."
        actions={
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/console/applications?status=${tab.value}`}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeStatus === tab.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        }
      />
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
                  No {activeStatus.replace("_", " ")} applications right now.
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
