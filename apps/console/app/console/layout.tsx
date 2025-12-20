import Link from "next/link";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

import { ensureConsolePerson } from "./_server/people";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const person = await ensureConsolePerson();

  if (!person.isPlatformAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your account is not on the founder allowlist.
          </p>
          <Link
            href="/sign-in/console"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              BridgeWorks
            </p>
            <h1 className="text-2xl font-semibold">Founder Console</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link
              href="/console/applications"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition hover:border-slate-300"
            >
              Applications
            </Link>
          </nav>
        </header>
        <ClerkLoading>
          <div className="mt-10 flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Loading console...
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          <section className="mt-10 flex-1 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {children}
          </section>
        </ClerkLoaded>
      </div>
    </main>
  );
}
