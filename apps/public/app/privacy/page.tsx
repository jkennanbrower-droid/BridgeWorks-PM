import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

export const metadata = { title: "Privacy" };

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={cn(layout.container, "max-w-3xl")}>
          <p className={layout.eyebrow}>Privacy</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Privacy policy
          </h1>
          <p className={cn(layout.body, "mt-4")}>
            We respect your privacy. This page will outline how BridgeWorks PM
            collects, uses, and protects your data.
          </p>

          <div className="mt-8">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              What to expect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Only collect data needed to run the platform</li>
              <li>Use data to deliver workflows, notifications, and support</li>
              <li>Protect data with access controls and operational safeguards</li>
              <li>Provide a path to request help with privacy questions</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
