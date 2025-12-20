import Link from "next/link";

export default function ConsoleHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-600">
          Review submitted onboarding applications and provision new organizations.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/console/applications"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
        >
          View applications
        </Link>
      </div>
    </div>
  );
}
