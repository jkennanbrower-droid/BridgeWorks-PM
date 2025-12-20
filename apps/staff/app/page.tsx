import Link from "next/link";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default function Page() {
  const publicBaseUrl = process.env.PB_PUBLIC_BASE_URL;
  if (!publicBaseUrl) throw new Error("PB_PUBLIC_BASE_URL is not set");

  const homeUrl = `${stripTrailingSlash(publicBaseUrl)}/`;

  return (
    <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Staff Console</h1>
        <Link
          href={homeUrl}
          prefetch={false}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
