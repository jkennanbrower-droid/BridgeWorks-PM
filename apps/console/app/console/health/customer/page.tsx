import Link from "next/link";

import { getPrisma } from "db";

import { PageHeader } from "../../_components/PageHeader";
import { HEALTH_STATUS_LABELS } from "../../orgs/constants";

const HEALTH_TABS = [
  { value: "platform", label: "Platform Health", href: "/console/health/platform" },
  { value: "customer", label: "Customer Health", href: "/console/health/customer" },
] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomerHealthPage() {
  const orgs = await getPrisma().organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      name: true,
      status: true,
      healthStatus: true,
      createdAt: true,
    },
  });

  const healthSummary = orgs.reduce(
    (acc, org) => {
      const key = org.healthStatus ?? "unknown";
      if (key in acc) {
        acc[key as keyof typeof acc] += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    { healthy: 0, degraded: 0, down: 0, unknown: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customer Health"
        subtitle="Org health rollups from customer signals and admin updates."
        actions={
          <div className="flex flex-wrap gap-2">
            {HEALTH_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tab.href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  tab.value === "customer"
                    ? "border-black bg-black text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { key: "healthy", label: "Healthy" },
            { key: "degraded", label: "Degraded" },
            { key: "down", label: "Down" },
            { key: "unknown", label: "Unknown" },
          ].map((status) => (
            <div
              key={status.key}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {status.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {healthSummary[status.key as keyof typeof healthSummary]}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Last 25 orgs by creation date.
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No organization health data yet.
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
                      {org.healthStatus && org.healthStatus in HEALTH_STATUS_LABELS
                        ? HEALTH_STATUS_LABELS[
                            org.healthStatus as keyof typeof HEALTH_STATUS_LABELS
                          ]
                        : "Unknown"}
                    </td>
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
    </div>
  );
}
