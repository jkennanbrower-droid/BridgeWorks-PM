"use client";

import { useState } from "react";

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type PersonaKey = "Property Managers" | "Owners/Investors" | "Residents/Tenants" | "Vendors";

type Persona = {
  key: PersonaKey;
  value: string;
  statement: string;
  actions: [string, string, string];
  previewTitle: string;
  previewRows: Array<{ label: string; detail: string; status: string }>;
};

const personas: Persona[] = [
  {
    key: "Property Managers",
    value: "pm",
    statement: "Keep daily operations predictable—from leasing to maintenance—without losing context.",
    actions: ["Approve work orders", "Track delinquencies", "Coordinate turns"],
    previewTitle: "Manager Console",
    previewRows: [
      { label: "Work orders", detail: "8 awaiting approval", status: "Review" },
      { label: "Move-ins", detail: "3 leases pending signature", status: "In progress" },
      { label: "Exceptions", detail: "2 payments need attention", status: "Action" },
    ],
  },
  {
    key: "Owners/Investors",
    value: "owners",
    statement: "See portfolio performance clearly with reporting that matches how assets are managed.",
    actions: ["View statements", "Track NOI by property", "Approve budgets"],
    previewTitle: "Owner Portal",
    previewRows: [
      { label: "Monthly statement", detail: "Ready for review", status: "Available" },
      { label: "Property summary", detail: "Occupancy and delinquencies", status: "View" },
      { label: "Approvals", detail: "1 capex request pending", status: "Review" },
    ],
  },
  {
    key: "Residents/Tenants",
    value: "residents",
    statement: "A simple portal for payments, requests, and updates—clear and easy to navigate.",
    actions: ["Pay rent", "Submit requests", "Receive status updates"],
    previewTitle: "Resident Portal",
    previewRows: [
      { label: "Rent", detail: "Next due: Jan 1", status: "Pay" },
      { label: "Request", detail: "#1047 — HVAC follow-up", status: "Track" },
      { label: "Messages", detail: "1 new update", status: "Read" },
    ],
  },
  {
    key: "Vendors",
    value: "vendors",
    statement: "Clear assignments, simple check-ins, and fast approvals—built for service teams.",
    actions: ["Accept assignments", "Upload photos", "Submit invoices"],
    previewTitle: "Vendor Workspace",
    previewRows: [
      { label: "Assigned", detail: "2 jobs scheduled today", status: "Open" },
      { label: "Invoicing", detail: "1 invoice awaiting approval", status: "Pending" },
      { label: "History", detail: "Service notes per unit", status: "View" },
    ],
  },
];

function Segmented({
  value,
  onChange,
}: {
  value: PersonaKey;
  onChange: (v: PersonaKey) => void;
}) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-black/10 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-950">
      {personas.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={cx(
            "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600",
            value === p.key
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
          )}
        >
          {p.key}
        </button>
      ))}
    </div>
  );
}

export function PersonaSwitcher() {
  const [active, setActive] = useState<PersonaKey>("Property Managers");
  const persona = personas.find((p) => p.key === active)!;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
        <Segmented value={active} onChange={setActive} />

        <div className="mt-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {persona.key}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {persona.statement}
          </h3>

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Key actions
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {persona.actions.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="lg:pt-1">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-600/10 via-transparent to-transparent" />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {persona.previewTitle}
              </p>
              <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                Preview
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-slate-50/60 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">
                <span className="font-medium">Workspace</span>
                <span className="font-medium">Status</span>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {persona.previewRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {r.label}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-600 dark:text-slate-300">
                        {r.detail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10">
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {["Role-based access", "Notifications", "Audit trail"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

