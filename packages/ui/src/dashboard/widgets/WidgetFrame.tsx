"use client";

import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import type { WidgetSize } from "../types";

type WidgetFrameProps = {
  title: string;
  sizePreset: WidgetSize;
  customizeMode?: boolean;
  allowedSizes?: WidgetSize[];
  onResize?: (nextSize: WidgetSize) => void;
  dragHandleProps?: HTMLAttributes<HTMLSpanElement>;
  children: ReactNode;
};

const sizeClasses: Record<WidgetSize, string> = {
  sm: "col-span-12 sm:col-span-6 xl:col-span-3",
  md: "col-span-12 xl:col-span-6",
  lg: "col-span-12",
  tall: "col-span-12 xl:col-span-6 row-span-2 min-h-[320px]",
};

const defaultSizes: WidgetSize[] = ["sm", "md", "lg"];

function getNextSize(
  current: WidgetSize,
  allowedSizes: WidgetSize[] | undefined,
): WidgetSize {
  const sizes = allowedSizes && allowedSizes.length
    ? allowedSizes
    : defaultSizes;
  const index = sizes.indexOf(current);
  if (index === -1) return sizes[0];
  return sizes[(index + 1) % sizes.length];
}

export function WidgetFrame({
  title,
  sizePreset,
  customizeMode = false,
  allowedSizes,
  onResize,
  dragHandleProps,
  children,
}: WidgetFrameProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canResize = Boolean(customizeMode && onResize && allowedSizes?.length);

  return (
    <section
      className={`relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm ${
        sizeClasses[sizePreset]
      } ${customizeMode ? "ring-2 ring-teal-400/30" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {customizeMode ? (
            <span
              {...dragHandleProps}
              className="cursor-grab rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-400"
            >
              ::
            </span>
          ) : null}
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {customizeMode ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              aria-label="Widget menu"
            >
              ...
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 w-32 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                <button
                  type="button"
                  disabled={!canResize}
                  onClick={() => {
                    if (!onResize) return;
                    onResize(getNextSize(sizePreset, allowedSizes));
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-slate-600 transition hover:bg-slate-50 ${
                    canResize ? "" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  Resize
                  <span className="text-[10px] uppercase text-slate-400">
                    {sizePreset}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex-1 px-4 py-4">{children}</div>
    </section>
  );
}
