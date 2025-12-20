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
        </div>
      </section>
    </main>
  );
}
