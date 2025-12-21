export const metadata = { title: "Sign In" };

import Link from "next/link";

import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

type Portal = {
  id: string;
  title: string;
  subtitle: string;
  note: string;
  tasks: string[];
  href: string | null;
  faqId: string;
  icon: React.ReactNode;
};

const staffBaseUrl = process.env.PB_STAFF_BASE_URL;
const portalBaseUrl = process.env.PB_PORTAL_BASE_URL;
const orgBaseUrl = process.env.NEXT_PUBLIC_ORG_APP_URL;
const consoleBaseUrl = process.env.NEXT_PUBLIC_CONSOLE_APP_URL;
const isMissingBaseUrl = !staffBaseUrl || !portalBaseUrl;
const showMissingWarning = isMissingBaseUrl;

if (showMissingWarning) {
  console.error("Sign-in base URLs are not configured. Buttons disabled.");
}

function joinUrl(baseUrl: string | undefined, path: string) {
  const trimmedBase = baseUrl?.trim();
  if (!trimmedBase) return null;
  const base = trimmedBase.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return null;
  return `${base}${normalizedPath}`;
}

const userUrl = joinUrl(portalBaseUrl, "/");
const staffUrl = joinUrl(staffBaseUrl, "/");
const ownerUrl = joinUrl(orgBaseUrl, "/");
const consoleUrl = joinUrl(consoleBaseUrl, "/console");

const portals: Portal[] = [
  {
    id: "user",
    title: "User Sign In",
    subtitle: "Tenants & Applicants",
    note: "Applying? Start here.",
    tasks: [
      "Pay rent",
      "Request maintenance",
      "Track updates",
      "Message your manager",
      "Upload documents",
    ],
    href: userUrl,
    faqId: "faq-user",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d="M12 2.75c-2.623 0-4.75 2.01-4.75 4.5 0 1.54.82 2.9 2.08 3.69-2.6.9-4.5 3.24-4.5 6.06v1.25h14.34V17c0-2.82-1.9-5.16-4.5-6.06 1.26-.79 2.08-2.15 2.08-3.69 0-2.49-2.127-4.5-4.75-4.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "staff",
    title: "Staff Sign In",
    subtitle: "Maintenance, property managers, case workers",
    note: "Staff access is typically invite-only.",
    tasks: [
      "Work orders",
      "Inspections",
      "Leasing & renewals",
      "Resident messaging",
      "Task management",
    ],
    href: staffUrl,
    faqId: "faq-staff",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d="M4 7.5c0-1.52 1.23-2.75 2.75-2.75h10.5C18.77 4.75 20 5.98 20 7.5v9c0 1.52-1.23 2.75-2.75 2.75H6.75C5.23 19.25 4 18.02 4 16.5v-9Zm4.25 1.75h7.5v1.5h-7.5v-1.5Zm0 3.5h5.5v1.5h-5.5v-1.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "owner",
    title: "Owner / Manager Sign In",
    subtitle: "Business owners & organization admins",
    note: "Organization access is typically invite-only.",
    tasks: [
      "Portfolio overview",
      "Statements & reporting",
      "Approvals",
      "Team management",
      "Billing",
    ],
    href: ownerUrl,
    faqId: "faq-owner",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d="M3 10.25 12 4l9 6.25v8.5a1.25 1.25 0 0 1-1.25 1.25h-5.5v-5h-4.5v5h-5.5A1.25 1.25 0 0 1 3 18.75v-8.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={cn(layout.section, "pb-8")}>
        <div className={layout.container}>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className={layout.eyebrow}>Sign In</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Sign in to BridgeWorks PM
              </h1>
              <p className={cn(layout.body, "mt-3")}>
                Choose the portal that matches your role.
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Secure sign-in powered by modern authentication.
              </p>
              {showMissingWarning ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Sign-in links are not configured yet. Please contact support.
                </div>
              ) : null}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <Link
                href="#support"
                className="font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
              >
                Need help?
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {portals.map((portal) => (
              <article
                key={portal.id}
                className={cn(
                  layout.card,
                  "flex h-full flex-col gap-6 border border-black/5 bg-white/80 dark:border-white/10 dark:bg-white/5"
                )}
                aria-labelledby={`${portal.id}-title`}
              >
                <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                  <span className="rounded-full bg-teal-50 p-2 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                    {portal.icon}
                  </span>
                  <div>
                    <h2
                      id={`${portal.id}-title`}
                      className="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                      {portal.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {portal.subtitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <ul className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    {portal.tasks.map((task) => (
                      <li key={task} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-teal-600/80 dark:bg-teal-400" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {portal.note}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  {portal.href ? (
                    <a
                      href={portal.href}
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-black"
                    >
                      Continue
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500 shadow-sm opacity-70 dark:bg-white/10 dark:text-slate-400"
                    >
                      Continue (unavailable)
                    </button>
                  )}
                  <Link
                    href={`#${portal.faqId}`}
                    className="text-sm font-semibold text-slate-700 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
                  >
                    Learn what you can do
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-slate-50/80 py-10 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        <div className={cn(layout.container, "grid gap-6 md:grid-cols-3")}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Not sure where to go?
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              Choose the portal that matches your role.
            </p>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Tenants and applicants use <span className="font-semibold">User Sign In</span>.
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Employees and vendors use <span className="font-semibold">Staff Sign In</span>.{" "}
            <Link
              href="#support"
              className="font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200"
            >
              Contact support
            </Link>
          </div>
        </div>
      </section>

      <section id="support" className={cn(layout.section, "pt-12")}>
        <div className={layout.container}>
          <div className="max-w-2xl">
            <p className={layout.eyebrow}>Support</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Frequently asked questions
            </h2>
            <p className={cn(layout.body, "mt-3")}>
              Get quick answers before you sign in. Still stuck? Reach out to your
              property team or support.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article id="faq-user" className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                I’m a tenant applying for a unit—where do I start?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Use User Sign In to start your application and track status updates.
              </p>
            </article>
            <article id="faq-staff" className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                I’m staff and can’t access—what do I do?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Staff access is invite-only. Ask your supervisor to confirm your
                account is enabled.
              </p>
            </article>
            <article id="faq-owner" className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                I’m an owner/manager—do I need an invite?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Yes. Organization access is provisioned by your BridgeWorks account
                manager or admin.
              </p>
            </article>
            <article className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Forgot password?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Use the password reset link on the sign-in screen to regain access.
              </p>
            </article>
            <article className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Having trouble signing in on mobile?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Update your browser, then retry. If issues persist, contact support
                so we can verify your device access.
              </p>
            </article>
            <article className={cn(layout.card, "border border-black/5")}>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Emergency maintenance?
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                If this is an emergency, call 911 or your property’s emergency line.
              </p>
            </article>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-black/5 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
            <Link
              href="/privacy"
              className="font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
            >
              Support
            </Link>
            {consoleUrl ? (
              <a
                href={consoleUrl}
                className="font-semibold text-slate-900 hover:text-teal-700 dark:text-white dark:hover:text-teal-300"
              >
                Founder Console
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
