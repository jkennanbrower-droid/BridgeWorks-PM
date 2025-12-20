import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string;
  subLabel?: string;
  href?: string;
};

export function StatCard({ label, value, subLabel, href }: StatCardProps) {
  const content = (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
      {subLabel ? <p className="mt-4 text-xs text-slate-500">{subLabel}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
