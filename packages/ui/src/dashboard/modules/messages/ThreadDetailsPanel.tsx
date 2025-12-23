"use client";

import { useMemo, useState, type ReactNode } from "react";

export type ThreadDetailsPanelData = {
  title: string;
  status: string;
  priority: string;
  sla?: string;
  createdAtLabel: string;
  lastActivityAtLabel: string;
  channel?: string;
  linked: {
    property?: { label: string; subtext?: string };
    unit?: { label: string; subtext?: string };
    resident?: { label: string; subtext?: string };
    workOrder?: { label: string; subtext?: string };
  };
  participants: Array<{
    id: string;
    name: string;
    role: string;
    online?: boolean;
  }>;
  attachments: Array<{
    id: string;
    filename: string;
    meta: string;
    kind?: "image" | "pdf" | "file";
  }>;
  tags: {
    items: string[];
    queue?: string;
    escalation?: string;
  };
  routing?: {
    assignedTo?: string;
    queue?: string;
    sla?: string;
  };
  activity?: Array<{
    id: string;
    title: string;
    actor: string;
    timestampLabel: string;
    linkLabel?: string;
  }>;
  compliance?: {
    retention?: string;
    logged?: string;
  };
};

type ThreadDetailsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  isStaffView: boolean;
  data: ThreadDetailsPanelData;
  className?: string;
};

