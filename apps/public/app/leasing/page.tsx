import { LeasingApplicantClient } from "./LeasingApplicantClient";
import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

export default function LeasingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className={cn(layout.section, "bg-gradient-to-b from-white to-slate-50")}>
        <div className={layout.container}>
          <header className="mb-10 max-w-3xl">
            <p className={layout.eyebrow}>Leasing Pipeline v4</p>
            <h1 className={cn(layout.h2, "mt-3")}>Applicant Portal</h1>
            <p className={cn(layout.body, "mt-3")}>
              Start, autosave, submit, and resolve info requests with a production-ready Phase 1 experience.
            </p>
          </header>
          <LeasingApplicantClient />
        </div>
      </section>
    </main>
  );
}
