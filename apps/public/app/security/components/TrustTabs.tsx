"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";

export type TrustTabId =
  | "overview"
  | "controls"
  | "compliance"
  | "privacy"
  | "vulnerability"
  | "faq";

export type TrustTab = { id: TrustTabId; label: string };

type Props = {
  tabs: readonly TrustTab[];
  activeTab: TrustTabId;
  onChange: (tab: TrustTabId) => void;
};

export function TrustTabs({ tabs, activeTab, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<TrustTabId, HTMLButtonElement | null>>({
    overview: null,
    controls: null,
    compliance: null,
    privacy: null,
    vulnerability: null,
    faq: null,
  });

  const [isStuck, setIsStuck] = useState(false);
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sentinel = document.createElement("div");
    sentinel.style.position = "absolute";
    sentinel.style.top = "0";
    sentinel.style.left = "0";
    sentinel.style.width = "1px";
    sentinel.style.height = "1px";
    el.parentElement?.insertBefore(sentinel, el);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: [1] }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const setTabRef = (id: TrustTabId) => (el: HTMLButtonElement | null) => {
    tabRefs.current[id] = el;
  };

  const updateIndicator = () => {
    const group = groupRef.current;
    const activeEl = tabRefs.current[activeTab];
    if (!group || !activeEl) return;

    const groupRect = group.getBoundingClientRect();
    const btnRect = activeEl.getBoundingClientRect();

    const next = {
      x: Math.max(0, btnRect.left - groupRect.left),
      width: Math.max(0, btnRect.width),
    };

    setIndicator((prev) => {
      if (
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
    // Run again on next frame to catch font/layout settling.
    const raf = window.requestAnimationFrame(() => updateIndicator());
    return () => window.cancelAnimationFrame(raf);
  }, [activeTab, tabs]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateIndicator());
      ro.observe(group);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/70",
        isStuck ? "shadow-[0_12px_28px_-24px_rgba(0,0,0,0.35)]" : ""
      )}
    >
      <div className={layout.container}>
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="hidden md:flex" role="tablist" aria-label="Security & Trust sections">
            <div
              ref={groupRef}
              className="relative inline-flex rounded-2xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-slate-950"
            >
              {indicator ? (
                <motion.div
                  className="absolute inset-y-1 left-0 rounded-xl bg-slate-100 will-change-transform dark:bg-white/10"
                  initial={false}
                  animate={{ x: indicator.x, width: indicator.width }}
                  transition={{ type: "spring", stiffness: 520, damping: 44 }}
                  aria-hidden="true"
                />
              ) : null}
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTab}
                  aria-controls={`tab-${tab.id}`}
                  id={`tab-${tab.id}-trigger`}
                  ref={setTabRef(tab.id)}
                  className={cn(
                    "relative z-10 h-9 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200",
                    tab.id === activeTab
                      ? "text-slate-900 dark:text-white"
                      : "hover:text-slate-900 dark:hover:text-white",
                    layout.focusRing,
                    "rounded-xl"
                  )}
                  onClick={() => onChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:hidden">
            <label className="sr-only" htmlFor="trust-tabs-select">
              Select section
            </label>
            <div className="relative">
              <select
                id="trust-tabs-select"
                className={cn(layout.inputBase, layout.focusRing, "h-11 appearance-none pr-10")}
                value={activeTab}
                onChange={(e) => onChange(e.target.value as TrustTabId)}
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-600 dark:text-slate-300 md:flex">
            <span className="rounded-full border border-black/10 bg-white px-2 py-1 font-semibold dark:border-white/10 dark:bg-slate-950">
              Interactive
            </span>
            Search, filters, accordions, copy links
          </div>
        </div>
      </div>
    </div>
  );
}
