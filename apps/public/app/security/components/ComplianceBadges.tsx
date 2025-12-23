"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import type { ComplianceFramework, ComplianceFrameworkStatus } from "../lib/mockTrustData";

type Props = {
  frameworks: readonly ComplianceFramework[];
  onRequestAccess: () => void;
};

function statusStyle(status: ComplianceFrameworkStatus) {
  switch (status) {
    case "Planned":
      return "border-slate-300 bg-white text-slate-700 dark:border-white/15 dark:bg-slate-950 dark:text-slate-200";
    case "In progress":
      return "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-400/60 dark:bg-teal-950/30 dark:text-teal-200";
    case "Info":
      return "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-400/60 dark:bg-sky-950/30 dark:text-sky-200";
  }
}

export function ComplianceBadges({ frameworks, onRequestAccess }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(
    () => frameworks.find((f) => f.id === openId) ?? null,
    [frameworks, openId]
  );

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {frameworks.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOpenId(f.id)}
            className={cn(
              "group rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/5",
              layout.focusRing
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {f.name}
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-1 text-xs font-semibold",
                  statusStyle(f.status)
                )}
              >
                {f.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {f.summary}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 group-hover:text-teal-800 dark:text-teal-300 dark:group-hover:text-teal-200">
              View details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected ? (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            aria-modal="true"
            role="dialog"
            onMouseDown={(e: ReactMouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) setOpenId(null);
            }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-0 h-full w-[min(520px,100vw)] overflow-y-auto border-l border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950"
              onMouseDown={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {selected.name}
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Status: <span className="font-semibold">{selected.status}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10",
                    layout.focusRing
                  )}
                  onClick={() => setOpenId(null)}
                >
                  Close
                </button>
              </div>

              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                {selected.summary}
              </p>

              <div className="mt-6">
                <div className={layout.label}>Details</div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                  {selected.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <div className={layout.label}>Artifacts (placeholder)</div>
                <ul className="mt-3 space-y-2">
                  {selected.artifacts.map((a) => (
                    <li
                      key={a}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                    >
                      <span>{a}</span>
                      <a
                        href="https://trust.bridgeworkspm.example/artifacts"
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
                          layout.focusRing
                        )}
                      >
                        Preview
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Request access
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Access to artifacts is gated behind a request workflow (placeholder).
                </p>
                <button
                  type="button"
                  onClick={onRequestAccess}
                  className={cn(layout.buttonBase, layout.buttonPrimary, "mt-4 w-full")}
                >
                  Request Security Packet
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
