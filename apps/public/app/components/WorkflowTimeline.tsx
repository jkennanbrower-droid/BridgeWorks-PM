"use client";

import { useEffect, useId, useMemo, useState } from "react";

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type StepKey =
  | "List & Market"
  | "Screen & Lease"
  | "Collect & Reconcile"
  | "Maintain & Retain";

type Step = {
  key: StepKey;
  title: string;
  body: string;
  visual: "channels" | "screening" | "reconcile" | "checklist";
};

const steps: Step[] = [
  {
    key: "List & Market",
    title: "List & Market",
    body: "Publish availability, track inquiries, and keep unit status accurate across teams.",
    visual: "channels",
  },
  {
    key: "Screen & Lease",
    title: "Screen & Lease",
    body: "Standardize approvals, capture required documents, and move quickly from application to signature.",
    visual: "screening",
  },
  {
    key: "Collect & Reconcile",
    title: "Collect & Reconcile",
    body: "Post payments, handle exceptions, and reconcile deposits with audit-ready history.",
    visual: "reconcile",
  },
  {
    key: "Maintain & Retain",
    title: "Maintain & Retain",
    body: "Route work, coordinate vendors, and keep residents informed without losing context.",
    visual: "checklist",
  },
];

function Icon({ name }: { name: StepKey }) {
  const common =
    "h-5 w-5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 grid place-items-center text-[11px] font-bold";
  const letter = name.startsWith("List")
    ? "L"
    : name.startsWith("Screen")
      ? "S"
      : name.startsWith("Collect")
        ? "C"
        : "M";
  return <span className={common}>{letter}</span>;
}

function TinyVisual({ kind }: { kind: Step["visual"] }) {
  if (kind === "channels") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {["Listing", "Email", "Website", "Call"].map((t) => (
          <span
            key={t}
            className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (kind === "screening") {
    const rows: Array<{ label: string; done: boolean }> = [
      { label: "Identity verified", done: true },
      { label: "Income reviewed", done: true },
      { label: "Lease packet", done: false },
    ];
    return (
      <div className="grid gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg border border-black/5 bg-white/70 px-3 py-2 text-[12px] dark:border-white/10 dark:bg-slate-950/60"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {row.label}
            </span>
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                row.done
                  ? "bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950"
                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
              )}
            >
              {row.done ? "Done" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "reconcile") {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            Deposit reconciliation
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            In progress
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-teal-700 dark:bg-teal-500" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
          <span>Bank feed</span>
          <span>Ledger</span>
          <span>Export</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
        Turn checklist
      </p>
      <div className="mt-2 grid gap-2">
        {(
          [
            { label: "Schedule vendor", ok: true },
            { label: "Parts received", ok: true },
            { label: "Resident update sent", ok: false },
          ] as const
        ).map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg border border-black/5 bg-slate-50/60 px-3 py-2 text-[12px] dark:border-white/10 dark:bg-white/5"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {row.label}
            </span>
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                row.ok ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
              )}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkflowTimeline() {
  const prefix = useId();
  const [active, setActive] = useState<StepKey>(steps[0]!.key);

  const ids = useMemo(() => {
    const map = new Map<StepKey, string>();
    for (const s of steps) map.set(s.key, `${prefix}-${s.key.replace(/\W+/g, "-")}`);
    return map;
  }, [prefix]);

  useEffect(() => {
    const nodes = steps
      .map((s) => document.getElementById(ids.get(s.key)!))
      .filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))[0];
        const next = visible?.target?.getAttribute("data-step") as StepKey | null;
        if (next) setActive(next);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0.1, 0.25, 0.4] }
    );

    for (const n of nodes) observer.observe(n);
    return () => observer.disconnect();
  }, [ids]);

  return (
    <div>
      <div className="sm:hidden">
        <div className="space-y-3">
          {steps.map((s) => (
            <details
              key={s.key}
              className="group rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 outline-none">
                <div className="flex items-start gap-3">
                  <Icon name={s.key} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {s.title}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                      {s.body}
                    </p>
                  </div>
                </div>
                <span className="mt-1 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400">
                  ▾
                </span>
              </summary>
              <div className="mt-4">
                <TinyVisual kind={s.visual} />
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="hidden sm:grid sm:grid-cols-[260px_1fr] sm:gap-10 lg:grid-cols-[300px_1fr]">
        <div className="sm:sticky sm:top-24 sm:self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Workflow
          </p>
          <div className="mt-4 space-y-2">
            {steps.map((s) => {
              const isActive = active === s.key;
              return (
                <a
                  key={s.key}
                  href={`#${ids.get(s.key)}`}
                  className={cx(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600",
                    isActive
                      ? "border-teal-600/30 bg-teal-600/10 text-slate-900 dark:text-white"
                      : "border-black/10 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5"
                  )}
                >
                  <Icon name={s.key} />
                  <span>{s.title}</span>
                </a>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] leading-5 text-slate-600 dark:text-slate-300">
            A predictable sequence from listing through retention—built to reduce handoffs.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((s) => (
            <div
              key={s.key}
              id={ids.get(s.key)}
              data-step={s.key}
              className="scroll-mt-28 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Icon name={s.key} />
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                      {s.title}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {s.body}
                    </p>
                  </div>
                </div>
                <span className="hidden rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 lg:inline-flex">
                  Step
                </span>
              </div>

              <div className="mt-5">
                <TinyVisual kind={s.visual} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
