"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

type NavItem = { href: string; label: string };

const navItems: NavItem[] = [
  { href: "/product", label: "Product" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
];

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-teal-600/20 via-teal-600/10 to-transparent ring-1 ring-black/10 shadow-sm dark:ring-white/10">
        <span className="h-3.5 w-3.5 rounded-md bg-teal-700/90 shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] dark:bg-teal-400/90" />
      </span>
      <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
        BridgeWorks PM
      </span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const panelId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const activeHref = useMemo(() => {
    if (!pathname) return "/";
    const exact = navItems.find((i) => i.href === pathname)?.href;
    if (exact) return exact;
    const prefix = navItems.find((i) => pathname.startsWith(`${i.href}/`))?.href;
    return prefix ?? "/";
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (!menuOpen) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={cx(
        "sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70",
        scrolled && "shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]"
      )}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            aria-label="BridgeWorks PM Home"
          >
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-700 dark:text-slate-200 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cx(
                  "rounded-md px-1 py-1 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 dark:hover:text-white",
                  activeHref === item.href && "text-slate-900 dark:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-slate-950"
            >
              Sign In
            </Link>
            <Link
              href="/request-demo"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-700 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90 dark:focus-visible:ring-offset-slate-950"
            >
              Request a Demo
            </Link>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls={panelId}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-slate-950"
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      <div
        id={panelId}
        className={cx(
          "md:hidden",
          menuOpen ? "block" : "hidden"
        )}
      >
        <div className="border-t border-black/5 bg-white/95 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 font-medium text-slate-900 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-white dark:hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <Link
                href="/request-demo"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm outline-none transition-colors hover:bg-teal-700/90 focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-500/90"
              >
                Request a Demo
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
