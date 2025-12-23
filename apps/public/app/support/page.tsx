import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";
import { ScrollToButtons } from "../components/ScrollToButtons";

export const metadata = { title: "Support" };

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <ScrollToButtons />
      <section className={layout.section}>
        <div className={cn(layout.container, "max-w-3xl")}>
          <p className={layout.eyebrow}>Support</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Support
          </h1>
          <p className={cn(layout.body, "mt-4")}>
            Need help signing in? Contact your property team or reach out to
            BridgeWorks support for assistance.
          </p>

          <div className="mt-8">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Common topics
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Account access and password resets</li>
              <li>Invites for staff and organization users</li>
              <li>Tenant application status and portal navigation</li>
              <li>Bug reports and troubleshooting</li>
            </ul>
          </div>

          <div className="mt-8">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Emergencies
            </h2>
            <p className={cn(layout.body, "mt-3")}>
              For urgent safety issues, contact your property’s emergency line or
              local emergency services.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
