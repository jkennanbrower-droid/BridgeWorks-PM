import Link from "next/link";

import { getPrisma } from "db";

import { PageHeader } from "./_components/PageHeader";
import { StatCard } from "./_components/StatCard";

export default async function ConsoleHomePage() {
  const prisma = getPrisma();

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    activeOrgCount,
    newOrg7d,
    newOrg30d,
    activePeople,
    pendingApps,
    failedProvisioning,
    recentAudit,
  ] = await Promise.all([
    prisma.organization.count({ where: { status: "active" } }),
    prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.person.count({ where: { status: "active" } }),
    prisma.onboardingApplication.count({ where: { status: "submitted" } }),
    prisma.onboardingApplication.count({
      where: { status: "provisioning_failed" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        subtitle="Live platform signals, queues, and operational highlights."
        actions={
          <Link
            href="/console/applications"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
          >
            Review applications
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Orgs"
          value={`${activeOrgCount}`}
          subLabel="All active organizations"
          href="/console/orgs"
        />
        <StatCard
          label="New Orgs (7d)"
          value={`${newOrg7d}`}
          subLabel={`30d: ${newOrg30d}`}
          href="/console/orgs"
        />
        <StatCard
          label="Active Users"
          value={`${activePeople}`}
          subLabel="Active platform users"
          href="/console/users"
        />
        <StatCard
          label="Pending Apps"
          value={`${pendingApps}`}
          subLabel={`Failures: ${failedProvisioning}`}
          href="/console/applications"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Applications awaiting review
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Keep onboarding moving by approving or requesting more info.
          </p>
          <div className="mt-4">
            <Link
              href="/console/applications"
              className="text-sm font-semibold text-teal-700 hover:text-teal-600"
            >
              Open applications queue
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent audit activity
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {recentAudit.length === 0 ? (
              <p>No audit events yet.</p>
            ) : (
              recentAudit.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{entry.action}</p>
                    <p className="text-xs text-slate-500">{entry.targetType}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {entry.createdAt.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
