"use client";

import { useState } from "react";
import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Role-based paths.
 * Purpose: Segmented control that tailors messaging by audience.
 * Edit: roles array (labels, headline, bullets, preview content).
 * Layout: Uses layout.section, layout.card, layout.bodyMax.
 */
export function RolePathsSection() {
  // EDIT ME: Update role labels, headlines, bullets, and preview content.
  const roles = [
    {
      id: "managers",
      label: "Property Managers",
      // Safe to edit: headline, description, bullets, previewTitle/Body, stats.
      headline: "Keep every property running on a single operational rhythm.",
      description:
        "Daily execution stays aligned with leadership goals while teams stay focused on resident experience.",
      bullets: [
        "Unified task queues and SLA tracking",
        "Resident messaging and escalation flows",
        "Weekly compliance checks and audits",
      ],
      previewTitle: "Manager command view",
      previewBody: "Open tickets, inspections, and tours in one queue.",
      stats: ["24 properties", "92% SLA hit rate", "3.1 hrs avg response"],
    },
    {
      id: "owners",
      label: "Owners/Investors",
      // Safe to edit: headline, description, bullets, previewTitle/Body, stats.
      headline: "Stay close to NOI performance without chasing updates.",
      description:
        "BridgeWorks surfaces the metrics owners care about with transparent approvals and reporting.",
      bullets: [
        "Portfolio health scorecards",
        "Capital request approvals",
        "Weekly operating summaries",
      ],
      previewTitle: "Owner insight hub",
      previewBody: "Track NOI trends, capex, and leasing velocity.",
      stats: ["5 markets", "18% faster approvals", "2x reporting cadence"],
    },
    {
      id: "residents",
      label: "Residents/Tenants",
      // Safe to edit: headline, description, bullets, previewTitle/Body, stats.
      headline: "Deliver a premium resident experience at scale.",
      description:
        "Keep residents informed with proactive updates and clear service expectations.",
      bullets: [
        "Mobile-first service requests",
        "Automated appointment scheduling",
        "Real-time status notifications",
      ],
      previewTitle: "Resident portal",
      previewBody: "Updates, payments, and service requests in one place.",
      stats: ["4.8/5 CSAT", "62% self-service", "Next-day resolution"],
    },
    {
      id: "vendors",
      label: "Vendors",
      // Safe to edit: headline, description, bullets, previewTitle/Body, stats.
      headline: "Align vendor partners with your internal standards.",
      description:
        "Routing, approvals, and documentation live in one shared workspace.",
      bullets: [
        "Automated dispatch rules",
        "Quote approvals and compliance",
        "Inspection-ready documentation",
      ],
      previewTitle: "Vendor coordination",
      previewBody: "Track vendor availability and close-out reports.",
      stats: ["120 vendors", "Same-day dispatch", "Audit-ready logs"],
    },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRole = roles[activeIndex];

  return (
    <section className={layout.section}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Choose your path</p>
          <h2 className={cn(layout.h2, "mt-3")}>Role-based workspaces built for every team.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Segment operations by responsibility without losing the shared
            context that keeps everyone aligned.
          </p>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.65fr_0.35fr] lg:items-start">
          <div>
            <div
              className="flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-950"
              role="tablist"
              aria-label="Role paths"
            >
              {roles.map((role, index) => (
                <button
                  key={role.id}
                  type="button"
                  id={`${role.id}-tab`}
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-controls={`${role.id}-panel`}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-semibold transition-colors",
                    layout.focusRing,
                    index === activeIndex
                      ? "bg-teal-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {roles.map((role, index) => {
                const isActive = index === activeIndex;
                return (
                  <div
                    key={role.id}
                    id={`${role.id}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${role.id}-tab`}
                    hidden={!isActive}
                  >
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {role.headline}
                    </h3>
                    <p className={cn(layout.body, layout.bodyMax, "mt-3")}>{role.description}</p>
                    <ul className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                      {role.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-teal-600" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn(layout.card, "space-y-4")}>
            <div className={layout.label}>
              {activeRole.previewTitle}
            </div>
            <div className={cn(layout.panelMuted, "text-sm text-slate-600 dark:text-slate-300")}>
              {activeRole.previewBody}
            </div>
            <div className="grid gap-3">
              {activeRole.stats.map((stat) => (
                <div
                  key={stat}
                  className={cn(
                    layout.panel,
                    "p-3 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  )}
                >
                  {stat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
