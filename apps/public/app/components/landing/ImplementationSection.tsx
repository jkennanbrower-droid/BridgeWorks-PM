import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Implementation.
 * Purpose: Outline onboarding timeline and rollout stages.
 * Edit: steps array (title, description).
 * Layout: Uses layout.sectionMuted, layout.card, layout.bodyMax.
 */
export function ImplementationSection() {
  // EDIT ME: Update onboarding timeline steps.
  const steps = [
    {
      // Safe to edit: title and description.
      title: "Discovery & data mapping",
      description: "Align on processes, portfolio structure, and data sources.",
    },
    {
      // Safe to edit: title and description.
      title: "Configuration sprint",
      description: "Set workflows, permissions, and portal branding.",
    },
    {
      // Safe to edit: title and description.
      title: "Pilot launch",
      description: "Roll out to a focused set of properties and teams.",
    },
    {
      // Safe to edit: title and description.
      title: "Portfolio rollout",
      description: "Scale automation and training across the org.",
    },
  ];

  return (
    <section className={layout.sectionMuted}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Implementation</p>
          <h2 className={cn(layout.h2, "mt-3")}>Go live with confidence in under 45 days.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            A dedicated onboarding team keeps your rollout smooth and measurable.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className={cn(layout.card, "relative")}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Step 0{index + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
