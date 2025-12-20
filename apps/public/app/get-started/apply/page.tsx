import Link from "next/link";
import { ApplyForm } from "./ApplyForm";
import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";

export default function GetStartedApplyPage() {
  const steps = [
    "Submit application",
    "We review and provision your organization",
    "You receive an activation email and complete setup in the Org app",
  ];

  return (
    <main className="bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={layout.container}>
          <p className={layout.eyebrow}>Get started</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Apply for a BridgeWorks company account.
          </h1>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Tell us about your portfolio and we will provision a workspace built
            for your team.
          </p>
        </div>
      </section>

      <section className={layout.sectionMuted}>
        <div className={layout.container}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className={layout.card}>
              <ApplyForm />
            </div>
            <aside className="space-y-4">
              <div className={layout.panelMuted}>
                <p className={layout.label}>What happens next</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="mt-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={layout.panel}>
                <p className={layout.label}>Need help?</p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Prefer to talk through your rollout? Our team can walk you
                  through the onboarding timeline.
                </p>
                <Link
                  href="/contact"
                  className={cn(
                    layout.buttonBase,
                    layout.buttonSecondary,
                    "mt-4 w-full"
                  )}
                >
                  Contact Sales
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
