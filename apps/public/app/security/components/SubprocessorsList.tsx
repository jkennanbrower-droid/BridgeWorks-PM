"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import type { Subprocessor } from "../lib/mockTrustData";

type Props = {
  subprocessors: readonly Subprocessor[];
};

function SubprocessorRow({ sp }: { sp: Subprocessor }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-950">
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5",
          layout.focusRing
        )}
        aria-expanded={open}
        aria-controls={`${sp.id}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {sp.name}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {sp.purpose}
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {sp.region}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${sp.id}-panel`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            role="region"
            aria-label={`${sp.name} details`}
          >
            <div className="px-5 pb-5 pt-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn(layout.panelMuted)}>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Purpose
                  </div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {sp.purpose}
                  </div>
                </div>
                <div className={cn(layout.panelMuted)}>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Region
                  </div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {sp.region}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <a
                  href={sp.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5",
                    layout.focusRing
                  )}
                >
                  Vendor page (placeholder)
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SubprocessorsList({ subprocessors }: Props) {
  return (
    <div className={cn(layout.card)}>
      <div className={layout.label}>Subprocessors</div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Placeholder list of subprocessors. Replace with your verified vendor inventory.
      </p>

      <div className="mt-6 grid gap-3">
        {subprocessors.map((sp) => (
          <SubprocessorRow key={sp.id} sp={sp} />
        ))}
      </div>
    </div>
  );
}
