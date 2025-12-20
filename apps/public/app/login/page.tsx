export const metadata = { title: "Sign In" };

import Link from "next/link";

import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

const staffBaseUrl = process.env.PB_STAFF_BASE_URL;
const portalBaseUrl = process.env.PB_PORTAL_BASE_URL;
const isMissingBaseUrl = !staffBaseUrl || !portalBaseUrl;
const showMissingWarning = process.env.NODE_ENV !== "production" && isMissingBaseUrl;

function joinUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${trimmedBase}${normalizedPath}`;
}

const staffUrl = staffBaseUrl ? joinUrl(staffBaseUrl, "/sign-in") : undefined;
const portalUrl = portalBaseUrl ? joinUrl(portalBaseUrl, "/sign-in") : undefined;

const portals = [
  {
    label: "Resident Portal",
    title: "Resident sign-in",
    description: "Access maintenance updates, payments, and community notices.",
    href: portalUrl,
  },
  {
    label: "Staff Portal",
    title: "Staff sign-in",
    description: "Manage work orders, leasing, and resident communications.",
    href: staffUrl,
  },
  {
    label: "BridgeWorks Console",
    title: "Console sign-in",
    description: "Org-level oversight, analytics, and configuration tools.",
    href: staffUrl,
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={layout.container}>
          <div className="max-w-2xl">
            <p className={layout.eyebrow}>Sign In</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Choose your portal
            </h1>
            <p className={cn(layout.body, "mt-3")}>
              Pick the experience that matches your role to continue.
            </p>
            {showMissingWarning ? (
              <p className={cn(layout.body, "mt-3 text-amber-600 dark:text-amber-400")}>
                Missing PB_STAFF_BASE_URL or PB_PORTAL_BASE_URL. Set them in .env.local to
                enable sign-in routing.
              </p>
            ) : null}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {portals.map((portal) => (
              portal.href ? (
                <Link
                  key={portal.title}
                  href={portal.href}
                  className={cn(layout.card, "group transition hover:-translate-y-0.5")}
                >
                  <p className={layout.label}>{portal.label}</p>
                  <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {portal.title}
                  </h2>
                  <p className={cn(layout.body, "mt-2")}>{portal.description}</p>
                  <div className="mt-6 inline-flex items-center text-sm font-semibold text-teal-700 group-hover:text-teal-600 dark:text-teal-400 dark:group-hover:text-teal-300">
                    Continue
                  </div>
                </Link>
              ) : (
                <div
                  key={portal.title}
                  className={cn(
                    layout.card,
                    "group cursor-not-allowed opacity-60"
                  )}
                  aria-disabled="true"
                >
                  <p className={layout.label}>{portal.label}</p>
                  <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {portal.title}
                  </h2>
                  <p className={cn(layout.body, "mt-2")}>{portal.description}</p>
                  <div className="mt-6 inline-flex items-center text-sm font-semibold text-teal-700 dark:text-teal-400">
                    Continue
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
