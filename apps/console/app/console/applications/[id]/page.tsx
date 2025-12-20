import { notFound, redirect } from "next/navigation";

import { getPrisma } from "db";

import { ApplicationActions } from "./ApplicationActions";

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  if (!id || id.trim().length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[console] ApplicationDetailPage missing params.id; redirecting to /console/applications",
        { params: resolvedParams }
      );
    }
    redirect("/console/applications");
  }

  const prisma = getPrisma();
  const application = await prisma.onboardingApplication.findUnique({
    where: { id },
  });

  if (!application) {
    notFound();
  }

  const organization = await prisma.organization.findFirst({
    where: { onboardingApplicationId: application.id },
  });
  const invite = organization
    ? await prisma.invite.findFirst({
        where: { orgId: organization.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Application
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{application.orgName}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Status: <span className="font-semibold">{application.status}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-slate-400">Name</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.contactName)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Email</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.contactEmail)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Phone</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.contactPhone)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Portfolio
          </h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-slate-400">Types</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.portfolioTypes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Properties</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.approxProperties)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Units</dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.approxUnits)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">
                Current software
              </dt>
              <dd className="font-medium text-slate-800">
                {formatValue(application.currentSoftware)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
          {formatValue(application.notes)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Provisioning
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <p>Organization ID: {formatValue(organization?.id)}</p>
          <p>Invite status: {formatValue(invite?.status)}</p>
        </div>
        <ApplicationActions
          applicationId={application.id}
          status={application.status}
          provisionedOrgId={application.provisionedOrgId}
          inviteStatus={invite?.status ?? null}
        />
      </div>
    </div>
  );
}
