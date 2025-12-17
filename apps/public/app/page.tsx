export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="text-sm font-semibold tracking-tight text-black dark:text-white"
          >
            Home
          </a>
          <nav className="flex items-center gap-6 text-sm text-black/70 dark:text-white/70">
            <a className="hover:text-black dark:hover:text-white" href="#features">
              Features
            </a>
            <a className="hover:text-black dark:hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="hover:text-black dark:hover:text-white" href="#faq">
              FAQ
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                Next.js starter page
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                A simple, modern home page
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-black/70 dark:text-white/70">
                Use this as a clean baseline: hero, feature highlights, simple pricing,
                and an FAQ—no branding, no dependencies, fully static.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#pricing"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  See pricing
                </a>
                <a
                  href="#features"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 px-4 text-sm font-medium text-black hover:bg-black/[0.03] dark:border-white/15 dark:text-white dark:hover:bg-white/[0.06]"
                >
                  Explore features
                </a>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
                <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                  <dt className="text-xs text-black/60 dark:text-white/60">Setup</dt>
                  <dd className="mt-1 text-lg font-semibold">Fast</dd>
                </div>
                <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                  <dt className="text-xs text-black/60 dark:text-white/60">Pages</dt>
                  <dd className="mt-1 text-lg font-semibold">Static</dd>
                </div>
                <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                  <dt className="text-xs text-black/60 dark:text-white/60">Style</dt>
                  <dd className="mt-1 text-lg font-semibold">Tailwind</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-black/10 bg-gradient-to-b from-black/[0.03] to-transparent p-6 dark:border-white/10 dark:from-white/[0.06]">
              <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
                <p className="text-xs font-medium text-black/60 dark:text-white/60">
                  Preview panel
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                    <p className="text-sm font-medium">Announcements</p>
                    <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                      Keep this area for release notes or onboarding tips.
                    </p>
                  </div>
                  <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                    <p className="text-sm font-medium">Quick actions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/70 dark:border-white/10 dark:text-white/70">
                        Create
                      </span>
                      <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/70 dark:border-white/10 dark:text-white/70">
                        Import
                      </span>
                      <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/70 dark:border-white/10 dark:text-white/70">
                        Settings
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-14 sm:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
              <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                A few generic sections you can keep or replace.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "App Router ready",
                body: "Uses the `app/` directory and server components by default.",
              },
              {
                title: "Responsive layout",
                body: "Grids and spacing scale cleanly from mobile to desktop.",
              },
              {
                title: "Dark mode friendly",
                body: "Uses `dark:` classes and avoids hard-coded colors.",
              },
              {
                title: "Static content",
                body: "No API calls, no client-side state, fast first load.",
              },
              {
                title: "Composable sections",
                body: "Hero, features, pricing, and FAQ as clean building blocks.",
              },
              {
                title: "Simple styling",
                body: "Tailwind-only, no extra UI library required.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/70 dark:text-white/70">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="py-14 sm:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
              <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                Placeholder tiers; swap to your real model later.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$0",
                features: ["Basic pages", "Static export friendly", "Community support"],
                cta: "Get started",
                primary: false,
              },
              {
                name: "Standard",
                price: "$19",
                features: ["Everything in Starter", "Auth-ready structure", "Email support"],
                cta: "Choose Standard",
                primary: true,
              },
              {
                name: "Pro",
                price: "$49",
                features: ["Everything in Standard", "Advanced roles", "Priority support"],
                cta: "Choose Pro",
                primary: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={[
                  "rounded-2xl border p-6",
                  tier.primary
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/10 dark:border-white/10",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{tier.name}</h3>
                  <p className="text-2xl font-semibold tracking-tight">{tier.price}</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className={tier.primary ? "text-white/90 dark:text-black/80" : "text-black/70 dark:text-white/70"}>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={[
                    "mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium",
                    tier.primary
                      ? "bg-white text-black hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
                      : "border border-black/15 text-black hover:bg-black/[0.03] dark:border-white/15 dark:text-white dark:hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="py-14 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {[
              {
                q: "Is this a template or production code?",
                a: "It’s a safe, minimal starting point. Replace sections and copy patterns you like.",
              },
              {
                q: "Does it require client components?",
                a: "No. The page is fully static and can stay server-rendered.",
              },
              {
                q: "Can I add auth later?",
                a: "Yes—this is just a layout baseline. Add auth routes and middleware when ready.",
              },
              {
                q: "Why Tailwind?",
                a: "You already have it installed; this keeps styling simple and dependency-free.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-black/10 p-5 dark:border-white/10"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  <span className="group-open:opacity-90">{item.q}</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-black/70 dark:text-white/70">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Ready to build?</h2>
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                  Replace the placeholder content with your app’s real flows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Primary action
                </a>
                <a
                  href="#"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 px-4 text-sm font-medium text-black hover:bg-black/[0.03] dark:border-white/15 dark:text-white dark:hover:bg-white/[0.06]"
                >
                  Secondary action
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-black/60 dark:text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()}.</p>
          <div className="flex gap-4">
            <a className="hover:text-black dark:hover:text-white" href="#">
              Privacy
            </a>
            <a className="hover:text-black dark:hover:text-white" href="#">
              Terms
            </a>
            <a className="hover:text-black dark:hover:text-white" href="#">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
