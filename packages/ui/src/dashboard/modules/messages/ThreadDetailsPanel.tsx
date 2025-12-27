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
    task?: { label: string; subtext?: string };
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
  workOrders?: Array<{ id: string; label: string; category?: string }>;
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
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
        className ?? ""
      }`}
    >
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

function SummaryStat({
  label,
  value,
  tone = "slate",
  className,
}: {
  label: string;
  value?: string;
  tone?: "slate" | "emerald" | "amber" | "sky" | "rose";
  className?: string;
}) {
  const toneClasses =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "sky"
          ? "text-sky-700"
          : tone === "rose"
            ? "text-rose-700"
            : "text-slate-900";

  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 ${
        className ?? ""
      }`}
    >
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${toneClasses}`}>
        {value || "—"}
      </p>
    </div>
  );
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

function formatRoleLabel(role: string) {
  switch (role) {
    case "tenant":
      return "Resident";
    case "staff":
      return "Staff";
    case "vendor":
      return "Vendor";
    case "org":
      return "Organization";
    case "internal":
      return "Internal";
    default:
      return role;
  }
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
  workOrders,
  onUpdateThread,
}: ThreadDetailsPanelProps) {
  const effectiveActiveTab = "info";

  const canEdit = Boolean(onUpdateThread && threadMeta);
  const [tagDraft, setTagDraft] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [workOrderCategory, setWorkOrderCategory] = useState("all");

  useEffect(() => setArchiveConfirm(false), [threadMeta?.id, isOpen]);
  useEffect(() => setOverviewEditing(false), [threadMeta?.id, isOpen]);

  const workOrderItems = useMemo(() => workOrders ?? [], [workOrders]);
  const selectedWorkOrder = useMemo(
    () => workOrderItems.find((order) => order.id === threadMeta?.linkedWorkOrderId),
    [workOrderItems, threadMeta?.linkedWorkOrderId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setWorkOrderCategory(selectedWorkOrder?.category ?? "all");
  }, [isOpen, selectedWorkOrder?.category, threadMeta?.id]);

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

  const formatTimestampLabel = (iso?: string) => {
    if (!iso) return "—";
    const date = new Date(iso);
    const ms = date.getTime();
    if (Number.isNaN(ms)) return "—";
    const now = new Date();
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) return `Today ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
    if (isYesterday) return `Yesterday ${time}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate();
    if (isTomorrow) return `Tomorrow ${time}`;
    const dateLabel =
      date.getFullYear() === now.getFullYear()
        ? date.toLocaleDateString([], { month: "short", day: "numeric" })
        : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${dateLabel} ${time}`;
  };

  const workOrderCategoryOptions = useMemo(() => {
    const categories = new Set<string>();
    workOrderItems.forEach((order) => {
      if (order.category) categories.add(order.category);
    });
    const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b));
    return [{ value: "all", label: "All categories" }].concat(
      sorted.map((category) => ({ value: category, label: category })),
    );
  }, [workOrderItems]);

  const filteredWorkOrders = useMemo(() => {
    if (workOrderCategory === "all") return workOrderItems;
    return workOrderItems.filter((order) => order.category === workOrderCategory);
  }, [workOrderCategory, workOrderItems]);

  const workOrderOptions = useMemo(
    () => [
      { value: "", label: "Unlinked" },
      ...filteredWorkOrders.map((order) => ({ value: order.id, label: order.label })),
    ],
    [filteredWorkOrders],
  );

  // Tabs UI removed (Info-only).

  if (!isOpen) return null;

  const isArchived = Boolean(threadMeta?.archivedAt);
  const statusTone =
    data.status === "open"
      ? "sky"
      : data.status === "pending"
        ? "amber"
        : data.status === "resolved"
          ? "emerald"
          : "slate";
  const priorityTone =
    data.priority === "urgent"
      ? "rose"
      : data.priority === "high"
        ? "amber"
        : "slate";
  const slaTone = (() => {
    if (!threadMeta?.slaDueAt) return "slate";
    const due = new Date(threadMeta.slaDueAt).getTime();
    if (Number.isNaN(due)) return "slate";
    const diff = due - Date.now();
    if (diff <= 0) return "rose";
    if (diff <= 2 * 60 * 60 * 1000) return "amber";
    if (diff <= 24 * 60 * 60 * 1000) return "sky";
    return "emerald";
  })();
  const summaryBorderClass =
    statusTone === "emerald"
      ? "border-l-emerald-500"
      : statusTone === "amber"
        ? "border-l-amber-500"
        : statusTone === "sky"
          ? "border-l-sky-500"
          : statusTone === "rose"
            ? "border-l-rose-500"
            : "border-l-slate-300";
  const summaryContext = [
    data.linked.resident?.label,
    data.linked.unit?.label,
    data.linked.property?.label,
  ].filter((item): item is string => Boolean(item));
  const assigneeLabel =
    threadMeta?.assigneeLabel ?? data.routing?.assignedTo ?? "Unassigned";
  const queueLabel = data.tags.queue ?? data.routing?.queue ?? "—";
  const dueLabel = formatTimestampLabel(threadMeta?.dueDate);
  const slaDueLabel = threadMeta?.slaDueAt
    ? formatTimestampLabel(threadMeta.slaDueAt)
    : data.sla?.replace(/^SLA due /, "") ?? "—";
  const attachmentCount = data.attachments.length;
  const attachmentLabel = `${attachmentCount} file${attachmentCount === 1 ? "" : "s"}`;
  const hasLinked = Boolean(
    data.linked.property ||
      data.linked.unit ||
      data.linked.resident ||
      data.linked.workOrder ||
      data.linked.task,
  );

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
            <SectionCard
              title="Overview"
              action={
                canEdit ? (
                  <button
                    type="button"
                    onClick={() => setOverviewEditing((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    {overviewEditing ? "Done" : "Edit"}
                  </button>
                ) : null
              }
              className={`border-l-4 ${summaryBorderClass}`}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{data.title}</p>
                  {summaryContext.length ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {summaryContext.join(" • ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip label={data.status} tone={statusTone} />
                  <Chip label={data.priority} tone={priorityTone} />
                  {data.tags.queue ? (
                    <Chip label={`Queue: ${data.tags.queue}`} tone="sky" />
                  ) : null}
                  {data.tags.escalation ? (
                    <Chip label={data.tags.escalation} tone="rose" />
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SummaryStat label="Assignee" value={assigneeLabel} />
                  <SummaryStat label="Queue" value={queueLabel} />
                  <SummaryStat label="Due" value={dueLabel} />
                  <SummaryStat label="SLA due" value={slaDueLabel} tone={slaTone} />
                  <SummaryStat label="Last activity" value={data.lastActivityAtLabel} />
                  <SummaryStat label="Created" value={data.createdAtLabel} />
                  <SummaryStat
                    label="Participants"
                    value={`${data.participants.length}`}
                  />
                  <SummaryStat label="Attachments" value={attachmentLabel} />
                </div>
              </div>
              {canEdit && overviewEditing ? (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
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
                  <InlineSelect
                    label="Category"
                    value={workOrderCategory}
                    options={workOrderCategoryOptions}
                    onChange={(value) => setWorkOrderCategory(value)}
                    disabled={!workOrderItems.length}
                  />
                  <InlineSelect
                    label="Work order"
                    value={threadMeta?.linkedWorkOrderId ?? ""}
                    placeholder="Unlinked"
                    options={workOrderOptions}
                    onChange={(value) => onUpdateThread?.({ linkedWorkOrderId: value })}
                    disabled={!workOrderItems.length}
                  />
                  <InlineTextInput
                    label="Task"
                    value={threadMeta?.linkedTaskId ?? ""}
                    placeholder="Add task ID"
                    onCommit={(value) => onUpdateThread?.({ linkedTaskId: value.trim() })}
                  />
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Linked">
              {hasLinked ? (
                <div className="-mx-2 space-y-1">
                  {data.linked.property ? (
                    <LinkedRow
                      icon="PR"
                      label={data.linked.property.label}
                      subtext={data.linked.property.subtext}
                    />
                  ) : null}
                  {data.linked.unit ? (
                    <LinkedRow
                      icon="UN"
                      label={data.linked.unit.label}
                      subtext={data.linked.unit.subtext}
                    />
                  ) : null}
                  {data.linked.resident ? (
                    <LinkedRow
                      icon="RS"
                      label={data.linked.resident.label}
                      subtext={data.linked.resident.subtext}
                    />
                  ) : null}
                  {data.linked.workOrder ? (
                    <LinkedRow
                      icon="WO"
                      label={data.linked.workOrder.label}
                      subtext={data.linked.workOrder.subtext}
                      emphasis
                    />
                  ) : null}
                  {data.linked.task ? (
                    <LinkedRow
                      icon="TK"
                      label={data.linked.task.label}
                      subtext={data.linked.task.subtext}
                      emphasis
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No linked records.</p>
              )}
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
              {data.participants.length ? (
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
                          <Chip label={formatRoleLabel(participant.role)} tone="slate" />
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
              ) : (
                <p className="text-xs text-slate-500">No participants yet.</p>
              )}

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                <span aria-hidden="true" className="text-slate-500">
                  🔒
                </span>
                Tenant cannot see internal notes
              </div>
            </SectionCard>

            <SectionCard title="Attachments">
              {data.attachments.length ? (
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
              ) : (
                <p className="text-xs text-slate-500">No attachments yet.</p>
              )}
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
              {data.tags.items.length ? (
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
              ) : (
                <p className="text-xs text-slate-500">No tags yet.</p>
              )}
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

            <SectionCard title="Activity">
              {timeline.length ? (
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
              ) : (
                <p className="text-xs text-slate-500">No activity yet.</p>
              )}
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
