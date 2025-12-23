import Link from "next/link";

import { SignOutButton } from "../../components/SignOutButton";

import { SidebarNav } from "./SidebarNav";

type ConsoleShellProps = {
  children: React.ReactNode;
  person: {
    name: string | null;
    email: string;
    platformRole: string | null;
  };
};

export function ConsoleShell({ children, person }: ConsoleShellProps) {
  const envLabel = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "dev";

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-6 py-5 lg:flex-col lg:items-start lg:gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                BridgeWorks
              </p>
              <Link
                href="/console"
                className="text-lg font-semibold text-slate-900"
              >
                Founder Console
              </Link>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:mt-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {envLabel}
            </div>
          </div>
          <SidebarNav />
        </aside>

        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <header className="z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-6 py-4">
              <div className="flex min-w-55 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Search
                </span>
                <input
                  type="search"
                  placeholder="Orgs, users, applications"
                  aria-label="Global search"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="text-slate-400">Range</span>
                <select className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none">
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="90d">90d</option>
                </select>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right text-xs">
                  <p className="font-semibold text-slate-800">
                    {person.name ?? person.email}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {person.platformRole ?? "no role"}
                  </p>
                </div>
                <SignOutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-6 py-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
