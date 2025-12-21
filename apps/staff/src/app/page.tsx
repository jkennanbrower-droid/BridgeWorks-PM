import Link from "next/link";
import { AuthBootstrapGate } from "../components/AuthBootstrapGate";

export const dynamic = "force-dynamic";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default function Home() {
  const publicBaseUrl =
    process.env.NEXT_PUBLIC_PUBLIC_APP_URL ?? process.env.PB_PUBLIC_BASE_URL;

  const homeUrl = publicBaseUrl ? `${stripTrailingSlash(publicBaseUrl)}/` : "/";

  return (
    <AuthBootstrapGate required="staff">
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Staff Console</h1>
          <p className="text-sm text-slate-500">Auth is currently disabled.</p>
          <Link
            href={homeUrl}
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
          >
            Back to home
          </Link>
        </div>
      </main>
    </AuthBootstrapGate>
  );
}
