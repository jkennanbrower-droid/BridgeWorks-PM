import Link from "next/link";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="rounded-md outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-600 dark:hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-black">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-teal-600/20 via-teal-600/10 to-transparent ring-1 ring-black/10 shadow-sm dark:ring-white/10">
                <span className="h-3.5 w-3.5 rounded-md bg-teal-700/90 shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] dark:bg-teal-400/90" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                BridgeWorks PM
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-700 dark:text-slate-200">
              A clean, unified platform for leasing, rent collection, maintenance, accounting,
              and resident communication.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-slate-200 dark:hover:text-white"
              >
                Sign In
              </Link>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden>
                •
              </span>
              <Link
                href="/admin"
                className="text-sm font-semibold text-slate-600 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-slate-300 dark:hover:text-white"
              >
                Admin Console
              </Link>
            </div>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { href: "/product", label: "Product" },
              { href: "/solutions", label: "Solutions" },
              { href: "/pricing", label: "Pricing" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { href: "/resources", label: "Resources" },
              { href: "/resources#guides", label: "Guides" },
              { href: "/resources#faq", label: "FAQ" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-black/10 pt-6 text-[12px] text-slate-600 dark:border-white/10 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BridgeWorks PM. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>SSO</span>
            <span aria-hidden>•</span>
            <span>Role-based access</span>
            <span aria-hidden>•</span>
            <span>Audit logs</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
