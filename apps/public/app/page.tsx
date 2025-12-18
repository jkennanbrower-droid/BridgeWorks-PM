import Link from "next/link";

import { HeroPreview } from "./components/HeroPreview";
import { MarketingFooter } from "./components/MarketingFooter";
import { PersonaSwitcher } from "./components/PersonaSwitcher";
import { ProductTour } from "./components/ProductTour";
import { WorkflowTimeline } from "./components/WorkflowTimeline";

export default function Home() {
  return (
    <div className="bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-600/10 via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(closest-side,rgba(15,118,110,0.18),transparent)]" />

        <div className="relative mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
                BridgeWorks PM
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Property operations, unified.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-700 dark:text-slate-200">
                BridgeWorks PM unifies leasing, rent collection, maintenance, accounting, and
                resident communication into one clean platform.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/request-demo"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90 dark:focus-visible:ring-offset-black"
                >
                  Request a Demo
                </Link>
                <Link
                  href="/product"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
                >
                  Explore Product
                </Link>
              </div>

              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                Built for growing portfolios. Designed for clarity.
              </p>
            </div>

            <div className="lg:pl-2">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-slate-50/60 dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Trusted by teams managing residential, commercial, and mixed portfolios
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                SSO • Role-based access • Audit logs
              </p>
            </div>
            <ul className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {["Client A", "Client B", "Client C", "Client D", "Client E", "Client F"].map(
                (name) => (
                  <li
                    key={name}
                    className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                  >
                    {name}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            What you can run in one place
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            One platform, operationally complete.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-200">
            Switch between key workflows without switching tools. Keep every handoff documented,
            searchable, and easy to audit.
          </p>
        </div>

        <div className="mt-10">
          <ProductTour />
        </div>
      </section>

      <section className="bg-slate-50/60 dark:bg-white/5">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Workflows
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Operations that follow a clear sequence.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
              A step-by-step model that keeps marketing, leasing, accounting, and maintenance in
              sync.
            </p>
          </div>

          <div className="mt-10">
            <WorkflowTimeline />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            For every role
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Tailored experiences without siloed systems.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
            Give each stakeholder a clean view of what matters, while preserving consistent rules
            and governance.
          </p>
        </div>

        <div className="mt-10">
          <PersonaSwitcher />
        </div>
      </section>

      <section className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <div className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-3 lg:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Faster turnarounds
              </p>
              <div className="mt-3 flex items-end gap-2">
                {[24, 44, 38, 58, 66, 74].map((h, i) => (
                  <div
                    key={i}
                    className="w-3 rounded-md bg-teal-700/70 dark:bg-teal-500/80"
                    style={{ height: `${h}px` }}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Keep work moving with clear assignments and predictable approvals.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Cleaner books
              </p>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Deposit", "Matched", "Ready"],
                  ["Rent", "Posted", "Cleared"],
                  ["Fees", "Reviewed", "Export"],
                ].map(([a, b, c]) => (
                  <div
                    key={a}
                    className="flex items-center justify-between rounded-lg border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/60"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-200">{a}</span>
                    <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                      {b}
                    </span>
                    <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-teal-500 dark:text-slate-950">
                      {c}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Happier residents
              </p>
              <div className="mt-3 rounded-2xl border border-black/10 bg-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Status updates that reduce follow-ups
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  “Work Order #1047 is scheduled for tomorrow between 10:00–12:00.”
                </p>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  <span>Sent via portal and email</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Integrations + Open API
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Connect what you already use.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
              Keep your preferred providers while standardizing your workflows in BridgeWorks PM.
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">
              API &amp; Webhooks{" "}
              <Link
                href="/product"
                className="font-semibold text-teal-700 outline-none hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
              >
                View details
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex flex-wrap gap-2">
              {["Payments", "Accounting", "Screening", "Messaging"].map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-black/10 bg-slate-50/60 px-3 py-1 text-[12px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-5 space-y-5">
              {[
                {
                  label: "Payments",
                  badges: ["Provider A", "Provider B", "Provider C", "Provider D"],
                },
                {
                  label: "Accounting",
                  badges: ["Ledger A", "Ledger B", "Ledger C"],
                },
                {
                  label: "Screening",
                  badges: ["Screening A", "Screening B", "Screening C"],
                },
                {
                  label: "Messaging",
                  badges: ["Email A", "SMS A", "Portal notices"],
                },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <p className="w-28 shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    {row.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {row.badges.map((b) => (
                      <span
                        key={b}
                        className="rounded-full border border-black/10 bg-slate-50/60 px-3 py-1 text-[12px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50/60 dark:bg-white/5">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Security &amp; Governance
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Security that fits your process.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
                Enterprise cues without enterprise complexity. Keep access predictable and changes
                auditable.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {[
                  "Role-based access",
                  "Audit history",
                  "Data export controls",
                  "Optional approvals",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/resources"
                  className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-700 outline-none transition-colors hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  Visit resources
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-600/10 via-transparent to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Trust Center
                  </p>
                  <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                    Preview
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-slate-50/60 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Policies</span>
                    <span className="font-medium">Status</span>
                  </div>
                  <div className="divide-y divide-black/5 dark:divide-white/10">
                    {[
                      ["Access control policy", "Active"],
                      ["Data retention policy", "Active"],
                      ["Export and audit policy", "Active"],
                      ["Incident response plan", "Placeholder"],
                    ].map(([p, s]) => (
                      <div
                        key={p}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {p}
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10">
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Uptime indicator
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                      <span className="h-2 w-2 rounded-full bg-teal-600" />
                      Operational
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-slate-600 dark:text-slate-300">
                    Status information shown here is a placeholder preview.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Calm, consistent operations.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <figure className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <blockquote className="text-lg leading-8 text-slate-900 dark:text-white">
                “BridgeWorks PM gave our team a single operational rhythm. Leasing, maintenance,
                and accounting stopped feeling like separate worlds.”
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Regional Portfolio Manager
              </figcaption>
            </figure>
          </div>

          <div className="space-y-4">
            {[
              [
                "“We finally have clear handoffs—work orders, approvals, and updates all live in one place.”",
                "Property Operations Lead",
              ],
              [
                "“Reporting feels trustworthy because the underlying workflow stays consistent.”",
                "Asset Management Analyst",
              ],
            ].map(([quote, role]) => (
              <figure
                key={role}
                className="rounded-2xl border border-black/10 bg-slate-50/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <blockquote className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {quote}
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-slate-50/60 dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resources
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Practical guidance for modern property teams.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2">
              <div className="grid gap-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:grid-cols-[160px_1fr]">
                <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 ring-1 ring-black/10 dark:from-white/10 dark:to-white/5 dark:ring-white/10" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Featured
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    Building an operational workflow across leasing, maintenance, and accounting
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    A concise framework for aligning teams, defining approvals, and keeping audit
                    trails clear.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/resources"
                      className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-700 outline-none transition-colors hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      Read more
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                More insights
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Creating predictable approvals without slowing teams down",
                  "Choosing the right resident communications workflow",
                ].map((t) => (
                  <Link
                    key={t}
                    href="/resources"
                    className="block rounded-xl border border-black/10 bg-slate-50/60 p-4 text-sm font-semibold text-slate-800 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/8"
                  >
                    {t}
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  href="/resources"
                  className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-700 outline-none transition-colors hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  Explore resources
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-teal-600/10 via-transparent to-transparent p-10 shadow-sm dark:border-white/10 dark:from-teal-500/10">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                See BridgeWorks PM in action.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
                Get a guided walkthrough that matches your portfolio and operational process.
              </p>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                Prefer to explore first? Visit the{" "}
                <Link
                  href="/product"
                  className="font-semibold text-teal-700 outline-none hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  product tour
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/request-demo"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90 dark:focus-visible:ring-offset-black"
              >
                Request a Demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
