"use client";

import { useMemo, useState } from "react";
import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Integrations.
 * Purpose: Search + filter for the integration catalog.
 * Edit: categories array, integrations array, empty-state copy.
 * Layout: Uses layout.section, layout.inputBase, layout.focusRing.
 */
// EDIT ME: Update integration catalog and categories.
const categories = ["All", "Payments", "Accounting", "Screening", "Messaging", "General"];
const integrations = [
  // Safe to edit: name, category, connectionType, statusLabel.
  { name: "Yardi", category: "Accounting", connectionType: "API", statusLabel: "Certified" },
  { name: "RealPage", category: "Accounting", connectionType: "API", statusLabel: "Certified" },
  { name: "MRI", category: "Accounting", connectionType: "File sync", statusLabel: "Available" },
  { name: "AppFolio", category: "Accounting", connectionType: "API", statusLabel: "Partner" },
  { name: "Stripe", category: "Payments", connectionType: "API", statusLabel: "Certified" },
  { name: "Plaid", category: "Payments", connectionType: "OAuth", statusLabel: "Available" },
  { name: "PayNearMe", category: "Payments", connectionType: "API", statusLabel: "Available" },
  { name: "Certn", category: "Screening", connectionType: "API", statusLabel: "Certified" },
  { name: "Checkr", category: "Screening", connectionType: "API", statusLabel: "Available" },
  { name: "TransUnion", category: "Screening", connectionType: "File sync", statusLabel: "Partner" },
  { name: "Twilio", category: "Messaging", connectionType: "API", statusLabel: "Certified" },
  { name: "Slack", category: "Messaging", connectionType: "API", statusLabel: "Available" },
  { name: "Microsoft 365", category: "Messaging", connectionType: "OAuth", statusLabel: "Available" },
  { name: "Google Workspace", category: "Messaging", connectionType: "OAuth", statusLabel: "Beta" },
  { name: "Tableau", category: "General", connectionType: "API", statusLabel: "Available" },
  { name: "Power BI", category: "General", connectionType: "API", statusLabel: "Available" },
  { name: "Zapier", category: "General", connectionType: "Webhook", statusLabel: "Certified" },
  { name: "ServiceChannel", category: "General", connectionType: "API", statusLabel: "Partner" },
  { name: "DocuSign", category: "General", connectionType: "API", statusLabel: "Available" },
  { name: "Entrata", category: "Accounting", connectionType: "API", statusLabel: "Pilot" },
];

export function IntegrationsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return integrations.filter((integration) => {
      const matchesCategory =
        activeCategory === "All" || integration.category === activeCategory;
      const matchesQuery =
        normalized.length === 0 ||
        integration.name.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <section className={layout.section}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Integrations</p>
          <h2 className={cn(layout.h2, "mt-3")}>Connect BridgeWorks to the tools you already trust.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            A growing library of integrations keeps your stack synchronized and
            eliminates double entry.
          </p>
        </div>
        <div className="mt-10 grid gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="sr-only" htmlFor="integration-search">
              Search integrations
            </label>
            <input
              id="integration-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search integrations"
              className={cn(layout.inputBase, layout.focusRing, "sm:max-w-xs")}
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={category === activeCategory}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                    layout.focusRing,
                    category === activeCategory
                      ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200"
                      : "border-black/10 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={cn(layout.card, "text-center")}>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No integrations match your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("All");
                }}
                className={cn(layout.buttonBase, layout.buttonSecondary, "mt-4")}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {filtered.map((integration) => (
                <div
                  key={integration.name}
                  className="flex h-24 flex-col items-center justify-center rounded-2xl border border-black/10 bg-white px-3 text-center text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div className="text-sm">{integration.name}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {integration.connectionType}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                    {integration.statusLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
