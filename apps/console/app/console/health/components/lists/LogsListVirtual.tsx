import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import type { OpsLogItem } from "../../_data/opsTypes";

type LogsListVirtualProps = {
  items: OpsLogItem[];
};

export function LogsListVirtual({ items }: LogsListVirtualProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const rows = useMemo(() => items, [items]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
  });

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No logs available yet.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-72 overflow-auto rounded-2xl border border-slate-200 bg-white"
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
        }}
      >
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
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500">
                    {item.level}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {item.message}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>{item.method ?? "GET"} {item.route ?? "--"}</span>
                <span>Status {item.status ?? "--"}</span>
                <span>{item.durationMs ? `${Math.round(item.durationMs)} ms` : "--"}</span>
              </div>
              {isActive ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
