import { cn } from "../ui/cn";
import { layout } from "../ui/layout";

/*
 * Section: Portals.
 * Purpose: Showcase resident and owner experiences with a mobile preview.
 * Edit: Eyebrow, headline, body copy, and portal card text.
 * Layout: Uses layout.sectionMuted, layout.card, layout.bodyMax.
 */
export function PortalsSection() {
  // EDIT ME: Update portal copy and labels.
  return (
    <section className={layout.sectionMuted}>
      <div className={cn(layout.container, "grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center")}>
        <div className={cn(layout.card, "relative overflow-hidden")}>
          <div className={layout.label}>
            Resident mobile view
          </div>
          <div className="mt-6 flex items-center justify-center">
            <div className="h-[360px] w-[220px] rounded-[2.5rem] border border-black/10 bg-slate-50 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex h-full flex-col gap-3 rounded-[2rem] border border-black/10 bg-white p-3 dark:border-white/15 dark:bg-slate-950">
                <div className="h-4 rounded-full bg-slate-100 dark:bg-slate-900" />
                <div className="grid gap-2">
                  <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                  <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                  <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-900" />
                </div>
                <div className="mt-auto h-8 rounded-full bg-teal-100 dark:bg-teal-500/20" />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -left-16 -top-16 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />
        </div>
        <div>
          <p className={layout.eyebrow}>Portals</p>
          <h2 className={cn(layout.h2, "mt-3")}>Every stakeholder gets a tailored experience.</h2>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Residents, owners, and vendors see exactly what they need while
            teams stay aligned in one workspace.
          </p>
          <div className="mt-10 grid gap-6">
            <div className={layout.card}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Resident portal
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Submit requests, schedule access, and receive proactive updates
                in a modern experience.
              </p>
            </div>
            <div className={layout.card}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Owner & investor view
              </h3>
              <p className={cn(layout.body, "mt-2")}>
                Deliver transparent reporting, approvals, and portfolio status
                in one secure destination.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
