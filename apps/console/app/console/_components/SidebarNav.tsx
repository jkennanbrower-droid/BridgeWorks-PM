"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/console", label: "Overview" },
  { href: "/console/orgs", label: "Orgs" },
  { href: "/console/users", label: "Users" },
  { href: "/console/applications", label: "Applications" },
  { href: "/console/health", label: "Health" },
  { href: "/console/metrics", label: "Metrics" },
  { href: "/console/audit", label: "Audit Logs" },
  { href: "/console/support", label: "Support Tools" },
  { href: "/console/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:overflow-visible lg:px-6 lg:pb-6">
      {navItems.map((item) => {
        const isActive =
          item.href === "/console"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
