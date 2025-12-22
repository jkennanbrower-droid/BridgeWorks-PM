"use client";

import { useState } from "react";
import { useServiceErrors } from "../../_hooks/useServiceErrors";
import { ErrorsTable } from "../../components/tables/ErrorsTable";
import { SERVICE_DEFINITIONS } from "../../_data/services";

type ErrorsPageClientProps = {
  initialService: string;
};

const RANGE_OPTIONS = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

export function ErrorsPageClient({ initialService }: ErrorsPageClientProps) {
  const [service, setService] = useState(initialService);
  const [range, setRange] = useState("24h");
  const [query, setQuery] = useState("");

  const errors = useServiceErrors(service, range, query, 30_000);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Errors</h1>
        <p className="mt-2 text-sm text-slate-600">
          Investigate recent error spikes and failure patterns.
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
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search errors"
          className="h-10 flex-1 rounded-full border border-slate-200 px-3 text-sm text-slate-700"
        />
      </div>

      <ErrorsTable items={errors.data?.items ?? []} />
    </div>
  );
}
