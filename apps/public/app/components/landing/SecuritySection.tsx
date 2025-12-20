import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Security & governance.
 * Purpose: Summarize compliance posture and trust center highlights.
 * Edit: bullets array and trust center copy.
 * Layout: Uses layout.sectionMuted, layout.card, layout.bodyMax.
 */
export function SecuritySection() {
  // EDIT ME: Update security bullet points and trust center items.
  const bullets = [
    // Safe to edit: bullet strings.
    "Role-based access control with custom permissions",
    "Audit logs for every workflow action",
    "Configurable data retention and export policies",
    "Encrypted data in transit and at rest",
  ];

  return (
    <section className={layout.sectionMuted}>
      <div className={cn(layout.container, "grid gap-10 lg:grid-cols-2 lg:items-center")}>
        <div>
          <p className={layout.eyebrow}>Security & governance</p>
          <h2 className={cn(layout.h2, "mt-3")}>Enterprise-grade controls built in.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Keep sensitive resident and portfolio data protected while meeting
            regulatory expectations.
          </p>
          <ul className="mt-10 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-teal-600" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(layout.card, "space-y-4")}>
          <div className={layout.label}>
            Trust center
          </div>
          <div className={cn(layout.panelMuted, "text-sm text-slate-600 dark:text-slate-300")}>
            <p className="font-semibold text-slate-900 dark:text-white">
              Compliance status
            </p>
            <p className="mt-2">
              SOC 2 Type II in progress, GDPR-ready, and vendor risk reviews on
              demand.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(layout.panel, "text-xs font-semibold text-slate-700 dark:text-slate-200")}>
              99.9% uptime target
            </div>
            <div className={cn(layout.panel, "text-xs font-semibold text-slate-700 dark:text-slate-200")}>
              Annual penetration tests
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
