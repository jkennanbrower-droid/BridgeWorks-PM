"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clipboard, Search } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import type { FaqCategory, FaqItem } from "../lib/mockTrustData";

type Props = {
  items: readonly FaqItem[];
  onToast: (toast: { title: string; description?: string }) => void;
  onRequestPacket: () => void;
};

function CategoryChip({
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
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold",
        selected
          ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
          : "border-black/10 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
        layout.focusRing
      )}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const panelId = `${item.id}-panel`;

  return (
    <div className="rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-950">
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5",
          layout.focusRing
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {item.category}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {item.q}
          </div>
        </div>
        <motion.span
          className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
          initial={false}
          animate={{ opacity: 1 }}
        >
          {open ? "Hide" : "Show"}
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            role="region"
            aria-label={`${item.q} answer`}
          >
            <div className="px-5 pb-5 pt-1">
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FaqSearch({ items, onToast, onRequestPacket }: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<FaqCategory | "All">("All");

  const categories = useMemo(() => {
    const uniq = new Set(items.map((i) => i.category));
    return ["All" as const, ...(Array.from(uniq) as FaqCategory[])];
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items
      .filter((i) => (category === "All" ? true : i.category === category))
      .filter((i) => {
        if (!q) return true;
        return `${i.q} ${i.a}`.toLowerCase().includes(q);
      });
  }, [category, deferredQuery, items]);

  return (
    <div className={cn(layout.card)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className={layout.label}>FAQ</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Search and filter questions across authentication, data, compliance, and incident response.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-85">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(layout.inputBase, layout.focusRing, "pl-10")}
              placeholder="Search FAQs…"
              aria-label="Search FAQs"
            />
          </div>
          <button
            type="button"
            className={cn(layout.buttonBase, layout.buttonSecondary)}
            onClick={() => onRequestPacket()}
          >
            Request Packet
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <CategoryChip
            key={c}
            label={c}
            selected={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
        <div>
          Showing <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> of {items.length}
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
            layout.focusRing
          )}
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname}#tab-faq`;
            try {
              await navigator.clipboard.writeText(url);
              onToast({ title: "Copied", description: "FAQ link copied." });
            } catch {
              onToast({ title: "Copy failed", description: "Clipboard access unavailable." });
            }
          }}
        >
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          Copy link
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.map((item) => (
          <FaqAccordion key={item.id} item={item} />
        ))}

        {filtered.length === 0 ? (
          <div className={cn(layout.panelMuted)}>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              No matches
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Try a different search term or category.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
