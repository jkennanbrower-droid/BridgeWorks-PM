// EDIT ME: Adjust these tokens to change spacing/typography across the landing page.
// If we want these UI primitives shared across apps/user and apps/staff, move /components/ui
// into a new workspace package (e.g., packages/ui) and add it to transpilePackages in each app's next.config.ts.
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black";

export const layout = {
  container: "mx-auto max-w-[1200px] px-6",
  section: "py-16 sm:py-20",
  sectionTight: "py-14 sm:py-16",
  sectionMuted: "py-16 sm:py-20 bg-slate-50 dark:bg-slate-950",
  eyebrow:
    "text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400",
  h2: "text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl",
  body: "text-base leading-7 text-slate-700 dark:text-slate-200",
  bodyMax: "max-w-2xl",
  label:
    "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400",
  card: "rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950",
  panel:
    "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-slate-950",
  panelMuted:
    "rounded-xl border border-black/10 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900",
  focusRing,
  inputBase:
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200",
  buttonBase: `inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors ${focusRing}`,
  buttonPrimary:
    "bg-teal-700 text-white hover:bg-teal-700/90 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90",
  buttonSecondary:
    "border border-black/10 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5",
  buttonGhost:
    "border border-transparent text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10",
};
