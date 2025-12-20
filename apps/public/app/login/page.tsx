export const metadata = { title: "Sign In" };

import Link from "next/link";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function joinUrl(baseUrl: string, path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${stripTrailingSlash(baseUrl)}${path}`;
}

export default function Page() {
  const staffBaseUrl = process.env.PB_STAFF_BASE_URL;
  const portalBaseUrl = process.env.PB_PORTAL_BASE_URL;

  if (!staffBaseUrl) throw new Error("PB_STAFF_BASE_URL is not set");
  if (!portalBaseUrl) throw new Error("PB_PORTAL_BASE_URL is not set");

  const staffUrl = joinUrl(staffBaseUrl, "/");
  const portalUrl = joinUrl(portalBaseUrl, "/");

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Sign In
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Choose your login
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
          Select Staff or User to continue.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={staffUrl}
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90 dark:focus-visible:ring-offset-black"
          >
            Staff login
          </Link>
          <Link
            href={portalUrl}
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
          >
            User Login
          </Link>
        </div>
      </div>
    </div>
  );
}

