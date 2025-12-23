import Link from "next/link";

type HealthTab = {
  value: "platform" | "customer";
  label: string;
  href: string;
};

const HEALTH_TABS: HealthTab[] = [
  { value: "platform", label: "Platform Health", href: "/console/health/platform" },
  { value: "customer", label: "Customer Health", href: "/console/health/customer" },
];

export function HealthTabs({ active }: { active: HealthTab["value"] }) {
  return (
    <nav aria-label="Health views" className="flex flex-wrap gap-2">
      {HEALTH_TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={tab.value === active ? "page" : undefined}
          className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
            tab.value === active
              ? "border-black bg-black text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
