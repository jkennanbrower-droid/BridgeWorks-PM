import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import type { OpsTraceItem } from "../../_data/opsTypes";

type TracesListVirtualProps = {
  items: OpsTraceItem[];
};

export function TracesListVirtual({ items }: TracesListVirtualProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const rows = useMemo(() => items, [items]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
  });

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No traces collected yet.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-72 overflow-auto rounded-2xl border border-slate-200 bg-white"
    >
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = rows[virtualRow.index];
          const isActive = activeId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveId(isActive ? null : item.id)}
              className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600 hover:bg-slate-50"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${
                      item.status === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="font-semibold text-slate-800">{item.name}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>{item.durationMs.toFixed(1)} ms</span>
                <span>{item.spans.length} spans</span>
              </div>
              {isActive ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                  <p className="font-semibold text-slate-700">Trace waterfall</p>
                  <ul className="mt-2 space-y-1">
                    {item.spans.map((span) => (
                      <li key={span.id} className="flex items-center justify-between">
                        <span>{span.name}</span>
                        <span>{span.durationMs.toFixed(1)} ms</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
