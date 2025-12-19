"use client";

import { useMemo, useState } from "react";

import { useCountUp } from "./useCountUp";

type PreviewTab = "Dashboard" | "Maintenance" | "Collections";

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function IconDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />;
}

export function HeroPreview() {
  const [tab, setTab] = useState<PreviewTab>("Dashboard");
  const animateKey = tab;

  const occupancy = useCountUp(tab === "Dashboard" ? 94 : 93, {
    durationMs: 900,
    decimals: 0,
    animateKey,
  });
  const openWorkOrders = useCountUp(tab === "Maintenance" ? 23 : 18, {
    durationMs: 900,
    decimals: 0,
    animateKey,
  });
  const rentCollected = useCountUp(tab === "Collections" ? 512_480 : 482_900, {
    durationMs: 900,
    decimals: 0,
    animateKey,
  });

  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    []
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_60px_-40px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-slate-950">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-600/10 via-teal-600/0 to-transparent" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex h-7 items-center rounded-lg border border-black/10 bg-white px-2 shadow-sm dark:border-white/10 dark:bg-slate-950">
              Portfolio Overview
            </span>
            <span className="hidden items-center gap-2 whitespace-nowrap text-slate-500 dark:text-slate-400 sm:inline-flex">
              <IconDot />
              <span>Updated 2 minutes ago</span>
            </span>
          </div>

          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-black/10 bg-white p-1 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-slate-950">
            {(["Dashboard", "Maintenance", "Collections"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cx(
                  "shrink-0 rounded-lg px-2.5 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600",
                  tab === t
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
                  Occupancy
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
                  {Math.round(occupancy)}%
                </p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  Current
                </p>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
                  Open Work Orders
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
                  {Math.round(openWorkOrders)}
                </p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  Awaiting action
                </p>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
                  Rent Collected
                </p>
                <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
                  {usd.format(rentCollected)}
                </p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  This month
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Maintenance Queue
                </p>
                <span
                  className={cx(
                    "rounded-full px-2 py-1 text-[11px] font-semibold",
                    tab === "Maintenance"
                      ? "bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950"
                      : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                  )}
                >
                  Live
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  {
                    id: "#1042",
                    title: "Plumbing — leaking kitchen sink",
                    where: "Maple Ridge · Unit 3B",
                    status: "Scheduled",
                  },
                  {
                    id: "#1047",
                    title: "HVAC — no cooling reported",
                    where: "Cedar Commons · Unit 12A",
                    status: "Assigned",
                  },
                  {
                    id: "#1051",
                    title: "Access — replace entry fob",
                    where: "Harbor Point · Unit 5C",
                    status: "New",
                  },
                ].map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-black/5 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {row.id} — {row.title}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-600 dark:text-slate-300">
                        {row.where}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Rent Collection Timeline
              </p>
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                Week 1 → Week 4
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: "W1", pct: tab === "Collections" ? 34 : 31 },
                { label: "W2", pct: tab === "Collections" ? 61 : 58 },
                { label: "W3", pct: tab === "Collections" ? 82 : 79 },
                { label: "W4", pct: tab === "Collections" ? 96 : 92 },
              ].map((b) => (
                <div key={b.label} className="flex flex-col gap-2">
                  <div className="h-24 rounded-xl bg-slate-100 p-2 dark:bg-white/10">
                    <div className="relative h-full overflow-hidden rounded-lg bg-white/70 ring-1 ring-black/5 dark:bg-slate-950/60 dark:ring-white/10">
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-lg bg-gradient-to-t from-teal-700 to-teal-600/70 transition-[height] duration-500 ease-out dark:from-teal-500 dark:to-teal-400/70"
                        style={{ height: `${b.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-300">
                    <span className="font-medium">{b.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {b.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-black/5 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between text-[12px]">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  Reconciliation status
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  In progress
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-teal-700 dark:bg-teal-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