function IconBox({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-500"
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Chip({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "emerald" | "amber" | "sky" | "rose";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-800 ring-emerald-500/20"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-800 ring-amber-500/20"
        : tone === "sky"
          ? "bg-sky-500/10 text-sky-800 ring-sky-500/20"
          : tone === "rose"
            ? "bg-rose-500/10 text-rose-800 ring-rose-500/20"
            : "bg-slate-500/10 text-slate-700 ring-slate-500/20";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}
    >
      {label}
    </span>
  );
}

function LinkedRow({
  icon,
  label,
  subtext,
  emphasis,
}: {
  icon: string;
  label: string;
  subtext?: string;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
    >
      <IconBox label={icon} />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            emphasis ? "text-sky-700" : "text-slate-900"
          }`}
        >
          {label}
        </p>
        {subtext ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtext}</p>
        ) : null}
      </div>
      <span aria-hidden="true" className="text-slate-300">
        ›
      </span>
    </button>
  );
}

function ParticipantAvatar({ name, online }: { name: string; online?: boolean }) {
  const initials = useMemo(() => {
    const parts = name.split(" ").filter(Boolean);
    return (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
  }, [name]);

  return (
    <div className="relative">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500/10 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
        {initials.toUpperCase()}
      </div>
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      ) : null}
    </div>
  );
}

function TimelineItem({
  title,
  actor,
  timestampLabel,
  linkLabel,
}: {
  title: string;
  actor: string;
  timestampLabel: string;
  linkLabel?: string;
}) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          EV
        </span>
        <span aria-hidden="true" className="mt-1 h-full w-px bg-slate-200" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {actor} • {timestampLabel}
          {linkLabel ? (
            <>
              {" "}
              •{" "}
              <span className="font-semibold text-sky-700">{linkLabel}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function ThreadDetailsPanel({
  isOpen,
  onClose,
  isStaffView,
  data,
  className,
}: ThreadDetailsPanelProps) {
  const tabs = useMemo(
    () =>
      [
        { id: "info", label: "Info", visible: true },
        { id: "internal", label: "Internal", visible: isStaffView },
      ].filter((tab) => tab.visible),
    [isStaffView],
  );
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    tabs[0]?.id ?? "info",
  );

  const effectiveActiveTab =
    tabs.find((tab) => tab.id === activeTab)?.id ?? (tabs[0]?.id ?? "info");

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Thread details"
      className={`flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50 ${className ?? ""}`}
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 pt-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Thread Details
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Pin"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
            >
              <span className="text-xs font-semibold">P</span>
            </button>
            <button
              type="button"
              aria-label="Expand"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
            >
              <span className="text-xs font-semibold">⤢</span>
            </button>
            <button
              type="button"
              aria-label="Close thread details"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
            >
              <span className="text-xs font-semibold">×</span>
            </button>
          </div>
        </div>

        <div className="pb-3">
          <div className="flex w-full items-center gap-1 rounded-full bg-slate-100 p-1">
            {tabs.map((tab) => {
              const active = effectiveActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {effectiveActiveTab === "info" ? (
          <div className="space-y-4">
            <SectionCard>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {data.title}
                </p>
                <button
                  type="button"
                  aria-label="Edit summary"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
                >
                  <span className="text-xs font-semibold">✎</span>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip
                  label={data.status}
                  tone={data.status.toLowerCase().includes("resolved") ? "emerald" : "sky"}
                />
                <Chip
                  label={data.priority}
                  tone={
                    data.priority.toLowerCase().includes("high") ? "rose" : "amber"
                  }
                />
                {data.sla ? <Chip label={data.sla} tone="slate" /> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Created • {data.createdAtLabel}</span>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <span>Last activity • {data.lastActivityAtLabel}</span>
                {data.channel ? (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      |
                    </span>
                    <Chip label={data.channel} tone="slate" />
                  </>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Linked">
              <div className="-mx-2 space-y-1">
                <LinkedRow
                  icon="PR"
                  label={data.linked.property?.label ?? "Property"}
                  subtext={data.linked.property?.subtext}
                />
                <LinkedRow
                  icon="UN"
                  label={data.linked.unit?.label ?? "Unit"}
                  subtext={data.linked.unit?.subtext}
                />
                <LinkedRow
                  icon="RS"
                  label={data.linked.resident?.label ?? "Resident / Lease"}
                  subtext={data.linked.resident?.subtext}
                />
                {data.linked.workOrder ? (
                  <LinkedRow
                    icon="WO"
                    label={data.linked.workOrder.label}
                    subtext={data.linked.workOrder.subtext}
                  />
                ) : (
                  <LinkedRow
                    icon="WO"
                    label="Create work order"
                    subtext="Link this thread to a new work order"
                    emphasis
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Participants"
              action={
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  + Add
                </button>
              }
            >
              <div className="space-y-2">
                {data.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <ParticipantAvatar
                      name={participant.name}
                      online={participant.online}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {participant.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Chip label={participant.role} tone="slate" />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Participant menu"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
                    >
                      <span className="text-xs font-semibold">⋯</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                <span aria-hidden="true" className="text-slate-500">
                  🔒
                </span>
                Tenant cannot see internal notes
              </div>
            </SectionCard>

            <SectionCard title="Attachments">
              <div className="space-y-2">
                {data.attachments.slice(0, 3).map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                      {attachment.kind === "image"
                        ? "IMG"
                        : attachment.kind === "pdf"
                          ? "PDF"
                          : "FILE"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {attachment.filename}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {attachment.meta}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Preview"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
                      >
                        <span className="text-xs font-semibold">👁</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Download"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
                      >
                        <span className="text-xs font-semibold">⇩</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {data.attachments.length > 3 ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-sky-700 hover:text-sky-800"
                >
                  View all
                </button>
              ) : null}
            </SectionCard>

            <SectionCard title="Tags">
              <div className="flex flex-wrap gap-2">
                {data.tags.items.map((tag) => (
                  <Chip key={tag} label={tag} tone="slate" />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {data.tags.queue ? (
                  <Chip label={`Queue: ${data.tags.queue}`} tone="sky" />
                ) : null}
                {data.tags.escalation ? (
                  <Chip label={data.tags.escalation} tone="rose" />
                ) : null}
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Routing">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Assigned to
                  </p>
                  <div className="flex items-center gap-2">
                    {data.routing?.assignedTo ? (
                      <Chip label={data.routing.assignedTo} tone="slate" />
                    ) : (
                      <Chip label="Unassigned" tone="amber" />
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">Queue</p>
                  {data.routing?.queue ? (
                    <Chip label={data.routing.queue} tone="sky" />
                  ) : (
                    <Chip label="—" tone="slate" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">SLA</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Chip label={data.routing?.sla ?? "No SLA"} tone="slate" />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Activity">
              <div className="-mx-1">
                {(data.activity ?? []).map((event) => (
                  <TimelineItem
                    key={event.id}
                    title={event.title}
                    actor={event.actor}
                    timestampLabel={event.timestampLabel}
                    linkLabel={event.linkLabel}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Compliance">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
                >
                  Export JSON
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.compliance?.retention ? (
                  <Chip label={data.compliance.retention} tone="slate" />
                ) : null}
                {data.compliance?.logged ? (
                  <Chip label={data.compliance.logged} tone="emerald" />
                ) : null}
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 h-16 border-t border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="grid h-full grid-cols-3 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Create Work Order
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
          >
            Schedule
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
          >
            Mark Resolved
          </button>
        </div>
      </div>
    </aside>
  );
}
