import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

export const metadata = { title: "Terms" };

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={cn(layout.container, "max-w-3xl")}>
          <p className={layout.eyebrow}>Terms</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Terms of service
          </h1>
          <p className={cn(layout.body, "mt-4")}>
            These terms govern use of the BridgeWorks PM platform. This page will
            be expanded with full terms of service.
          </p>
        </div>
      </section>
    </main>
  );
}
