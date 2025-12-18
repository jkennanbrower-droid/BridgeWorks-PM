"use client";

import Link from "next/link";
import { useState } from "react";

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type TourKey = "Leasing" | "Accounting" | "Maintenance" | "Portals" | "Reporting";

type TourItem = {
  key: TourKey;
  title: string;
  description: string;
  outcomes: [string, string, string];
};

const tour: TourItem[] = [
  {
    key: "Leasing",
    title: "Leasing that stays in sync",
    description:
      "Track leads, applications, and renewals without duplicating work across tools.",
    outcomes: [
      "Standardize screening and approvals",
      "Keep unit availability current",
      "Turn conversations into signed leases",
    ],
  },
  {
    key: "Accounting",
    title: "Accounting built for property workflows",
    description:
      "Post rent, fees, and adjustments with clear audit trails and clean handoffs to reporting.",
    outcomes: [
      "Reconcile deposits with clarity",
      "Separate ledgers by property and entity",
      "Export data on your schedule",
    ],
  },
  {
    key: "Maintenance",
    title: "Maintenance that closes the loop",
    description:
      "Route work orders, track vendor progress, and keep residents informed with fewer follow-ups.",
    outcomes: [
      "Assign, schedule, and approve work",
      "Capture photos and notes per job",
      "Maintain service history by unit",
    ],
  },
  {
    key: "Portals",
    title: "Portals people actually use",
    description:
      "Give residents and vendors simple, focused views for payments, requests, and updates.",
    outcomes: [
      "Self-service requests and status",
      "Payment reminders and receipts",
      "Vendor access to assigned tasks",
    ],
  },
  {
    key: "Reporting",
    title: "Reporting you can trust",
    description:
      "Keep performance, delinquencies, and operations visible across your portfolio.",
    outcomes: [
      "Portfolio and property rollups",
      "Operational dashboards by role",
      "Scheduled exports and auditability",
    ],
  },
];

function SegmentedTabs({
  value,
  onChange,
}: {
  value: TourKey;
  onChange: (v: TourKey) => void;
}) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-black/10 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-950">
      {tour.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cx(
            "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600",
            value === t.key
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
          )}
        >
          {t.key}
        </button>
      ))}
    </div>
  );
}

function MiniPanel({ active }: { active: TourKey }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-600/10 via-transparent to-transparent" />
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {active} view
          </p>
          <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
            Mock data
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
            <span className="font-medium">Activity</span>
            <span className="text-slate-500 dark:text-slate-400">•</span>
            <span>Today</span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-slate-50/60 dark:border-white/10 dark:bg-white/5">
            {active === "Leasing" && (
              <div className="divide-y divide-black/5 text-sm dark:divide-white/10">
                {[
                  ["Lead", "Ridgeview Lofts · Unit 204", "New"],
                  ["Application", "Harbor Point · Unit 5C", "In review"],
                  ["Renewal", "Cedar Commons · Unit 12A", "Sent"],
                ].map(([type, where, status]) => (
                  <div
                    key={`${type}-${where}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {type}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-600 dark:text-slate-300">
                        {where}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {active === "Accounting" && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Ledger activity
                  </p>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Property: Maple Ridge
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    ["Rent payment posted", "Unit 3B", "+$1,850"],
                    ["Late fee waived", "Unit 7A", "-$50"],
                    ["Deposit reconciled", "Unit 12A", "Cleared"],
                  ].map(([label, ref, amount]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-black/5 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {label}
                        </p>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300">
                          {ref}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === "Maintenance" && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Work order routing
                  </p>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    SLA tracking enabled
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    ["#1042", "Plumbing — leaking sink", "Scheduled"],
                    ["#1047", "HVAC — no cooling", "Assigned"],
                    ["#1055", "Electrical — outlet issue", "Awaiting parts"],
                  ].map(([id, title, status]) => (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {id} — {title}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-teal-700 px-2 py-1 text-[11px] font-semibold text-white dark:bg-teal-500 dark:text-slate-950">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === "Portals" && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Resident portal
                  </p>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Clean, minimal
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    ["Pay rent", "Next due: Jan 1", "Open"],
                    ["Submit request", "Attach photo and notes", "Open"],
                    ["Messages", "2 unread", "Review"],
                  ].map(([label, detail, action]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-black/5 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-950/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {label}
                        </p>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300">
                          {detail}
                        </p>
                      </div>
                      <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active === "Reporting" && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Portfolio reporting
                  </p>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Filtered by region
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-black/5 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/60">
                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      Delinquencies
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                      Review
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-full w-[38%] rounded-full bg-teal-700 dark:bg-teal-500" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-black/5 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/60">
                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      Turn status
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                      In progress
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                      <span>Checklist tracked per unit</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductTour() {
  const [active, setActive] = useState<TourKey>("Leasing");
  const item = tour.find((t) => t.key === active)!;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
        <SegmentedTabs value={active} onChange={setActive} />

        <div className="mt-6 max-w-xl">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {item.title}
          </h3>
          <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
            {item.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {item.outcomes.map((o) => (
              <li key={o} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
                <span>{o}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Link
              href="/product"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-700 outline-none transition-colors hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
            >
              View full product tour
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="lg:pt-1">
        <div
          className="transition-all duration-300 ease-out"
          key={active}
        >
          <MiniPanel active={active} />
        </div>
      </div>
    </div>
  );
}

