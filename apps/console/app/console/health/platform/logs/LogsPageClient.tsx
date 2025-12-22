"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Filter } from "lucide-react";

import { SERVICE_DEFINITIONS } from "../../_data/services";
import { useServiceLogs } from "../../_hooks/useServiceLogs";
import { LogsListVirtual } from "../../components/lists/LogsListVirtual";

type LogsPageClientProps = {
  initialService: string;
};

const RANGE_OPTIONS = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

export function LogsPageClient({ initialService }: LogsPageClientProps) {
  const [service, setService] = useState(initialService);
  const [range, setRange] = useState("24h");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");

  const logs = useServiceLogs(service, range, level, query, 30_000);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Logs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Filter structured logs and inspect payload details.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={service}
          onChange={(event) => setService(event.target.value)}
          className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
        >
          {SERVICE_DEFINITIONS.map((serviceOption) => (
            <option key={serviceOption.key} value={serviceOption.key}>
              {serviceOption.label}
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Range {option.label}
            </option>
          ))}
        </select>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <Filter className="h-4 w-4" />
              {level ? `Level: ${level}` : "Level"}
            </button>
          </Popover.Trigger>
          <Popover.Content
            sideOffset={8}
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg"
          >
            <div className="flex flex-col gap-2">
              {["", "info", "warn", "error"].map((option) => (
                <button
                  key={option || "all"}
                  type="button"
                  onClick={() => setLevel(option)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-left hover:border-slate-300"
                >
                  {option ? option.toUpperCase() : "All levels"}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Root>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search logs"
          className="h-10 flex-1 rounded-full border border-slate-200 px-3 text-sm text-slate-700"
        />
      </div>

      <LogsListVirtual items={logs.data?.items ?? []} />
    </div>
  );
}
