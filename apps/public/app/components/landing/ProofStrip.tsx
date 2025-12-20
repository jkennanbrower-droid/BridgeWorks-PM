import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

/*
 * Section: Proof strip.
 * Purpose: Fast credibility bar with highlights and key stats.
 * Edit: bullets and stats arrays.
 * Layout: Uses layout.container for width and spacing.
 */
export function ProofStrip() {
  // EDIT ME: Update trust bullets and stat chips.
  const bullets = [
    // Safe to edit: bullet strings.
    "Single source of truth for every asset",
    "Designed with operator workflows in mind",
    "Configurable to match your portfolio",
  ];
  const stats = [
    // Safe to edit: stat label/value pairs.
    { label: "Hours saved per week", value: "18+" },
    { label: "Average response time", value: "2.4 hrs" },
    { label: "Tasks automated", value: "120k" },
  ];

  return (
    <section className="border-y border-black/10 bg-slate-50 dark:border-white/10 dark:bg-slate-950">
      <div className={cn(layout.container, "flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between")}>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          {bullets.map((bullet) => (
            <span key={bullet} className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              {bullet}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <span className="text-teal-700 dark:text-teal-400">{stat.value}</span>{" "}
              {stat.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
