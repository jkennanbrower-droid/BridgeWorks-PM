import Link from "next/link";

export const metadata = { title: "Resources" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Placeholder
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Resources
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">
          This is a blank placeholder page so navigation and footer anchors work.
        </p>

        <div className="mt-10 space-y-12">
          <section id="guides" className="scroll-mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Guides
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              Add implementation guides and operational playbooks here.
            </p>
          </section>

          <section id="faq" className="scroll-mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              FAQ
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              Add frequently asked questions here.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-700 outline-none transition-colors hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
          >
            Back to Home
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

