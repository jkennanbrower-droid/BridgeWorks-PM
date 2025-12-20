"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Workflow OS.
 * Purpose: Step-based narrative with preview panel.
 * Edit: steps array (titles, descriptions, detail bullets).
 * Layout: Uses layout.sectionMuted, layout.card, layout.bodyMax.
 */
export function WorkflowSection() {
  // EDIT ME: Update workflow steps and preview content.
  const steps = [
    {
      title: "Capture every request",
      // Safe to edit: description and details list.
      description: "Intake from portals, email, SMS, and integrations.",
      details: [
        "Unified inbox for service, leasing, and vendor requests",
        "Automatic categorization by property and unit",
        "Resident-facing confirmations and updates",
      ],
    },
    {
      title: "Route with confidence",
      // Safe to edit: description and details list.
      description: "Automated assignments based on rules and capacity.",
      details: [
        "Rules-based routing across teams and vendors",
        "Capacity-aware dispatching",
        "Approval workflows for quotes and exceptions",
      ],
    },
    {
      title: "Track execution",
      // Safe to edit: description and details list.
      description: "Live status updates, SLA timers, and approvals.",
      details: [
        "Shared timelines for managers and residents",
        "Escalations triggered by SLA thresholds",
        "Photo and inspection documentation",
      ],
    },
    {
      title: "Report outcomes",
      // Safe to edit: description and details list.
      description: "Portfolio-level insights and audit-ready logs.",
      details: [
        "Weekly operational scorecards",
        "Audit-ready activity logs",
        "Cost tracking by property and vendor",
      ],
    },
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className={layout.sectionMuted}>
      <div className={cn(layout.container, "grid gap-10 lg:grid-cols-2 lg:items-center")}>
        <div>
          <p className={layout.eyebrow}>Operational OS</p>
          <h2 className={cn(layout.h2, "mt-3")}>One workflow spine for every operational motion.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Standardize the steps that matter while keeping execution flexible
            for each property and team.
          </p>
          <div className="mt-10 grid gap-3" role="tablist" aria-label="Workflow steps">
            {steps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                id={`workflow-tab-${index}`}
                role="tab"
                aria-selected={index === activeIndex}
                aria-controls={`workflow-step-${index}`}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex items-start gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
                  layout.focusRing,
                  index === activeIndex
                    ? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-500/10"
                    : "border-black/10 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/5"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-semibold text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-white">
                  0{index + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className={cn(layout.card, "relative overflow-hidden")}>
          <div className={cn(layout.label, "flex items-center justify-between")}>
            Workflow preview
            <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
              Live
            </span>
          </div>
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={step.title}
                id={`workflow-step-${index}`}
                role="tabpanel"
                aria-labelledby={`workflow-tab-${index}`}
                hidden={!isActive}
                className="mt-6"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
                <ul className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal-600" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
