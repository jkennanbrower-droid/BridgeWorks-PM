import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

/*
 * Section: Three pillars.
 * Purpose: Highlight core product advantages with alternating layouts.
 * Edit: pillars array (titles, descriptions) and bullet copy.
 * Layout: Uses layout.section, layout.card, layout.bodyMax.
 */
export function PillarsSection() {
  // EDIT ME: Update pillar titles and descriptions.
  const pillars = [
    {
      // Safe to edit: title and description.
      title: "Unified Operations",
      description:
        "Bring leasing, maintenance, resident services, and accounting into one shared command layer.",
    },
    {
      // Safe to edit: title and description.
      title: "Automation Everywhere",
      description:
        "Eliminate busywork with rule-based routing, approvals, and real-time alerts.",
    },
    {
      // Safe to edit: title and description.
      title: "Executive Visibility",
      description:
        "Turn daily execution into portfolio intelligence with live reporting.",
    },
  ];

  return (
    <section className={layout.section}>
      <div className={layout.container}>
        <div className="max-w-2xl">
          <p className={layout.eyebrow}>Three pillars</p>
          <h2 className={cn(layout.h2, "mt-3")}>The foundation for resilient property operations.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Every module is designed to make teams faster, smarter, and more
            aligned.
          </p>
        </div>
        <div className="mt-10 grid gap-10">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={cn(
                "grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center",
                index % 2 === 1 && "lg:grid-cols-[0.9fr_1.1fr]"
              )}
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className={cn(layout.body, "mt-3")}>{pillar.description}</p>
                <ul className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    Configurable workflows and automations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    Shared data model across teams
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    Executive-ready reporting
                  </li>
                </ul>
              </div>
              <div className={cn(layout.card, "h-56")}>
                <div className="flex h-full flex-col gap-3">
                  <div className={cn(layout.panelMuted, "h-10")} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={cn(layout.panelMuted, "h-16")} />
                    <div className={cn(layout.panelMuted, "h-16")} />
                  </div>
                  <div className={cn(layout.panelMuted, "h-14")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
