import Link from "next/link";
import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";

type SubmittedPageProps = {
  searchParams?: {
    ref?: string;
  };
};

export default function GetStartedSubmittedPage({
  searchParams,
}: SubmittedPageProps) {
  const ref = searchParams?.ref;

  return (
    <main className="bg-white text-slate-900 dark:bg-black dark:text-white">
      <section className={layout.section}>
        <div className={layout.container}>
          <p className={layout.eyebrow}>Application submitted</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            We received your application.
          </h1>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            We received your application. Next steps: review + activation email.
          </p>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Our team will review your details, provision your organization, and
            send an activation email to complete setup.
          </p>
          {ref ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Reference: {ref}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className={cn(layout.buttonBase, layout.buttonSecondary)}
            >
              Contact Sales
            </Link>
            <Link
              href="/"
              className={cn(layout.buttonBase, layout.buttonPrimary)}
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
