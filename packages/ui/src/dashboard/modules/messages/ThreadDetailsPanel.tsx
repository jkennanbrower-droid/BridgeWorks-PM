"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuditEvent, ThreadPriority, ThreadStatus } from "../../../messaging/types";

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
  threadMeta?: {
    id: string;
    status?: ThreadStatus;
    priority?: ThreadPriority;
    assigneeId?: string;
    assigneeLabel?: string;
    tags?: string[];
    dueDate?: string;
    slaDueAt?: string;
    archivedAt?: string | null;
    linkedWorkOrderId?: string;
    linkedTaskId?: string;
  };
  statusOptions?: ThreadStatus[];
  priorityOptions?: ThreadPriority[];
  assignees?: Array<{ id: string; label: string }>;
  auditEvents?: AuditEvent[];
  onUpdateThread?: (
    patch: Partial<{
      status: ThreadStatus;
      priority: ThreadPriority;
      assigneeId: string;
      assigneeLabel: string;
      tags: string[];
      dueDate: string;
      slaDueAt: string;
      archivedAt: string | null;
      linkedWorkOrderId: string;
      linkedTaskId: string;
    }>,
  ) => void | Promise<void>;
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

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold text-slate-500">{children}</span>;
}

function InlineSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value ?? "";
  return (
    <div className="relative flex items-center justify-between gap-3">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50"
      >
        {current || placeholder || "Select"}
        <span aria-hidden="true" className="text-slate-300">
          ▼
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={async () => {
                setOpen(false);
                await onChange(o.value);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InlineTextInput({
  label,
  value,
  placeholder,
  inputType,
  onCommit,
  disabled,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  inputType?: string;
  onCommit: (value: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={inputType ?? "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void onCommit(draft)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm disabled:opacity-50"
      />
    </div>
  );
}

function LinkedRow({
  icon,
  label,
  subtext,
  emphasis,
  onClick,
}: {
  icon: string;
  label: string;
  subtext?: string;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  threadMeta,
  statusOptions,
  priorityOptions,
  assignees,
  auditEvents,
  onUpdateThread,
}: ThreadDetailsPanelProps) {
  const effectiveActiveTab = "info";

  const canEdit = Boolean(onUpdateThread && threadMeta);
  const [tagDraft, setTagDraft] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  useEffect(() => setArchiveConfirm(false), [threadMeta?.id, isOpen]);

  const timeline = useMemo(() => {
    if (auditEvents?.length) {
      return auditEvents
        .slice(-20)
        .reverse()
        .map((e) => ({
          id: e.id,
          title: e.type,
          actor: e.actorLabel,
          timestampLabel: new Date(e.createdAt).toLocaleString(),
          linkLabel: undefined,
        }));
    }
    return (data.activity ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      actor: e.actor,
      timestampLabel: e.timestampLabel,
      linkLabel: e.linkLabel,
    }));
  }, [auditEvents, data.activity]);

  const toLocalDateTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toIsoDateTime = (value: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  };

  // Tabs UI removed (Info-only).

  if (!isOpen) return null;

  const isArchived = Boolean(threadMeta?.archivedAt);

  return (
    <aside
      aria-label="Thread details"
      className={`flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50 ${className ?? ""}`}
    >
      <div className="sticky top-0 z-10 h-16 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="flex h-full items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Thread Details
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && threadMeta ? (
              <button
                type="button"
                onClick={() => {
                  if (!archiveConfirm) {
                    setArchiveConfirm(true);
                    return;
                  }
                  setArchiveConfirm(false);
                  void onUpdateThread?.({ archivedAt: isArchived ? null : new Date().toISOString() });
                  onClose();
                }}
                className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${
                  archiveConfirm
                    ? isArchived
                      ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {archiveConfirm ? "Confirm" : isArchived ? "Restore" : "Archive"}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Close thread details"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
            >
              <span className="text-xs font-semibold">×</span>
            </button>
          </div>
        </div>

        {/* Tab selector removed. */}
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
                {/* Channel hidden for portal-only messaging (Prompt 1). */}
              </div>              {canEdit ? (
                <div className="mt-4 space-y-3">
                  <InlineSelect
                    label="Status"
                    value={threadMeta?.status}
                    options={(statusOptions ?? ["open", "pending", "resolved", "closed"]).map(
                      (s) => ({ value: s, label: s }),
                    )}
                    onChange={(value) => onUpdateThread?.({ status: value as ThreadStatus })}
                  />
                  <InlineSelect
                    label="Priority"
                    value={threadMeta?.priority}
                    options={(priorityOptions ?? ["low", "normal", "high", "urgent"]).map(
                      (p) => ({ value: p, label: p }),
                    )}
                    onChange={(value) => onUpdateThread?.({ priority: value as ThreadPriority })}
                  />
                  <InlineSelect
                    label="Assignee"
                    value={threadMeta?.assigneeId}
                    placeholder={threadMeta?.assigneeLabel || "Unassigned"}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...(assignees ?? []).map((a) => ({ value: a.id, label: a.label })),
                    ]}
                    onChange={(value) => {
                      const label =
                        (assignees ?? []).find((a) => a.id === value)?.label ?? "";
                      return onUpdateThread?.({ assigneeId: value, assigneeLabel: label });
                    }}
                  />
                  <InlineTextInput
                    label="Due"
                    value={toLocalDateTime(threadMeta?.dueDate)}
                    inputType="datetime-local"
                    placeholder="—"
                    onCommit={(value) => onUpdateThread?.({ dueDate: toIsoDateTime(value) })}
                  />
                  <InlineTextInput
                    label="SLA due"
                    value={toLocalDateTime(threadMeta?.slaDueAt)}
                    inputType="datetime-local"
                    placeholder="—"
                    onCommit={(value) => onUpdateThread?.({ slaDueAt: toIsoDateTime(value) })}
                  />
                </div>
              ) : null}
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
                ) : null}
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
                {data.tags.items.map((tag) =>
                  canEdit ? (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const next = (threadMeta?.tags ?? data.tags.items).filter(
                          (t) => t !== tag,
                        );
                        void onUpdateThread?.({ tags: next });
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200/60"
                    >
                      {tag}
                      <span className="text-slate-400">×</span>
                    </button>
                  ) : (
                    <Chip key={tag} label={tag} tone="slate" />
                  ),
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {data.tags.queue ? (
                  <Chip label={`Queue: ${data.tags.queue}`} tone="sky" />
                ) : null}
                {data.tags.escalation ? (
                  <Chip label={data.tags.escalation} tone="rose" />
                ) : null}
              </div>
              {canEdit ? (
                <div className="mt-4 flex items-center gap-2">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    placeholder="Add tag"
                    className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const value = tagDraft.trim();
                      if (!value) return;
                      const current = new Set(threadMeta?.tags ?? data.tags.items);
                      current.add(value);
                      setTagDraft("");
                      void onUpdateThread?.({ tags: [...current] });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = tagDraft.trim();
                      if (!value) return;
                      const current = new Set(threadMeta?.tags ?? data.tags.items);
                      current.add(value);
                      setTagDraft("");
                      void onUpdateThread?.({ tags: [...current] });
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    Add
                  </button>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Routing">
              <div className="space-y-3">
                {canEdit ? (
                  <InlineSelect
                    label="Assigned to"
                    value={threadMeta?.assigneeId}
                    placeholder={threadMeta?.assigneeLabel || "Unassigned"}
                    options={[
                      { value: "", label: "Unassigned" },
                      ...(assignees ?? []).map((a) => ({ value: a.id, label: a.label })),
                    ]}
                    onChange={(value) => {
                      const label =
                        (assignees ?? []).find((a) => a.id === value)?.label ?? "";
                      return onUpdateThread?.({
                        assigneeId: value,
                        assigneeLabel: label,
                      });
                    }}
                  />
                ) : (
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
                    </div>
                  </div>
                )}
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
                {canEdit ? (
                  <div className="space-y-3 pt-2">
                    <InlineTextInput
                      label="Due"
                      value={toLocalDateTime(threadMeta?.dueDate)}
                      inputType="datetime-local"
                      onCommit={(value) => onUpdateThread?.({ dueDate: toIsoDateTime(value) })}
                    />
                    <InlineTextInput
                      label="SLA due"
                      value={toLocalDateTime(threadMeta?.slaDueAt)}
                      inputType="datetime-local"
                      onCommit={(value) => onUpdateThread?.({ slaDueAt: toIsoDateTime(value) })}
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Activity">
              <div className="-mx-1">
                {timeline.map((event) => (
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
    </aside>
  );
}
