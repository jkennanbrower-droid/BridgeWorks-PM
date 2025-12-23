"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clipboard, Filter, Search } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import type { ControlArea, ControlItem, EvidenceTag } from "../lib/mockTrustData";

type Props = {
  controls: readonly ControlItem[];
  areas: readonly ControlArea[];
  onCopy: (text: string) => void | Promise<void>;
};

function EvidencePill({ tag }: { tag: EvidenceTag }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
      {tag}
    </span>
  );
}

function AreaChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        selected
          ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
          : "border-black/10 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
        layout.focusRing
      )}
      aria-pressed={selected}
    >
      {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

function AccordionItem({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      id={id}
      className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-950"
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5",
          layout.focusRing
        )}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {subtitle}
          </div>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
          )}
          aria-hidden="true"
        >
          <motion.span
            initial={false}
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.16 }}
            className="text-lg leading-none"
          >
            +
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`${id}-panel`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            role="region"
            aria-label={`${title} details`}
          >
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ControlsCatalog({ controls, areas, onCopy }: Props) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAreas, setSelectedAreas] = useState<Set<ControlArea>>(new Set());

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const hasAreas = selectedAreas.size > 0;

    return controls
      .filter((c) => (!hasAreas ? true : selectedAreas.has(c.area)))
      .filter((c) => {
        if (!q) return true;
        const hay = [c.name, c.whyItMatters, ...c.whatWeDo, ...(c.customerResponsibility ?? [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [controls, deferredSearch, selectedAreas]);

  const toggleArea = (area: ControlArea) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const clearFilters = () => setSelectedAreas(new Set());

  return (
    <div className={cn(layout.card)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className={layout.label}>Controls Catalog</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Search, filter, and expand controls. Copy direct links for diligence.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(layout.inputBase, layout.focusRing, "pl-10")}
              placeholder="Search controls…"
              aria-label="Search controls"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5",
              layout.focusRing
            )}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter by area:
          </span>
          {areas.map((area) => (
            <AreaChip
              key={area}
              label={area}
              selected={selectedAreas.has(area)}
              onClick={() => toggleArea(area)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
        <div>
          Showing <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> of {controls.length} controls
        </div>
        <div className="text-xs">
          Tip: use the “Copy link” button per control.
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.map((control) => {
          const anchorId = `control-${control.id}`;

          return (
            <AccordionItem
              key={control.id}
              id={anchorId}
              title={control.name}
              subtitle={control.whyItMatters}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="rounded-full border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-slate-950">
                      {control.area}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Evidence:
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {control.evidenceAvailable.map((tag) => (
                        <EvidencePill key={tag} tag={tag} />
                      ))}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
                      layout.focusRing
                    )}
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
                      onCopy(url);
                    }}
                  >
                    <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy link
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      What we do
                    </div>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                      {control.whatWeDo.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Customer responsibility
                    </div>
                    {control.customerResponsibility?.length ? (
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                        {control.customerResponsibility.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        No customer action required for this control (placeholder).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </AccordionItem>
          );
        })}

        {filtered.length === 0 ? (
          <div className={cn(layout.panelMuted, "mt-2")}
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              No results
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Try a different search term or clear filters.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
