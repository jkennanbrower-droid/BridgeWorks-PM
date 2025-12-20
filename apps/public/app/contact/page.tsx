import Link from "next/link";
import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

export default function ContactPage() {
  return (
    <main className="bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={layout.container}>
          <p className={layout.eyebrow}>Contact</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Talk with the BridgeWorks team.
          </h1>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Tell us about your portfolio and goals, and we will follow up with
            the right next steps.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:sales@bridgeworks.com"
              className={cn(layout.buttonBase, layout.buttonPrimary)}
            >
              Email sales@bridgeworks.com
            </a>
            <Link
              href="/get-started"
              className={cn(layout.buttonBase, layout.buttonSecondary)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
