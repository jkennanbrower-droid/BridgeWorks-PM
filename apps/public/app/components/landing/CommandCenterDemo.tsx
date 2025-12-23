"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

type AuditEntry = {
  id: string;
  message: string;
  time: string;
};

/*
 * Section: Command Center demo panel.
 * Purpose: Interactive preview of leasing, maintenance, and payments workflows.
 * Edit: tabs array (labels, KPIs, queue items, action labels, audit entries).
 * Layout: Uses layout.card, layout.panel, layout.panelMuted, layout.label.
 */
export function CommandCenterDemo() {
  // EDIT ME: Update demo data for KPIs, queues, and audit entries.
  const tabs = useMemo(
    () => [
      {
        id: "leasing",
        label: "Leasing Pipeline",
        // Safe to edit: KPI labels/values, queue items, action labels, audit messages.
        kpis: [
          { label: "Active tours", value: "18" },
          { label: "Apps in review", value: "12" },
          { label: "Leases signed", value: "5" },
        ],
        queue: [
          "Review applicant: Jackson, Unit 403",
          "Schedule tour: Delmar Loft 12B",
          "Send renewal offer: Unit 515",
        ],
        actionLabel: "Approve application",
        actionMessage: "Application approved for Unit 403",
        audit: [
          "Lease signed: Unit 201",
          "Tour completed: Delmar Loft 9A",
          "Application received: Unit 312",
        ],
      },
      {
        id: "maintenance",
        label: "Maintenance Command",
        // Safe to edit: KPI labels/values, queue items, action labels, audit messages.
        kpis: [
          { label: "Open work orders", value: "34" },
          { label: "Avg. response", value: "2.1 hrs" },
          { label: "Vendors on call", value: "6" },
        ],
        queue: [
          "Dispatch vendor: HVAC, Rivergate 22",
          "Approve quote: Plumbing, Unit 110",
          "Schedule inspection: Building 7",
        ],
        actionLabel: "Dispatch vendor",
        actionMessage: "Vendor dispatched to Rivergate 22",
        audit: [
          "Work order closed: Unit 808",
          "Resident notified: Water shutoff",
          "Inspection completed: Building 3",
        ],
      },
      {
        id: "payments",
        label: "Payments & Reconciliation",
        // Safe to edit: KPI labels/values, queue items, action labels, audit messages.
        kpis: [
          { label: "Deposits matched", value: "92%" },
          { label: "ACH pending", value: "14" },
          { label: "Exceptions", value: "3" },
        ],
        queue: [
          "Match deposit: Whitman LLC",
          "Resolve exception: Unit 204",
          "Reconcile ledger: Bayview",
        ],
        actionLabel: "Match deposit",
        actionMessage: "Deposit matched for Whitman LLC",
        audit: [
          "Auto-posted: 18 rent payments",
          "Exception cleared: Unit 915",
          "Bank sync completed",
        ],
      },
    ],
    []
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const auditSeqRef = useRef(0);
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditEntry[]>>(() => {
    const initial: Record<string, AuditEntry[]> = {};
    tabs.forEach((tab) => {
      initial[tab.id] = tab.audit.map((message, index) => ({
        id: `${tab.id}-${index}`,
        message,
        time: "Just now",
      }));
    });
    return initial;
  });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleAction = (tabId: string, message: string) => {
    const newEntry: AuditEntry = {
      id: `${tabId}-${(auditSeqRef.current += 1)}`,
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setAuditLogs((prev) => ({
      ...prev,
      [tabId]: [newEntry, ...(prev[tabId] ?? [])].slice(0, 5),
    }));
    setHighlightId(newEntry.id);
    window.setTimeout(() => setHighlightId(null), 1500);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (activeIndex + direction + tabs.length) % tabs.length;
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={cn(layout.card, "relative overflow-hidden")}>
      <div className={cn(layout.label, "flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10")}>
        Command Center
        <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-semibold text-teal-800 dark:bg-teal-500/20 dark:text-teal-200">
          Live demo
        </span>
      </div>

      <div className="mt-6" role="tablist" aria-label="Command Center tabs" onKeyDown={handleKeyDown}>
        <div className="grid gap-2 sm:grid-cols-3">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              id={`${tab.id}-tab`}
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls={`${tab.id}-panel`}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors",
                layout.focusRing,
                index === activeIndex
                  ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200"
                  : "border-black/10 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const audit = auditLogs[tab.id] ?? [];

        return (
          <div
            key={tab.id}
            id={`${tab.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${tab.id}-tab`}
            hidden={!isActive}
            className="mt-6 grid gap-6"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {tab.kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className={cn(layout.panelMuted, "text-sm")}
                >
                  <div className={layout.label}>
                    {kpi.label}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            <div className={layout.panel}>
              <div className={layout.label}>
                Priority queue
              </div>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                {tab.queue.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleAction(tab.id, tab.actionMessage)}
                className={cn(layout.buttonBase, layout.buttonPrimary, "mt-4 w-full")}
              >
                {tab.actionLabel}
              </button>
            </div>

            <div className={cn(layout.panelMuted, "text-sm")}>
              <div className={layout.label}>
                Audit log
              </div>
              <ul className="mt-3 grid gap-2">
                {audit.map((entry) => (
                  <li
                    key={entry.id}
                    className={cn(
                      "rounded-lg border border-transparent px-3 py-2 transition-colors duration-500 motion-reduce:transition-none",
                      entry.id === highlightId
                        ? "border-teal-200 bg-teal-50 dark:border-teal-500/40 dark:bg-teal-500/10"
                        : "border-black/0"
                    )}
                  >
                    <div className="text-slate-700 dark:text-slate-200">
                      {entry.message}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {entry.time}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute -right-20 -top-24 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
    </div>
  );
}
