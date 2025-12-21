import type { ReactNode } from "react";

type PlaceholderModuleProps = {
  title: string;
  description?: ReactNode;
};

export function PlaceholderModule({ title, description }: PlaceholderModuleProps) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        {description ?? "This module is ready for content and widgets."}
      </p>
    </section>
  );
}
