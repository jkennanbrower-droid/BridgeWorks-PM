"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { ExternalLink } from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";

type Props = {
  title: string;
  description: string;
  statusHref: string;
};

export function StatusEmbedCard({ title, description, statusHref }: Props) {
  return (
    <div className={cn(layout.panel)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
        <a
          href={statusHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5",
            layout.focusRing
          )}
        >
          View Status Page
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-5">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-black/15 bg-slate-50 p-6 dark:border-white/15 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            Embed slot (placeholder)
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Replace this container with your status provider embed iframe.
          </p>
          <div className="mt-4 h-24 rounded-xl bg-linear-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
        </div>
      </div>
    </div>
  );
}
