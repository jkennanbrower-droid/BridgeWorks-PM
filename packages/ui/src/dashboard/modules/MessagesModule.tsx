import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useDropzone } from "react-dropzone";

import {
  ThreadDetailsPanel,
  type ThreadDetailsPanelData,
} from "./messages/ThreadDetailsPanel";

import { useMessagingClient } from "../../messaging/useMessagingClient";
import type {
  AuditEvent,
  Message,
  MessagingChannel,
  SortKey,
  Thread,
  ThreadPriority,
  ThreadQuery,
  ThreadStatus,
  ViewerContext,
} from "../../messaging/types";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z"
      />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14 21 3M10 14 3 10l18-7-7 18-4-7Z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function formatTimestampShort(iso: string) {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "--";
  const withinDay = Math.abs(Date.now() - ms) < 24 * 60 * 60 * 1000;
  if (withinDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dateInputToIso(value: string, endOfDay?: boolean) {
  if (!value) return undefined;
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatches(text: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  const re = new RegExp(escapeRegExp(q), "gi");
  const matches: Array<{ start: number; end: number }> = [];
  for (;;) {
    const next = re.exec(text);
    if (!next) break;
    matches.push({ start: next.index, end: next.index + next[0].length });
    if (next.index === re.lastIndex) re.lastIndex += 1;
    if (matches.length > 500) break;
  }
  return matches;
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {children}
    </span>
  );
}

function SlaDot({ slaDueAt }: { slaDueAt?: string }) {
  if (!slaDueAt) return <span className="h-2 w-2" aria-hidden="true" />;
  const due = new Date(slaDueAt).getTime();
  if (Number.isNaN(due)) return <span className="h-2 w-2" aria-hidden="true" />;
  const minutes = Math.round((due - Date.now()) / (60 * 1000));
  const danger = minutes <= 60;
  const overdue = minutes < 0;
  return (
    <span
      title={overdue ? "SLA overdue" : danger ? "SLA due soon" : "SLA"}
      className={`h-2.5 w-2.5 rounded-full ${
        overdue ? "bg-rose-500" : danger ? "bg-amber-500" : "bg-emerald-500"
      }`}
      aria-hidden="true"
    />
  );
}

function MessageBubble({
  mine,
  senderLabel,
  createdAt,
  channel,
  body,
  matches,
  matchIndexOffset,
  activeMatchIndex,
  attachmentsCount,
  scheduledFor,
}: {
  mine: boolean;
  senderLabel: string;
  createdAt: string;
  channel: MessagingChannel;
  body: string;
  matches: Array<{ start: number; end: number }>;
  matchIndexOffset: number;
  activeMatchIndex: number;
  attachmentsCount: number;
  scheduledFor?: string;
}) {
  const parts: Array<{ text: string; highlight?: boolean; matchIndex?: number }> =
    matches.length === 0 ? [{ text: body }] : [];

  if (matches.length) {
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.start > cursor) parts.push({ text: body.slice(cursor, m.start) });
      parts.push({
        text: body.slice(m.start, m.end),
        highlight: true,
        matchIndex: matchIndexOffset + i,
      });
      cursor = m.end;
    });
    if (cursor < body.length) parts.push({ text: body.slice(cursor) });
  }

  return (
    <div className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[760px] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`break-words rounded-2xl px-4 py-3 text-sm shadow-sm ${
            mine ? "border border-slate-200 bg-white" : "bg-slate-100"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span>{senderLabel}</span>
            <span className="text-slate-300">·</span>
            <span className="uppercase">{channel}</span>
            {scheduledFor ? (
              <>
                <span className="text-slate-300">·</span>
                <span>Scheduled</span>
              </>
            ) : null}
            {attachmentsCount ? (
              <>
                <span className="text-slate-300">·</span>
                <span>
                  {attachmentsCount} file{attachmentsCount === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </div>
          <div className="mt-2 whitespace-pre-wrap leading-6 text-slate-800">
            {parts.map((p, i) =>
              p.highlight ? (
                <mark
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  data-match-index={p.matchIndex}
                  className={`rounded px-0.5 ${
                    p.matchIndex === activeMatchIndex
                      ? "bg-amber-200 ring-2 ring-amber-300"
                      : "bg-amber-100"
                  }`}
                >
                  {p.text}
                </mark>
              ) : (
                // eslint-disable-next-line react/no-array-index-key
                <span key={i}>{p.text}</span>
              ),
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">{formatTimestampShort(createdAt)}</p>
      </div>
    </div>
  );
}

export function MessagesModule({
  appId = "app",
  isStaffView = false,
}: {
  appId?: string;
  isStaffView?: boolean;
}) {
  const messagesUiStorageKey = `bw.messages.ui.v1.${appId}`;

  const viewer = useMemo<ViewerContext>(
    () => ({
      appId: appId || (isStaffView ? "staff" : "user"),
      orgId: "demo-org-1",
      actorId: isStaffView ? "demo-staff-1" : "demo-user-1",
      roleHint: isStaffView ? "staff" : "tenant",
      isStaffView,
      // TODO (Prompt 2): replace from demo session manager.
    }),
    [appId, isStaffView],
  );

  const client = useMessagingClient(viewer);

  const [threadDetailsOpen, setThreadDetailsOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  const [query, setQuery] = useState<ThreadQuery>({
    tab: "all",
    sortKey: "updated_desc",
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [allThreads, setAllThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => (activeThreadId ? allThreads.find((t) => t.id === activeThreadId) ?? null : null),
    [activeThreadId, allThreads],
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const threadListRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [threadListHasMore, setThreadListHasMore] = useState(false);
  const [messageListHasMore, setMessageListHasMore] = useState(false);

  const [composerBody, setComposerBody] = useState("");
  const [composerChannel, setComposerChannel] = useState<MessagingChannel>("portal");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [composerCannedOpen, setComposerCannedOpen] = useState(false);
  const [composerScheduleOpen, setComposerScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [inThreadSearch, setInThreadSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const [bulkTagDraft, setBulkTagDraft] = useState("");

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadKind, setNewThreadKind] = useState<Thread["kind"]>("direct");
  const [newThreadChannel, setNewThreadChannel] = useState<MessagingChannel>("portal");
  const [newThreadParticipantQuery, setNewThreadParticipantQuery] = useState("");
  const [newThreadSelectedParticipantIds, setNewThreadSelectedParticipantIds] = useState<string[]>(
    [],
  );
  const [newThreadUnitId, setNewThreadUnitId] = useState("");
  const [newThreadTemplate, setNewThreadTemplate] = useState("(none)");
  const [newThreadTags, setNewThreadTags] = useState<string[]>([]);
  const [newThreadTagDraft, setNewThreadTagDraft] = useState("");

  const statusOptions: ThreadStatus[] = ["open", "pending", "resolved", "closed"];
  const priorityOptions: ThreadPriority[] = ["low", "normal", "high", "urgent"];
  const channelOptions: MessagingChannel[] = ["portal", "sms", "email"];

  const threadDetailsDataEmpty = useMemo<ThreadDetailsPanelData>(
    () => ({
      title: "--",
      status: "--",
      priority: "--",
      createdAtLabel: "--",
      lastActivityAtLabel: "--",
      linked: {},
      participants: [],
      attachments: [],
      tags: { items: [] },
    }),
    [],
  );

  const auditEvents = useMemo<AuditEvent[]>(() => {
    if (!activeThread) return [];
    const anyClient = client as unknown as { getAudit?: (threadId: string) => AuditEvent[] };
    return anyClient.getAudit?.(activeThread.id) ?? [];
  }, [activeThread, client]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    allThreads.forEach((t) => {
      if (t.assigneeId && t.assigneeLabel) map.set(t.assigneeId, t.assigneeLabel);
    });
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [allThreads]);

  const participants = useMemo(() => {
    const anyClient = client as unknown as { getParticipants?: () => import("../../messaging/types").Participant[] };
    return anyClient.getParticipants?.() ?? [];
  }, [client]);

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    allThreads.forEach((t) => {
      if (t.propertyId) map.set(t.propertyId, t.propertyLabel ?? t.propertyId);
    });
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [allThreads]);

  const unitOptions = useMemo(() => {
    const map = new Map<string, { label: string; propertyId?: string }>();
    allThreads.forEach((t) => {
      if (t.unitId) map.set(t.unitId, { label: t.unitLabel ?? t.unitId, propertyId: t.propertyId });
    });
    return [...map.entries()].map(([id, meta]) => ({ id, label: meta.label, propertyId: meta.propertyId }));
  }, [allThreads]);

  const cannedResponses = useMemo(
    () => [
      "Thanks — I’m looking into this now.",
      "Understood. We’ll follow up shortly.",
      "Can you confirm the best time for access?",
      "We’ve created a work order and will keep you posted here.",
      "Appreciate the details — thank you.",
    ],
    [],
  );

  const templates = useMemo(
    () => [
      { id: "(none)", label: "No template" },
      { id: "triage", label: "Maintenance triage request" },
      { id: "billing", label: "Billing clarification" },
      { id: "policy", label: "Policy reminder" },
    ],
    [],
  );

  const refreshAllThreads = useCallback(async () => {
    const result = await client.listThreads({ tab: "all", sortKey: "updated_desc" });
    setAllThreads(result.threads);
  }, [client]);

  const refreshThreads = useCallback(async () => {
    const effectiveQuery: ThreadQuery = {
      ...query,
      dateFrom: dateInputToIso(dateFrom) ?? query.dateFrom,
      dateTo: dateInputToIso(dateTo, true) ?? query.dateTo,
    };
    const result = await client.listThreads(effectiveQuery);
    setThreads(result.threads);
    setSelectedThreadIds((prev) => prev.filter((id) => result.threads.some((t) => t.id === id)));
    setActiveThreadId((prev) => prev ?? result.threads[0]?.id ?? null);
  }, [client, dateFrom, dateTo, query]);

  useEffect(() => {
    void refreshAllThreads();
  }, [refreshAllThreads]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    client
      .listMessages(activeThreadId)
      .then(({ messages: next }) => setMessages(next))
      .catch(() => setMessages([]));
  }, [activeThreadId, client]);

  useEffect(() => {
    setComposerChannel(activeThread?.channelDefault ?? "portal");
  }, [activeThread?.channelDefault]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(messagesUiStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        query: ThreadQuery;
        dateFrom: string;
        dateTo: string;
        threadDetailsOpen: boolean;
        selectMode: boolean;
      }>;
      if (parsed.query) setQuery(parsed.query);
      if (typeof parsed.threadDetailsOpen === "boolean") setThreadDetailsOpen(parsed.threadDetailsOpen);
      if (typeof parsed.selectMode === "boolean") setSelectMode(parsed.selectMode);
      if (typeof parsed.dateFrom === "string") setDateFrom(parsed.dateFrom);
      if (typeof parsed.dateTo === "string") setDateTo(parsed.dateTo);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        messagesUiStorageKey,
        JSON.stringify({ version: 1, query, dateFrom, dateTo, threadDetailsOpen, selectMode }),
      );
    } catch {
      // ignore
    }
  }, [dateFrom, dateTo, messagesUiStorageKey, query, selectMode, threadDetailsOpen]);

  const updateActiveThread = useCallback(
    async (
      patch: Partial<
        Pick<
          Thread,
          | "status"
          | "priority"
          | "assigneeId"
          | "assigneeLabel"
          | "tags"
          | "dueDate"
          | "slaDueAt"
          | "linkedWorkOrderId"
          | "linkedTaskId"
          | "followers"
        >
      >,
    ) => {
      if (!activeThread) return;
      await client.updateThread(activeThread.id, patch);
      await refreshAllThreads();
      await refreshThreads();
    },
    [activeThread, client, refreshAllThreads, refreshThreads],
  );

  const applyBulk = useCallback(
    async (
      action:
        | { type: "mark_resolved" }
        | { type: "reassign"; assigneeId: string; assigneeLabel: string }
        | { type: "add_tag"; tag: string },
    ) => {
      if (!selectedThreadIds.length) return;
      await client.bulkUpdateThreads(selectedThreadIds, action);
      setSelectedThreadIds([]);
      await refreshAllThreads();
      await refreshThreads();
    },
    [client, refreshAllThreads, refreshThreads, selectedThreadIds],
  );

  const resetNewThread = useCallback(() => {
    setNewThreadTitle("");
    setNewThreadKind("direct");
    setNewThreadChannel("portal");
    setNewThreadParticipantQuery("");
    setNewThreadSelectedParticipantIds([]);
    setNewThreadUnitId("");
    setNewThreadTemplate("(none)");
    setNewThreadTags([]);
    setNewThreadTagDraft("");
  }, []);

  const createThread = useCallback(async () => {
    const title = newThreadTitle.trim() || "New thread";
    const participantIds = newThreadSelectedParticipantIds.length
      ? newThreadSelectedParticipantIds
      : participants.filter((p) => p.role === "tenant").slice(0, 1).map((p) => p.id);
    const propertyId = unitOptions.find((u) => u.id === newThreadUnitId)?.propertyId;

    const created = await client.createThread({
      title,
      kind: newThreadKind,
      channel: newThreadChannel,
      participantIds,
      tags: newThreadTags,
      propertyId,
      unitId: newThreadUnitId || undefined,
    });

    setNewThreadOpen(false);
    resetNewThread();
    await refreshAllThreads();
    await refreshThreads();
    setActiveThreadId(created.id);
    setThreadDetailsOpen(true);
  }, [
    client,
    newThreadChannel,
    newThreadKind,
    newThreadSelectedParticipantIds,
    newThreadTags,
    newThreadTitle,
    newThreadUnitId,
    participants,
    refreshAllThreads,
    refreshThreads,
    resetNewThread,
    unitOptions,
  ]);

  const threadDetailsData = useMemo<ThreadDetailsPanelData>(() => {
    if (!activeThread) return threadDetailsDataEmpty;
    return {
      title: activeThread.title,
      status: activeThread.status,
      priority: activeThread.priority,
      createdAtLabel: formatTimestampShort(activeThread.createdAt),
      lastActivityAtLabel: formatTimestampShort(activeThread.updatedAt),
      channel: activeThread.channelDefault.toUpperCase(),
      linked: {
        property: activeThread.propertyLabel
          ? { label: activeThread.propertyLabel, subtext: activeThread.propertyId }
          : undefined,
        unit: activeThread.unitLabel
          ? { label: activeThread.unitLabel, subtext: activeThread.unitId }
          : undefined,
        workOrder: activeThread.linkedWorkOrderId
          ? { label: activeThread.linkedWorkOrderId, subtext: "Work order" }
          : undefined,
      },
      participants: activeThread.participants.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        online: p.presence === "online",
      })),
      attachments: messages.flatMap((m) =>
        (m.attachments ?? []).map((a) => ({
          id: a.id,
          filename: a.fileName,
          meta: `${Math.round(a.sizeBytes / 1024)} KB`,
          kind: a.mimeType.startsWith("image/")
            ? "image"
            : a.mimeType.includes("pdf")
              ? "pdf"
              : "file",
        })),
      ),
      tags: { items: activeThread.tags ?? [] },
      activity: auditEvents.slice(-12).reverse().map((e) => ({
        id: e.id,
        title: e.type,
        actor: e.actorLabel,
        timestampLabel: formatTimestampShort(e.createdAt),
      })),
    };
  }, [activeThread, auditEvents, messages, threadDetailsDataEmpty]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    onDropAccepted: (accepted) => setComposerFiles((prev) => [...prev, ...accepted]),
  });

  const updateThreadListHasMore = useCallback(() => {
    const el = threadListRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setThreadListHasMore(remaining > 8);
  }, []);

  const updateMessageListHasMore = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setMessageListHasMore(remaining > 8);
  }, []);

  useEffect(() => {
    const el = threadListRef.current;
    if (!el) return;
    updateThreadListHasMore();
    el.addEventListener("scroll", updateThreadListHasMore, { passive: true });
    return () => el.removeEventListener("scroll", updateThreadListHasMore);
  }, [updateThreadListHasMore, threads.length]);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    updateMessageListHasMore();
    el.addEventListener("scroll", updateMessageListHasMore, { passive: true });
    return () => el.removeEventListener("scroll", updateMessageListHasMore);
  }, [updateMessageListHasMore, messages.length]);

  const sendMessage = useCallback(async () => {
    if (!activeThread) return;
    const body = composerBody.trim();
    if (!body && composerFiles.length === 0) return;
    await client.sendMessage(activeThread.id, {
      body: body || "(attachment)",
      channel: composerChannel,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      attachments: composerFiles.map((f) => ({
        fileName: f.name,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: f.size,
      })),
    });
    setComposerBody("");
    setComposerFiles([]);
    setScheduledFor("");
    setComposerScheduleOpen(false);
    await refreshAllThreads();
    await refreshThreads();
    const { messages: next } = await client.listMessages(activeThread.id);
    setMessages(next);
  }, [
    activeThread,
    client,
    composerBody,
    composerChannel,
    composerFiles,
    refreshAllThreads,
    refreshThreads,
    scheduledFor,
  ]);

  const matchData = useMemo(() => {
    const q = inThreadSearch.trim();
    if (!q) return { matchCount: 0, byMessageId: new Map<string, Array<{ start: number; end: number }>>() };
    const byMessageId = new Map<string, Array<{ start: number; end: number }>>();
    let count = 0;
    messages.forEach((m) => {
      const matches = findMatches(m.body, q);
      if (matches.length) {
        byMessageId.set(m.id, matches);
        count += matches.length;
      }
    });
    return { matchCount: count, byMessageId };
  }, [inThreadSearch, messages]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [inThreadSearch]);

  useEffect(() => {
    const root = messageListRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-match-index="${activeMatchIndex}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatchIndex]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
        <div
          className={`grid h-full min-h-0 overflow-hidden ${
            threadDetailsOpen
              ? "grid-cols-[30%_70%] xl:grid-cols-[30%_1fr_360px]"
              : "grid-cols-[30%_70%] xl:grid-cols-[30%_1fr]"
          }`}
        >
          <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="h-16 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
              <div className="flex h-full items-center gap-3">
                <nav className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {(["all", "groups", "unread", "flagged"] as const).map((tab) => {
                    const active = (query.tab ?? "all") === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => setQuery((q) => ({ ...q, tab }))}
                        className={`text-sm font-semibold transition ${
                          active
                            ? "text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab === "all"
                          ? "All"
                          : tab === "groups"
                            ? "Groups"
                            : tab === "unread"
                              ? "Unread"
                              : "Flagged"}
                      </button>
                    );
                  })}
                </nav>
                <select
                  value={query.sortKey ?? "updated_desc"}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      sortKey: e.target.value as SortKey,
                    }))
                  }
                  className="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-slate-300"
                  aria-label="Sort threads"
                >
                  <option value="updated_desc">Newest</option>
                  <option value="updated_asc">Oldest</option>
                  <option value="sla_asc">SLA due</option>
                  <option value="priority_desc">Priority</option>
                </select>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search threads"
                    aria-label="Search threads"
                    value={query.text ?? ""}
                    onChange={(e) => setQuery((q) => ({ ...q, text: e.target.value }))}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectMode((v) => !v)}
                  className={`h-10 rounded-xl border px-3 text-sm font-semibold shadow-sm transition ${
                    selectMode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  Select
                </button>
                <button
                  type="button"
                  onClick={() => setNewThreadOpen(true)}
                  className="h-10 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  New Thread
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    Status{query.status?.length ? ` (${query.status.length})` : ""}
                  </summary>
                  <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    {statusOptions.map((s) => {
                      const checked = query.status?.includes(s) ?? false;
                      return (
                        <label key={s} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setQuery((q) => {
                                const current = new Set(q.status ?? []);
                                if (current.has(s)) current.delete(s);
                                else current.add(s);
                                return { ...q, status: current.size ? [...current] : undefined };
                              })
                            }
                          />
                          {s}
                        </label>
                      );
                    })}
                  </div>
                </details>

                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    Channel{query.channel?.length ? ` (${query.channel.length})` : ""}
                  </summary>
                  <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    {channelOptions.map((c) => {
                      const checked = query.channel?.includes(c) ?? false;
                      return (
                        <label key={c} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setQuery((q) => {
                                const current = new Set(q.channel ?? []);
                                if (current.has(c)) current.delete(c);
                                else current.add(c);
                                return { ...q, channel: current.size ? [...current] : undefined };
                              })
                            }
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                </details>

                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    Priority{query.priority?.length ? ` (${query.priority.length})` : ""}
                  </summary>
                  <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    {priorityOptions.map((p) => {
                      const checked = query.priority?.includes(p) ?? false;
                      return (
                        <label key={p} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setQuery((q) => {
                                const current = new Set(q.priority ?? []);
                                if (current.has(p)) current.delete(p);
                                else current.add(p);
                                return { ...q, priority: current.size ? [...current] : undefined };
                              })
                            }
                          />
                          {p}
                        </label>
                      );
                    })}
                  </div>
                </details>

                <select
                  value={query.propertyId?.[0] ?? ""}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      propertyId: e.target.value ? [e.target.value] : undefined,
                    }))
                  }
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <option value="">Property</option>
                  {propertyOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  value={query.unitId?.[0] ?? ""}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      unitId: e.target.value ? [e.target.value] : undefined,
                    }))
                  }
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <option value="">Unit</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>

                <select
                  value={query.assigneeId?.[0] ?? ""}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      assigneeId: e.target.value ? [e.target.value] : undefined,
                    }))
                  }
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <option value="">Assignee</option>
                  <option value="__unassigned__">Unassigned</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                  aria-label="Updated from"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                  aria-label="Updated to"
                />

                <button
                  type="button"
                  onClick={() => {
                    setQuery({ tab: query.tab ?? "all", sortKey: query.sortKey ?? "updated_desc" });
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  Clear
                </button>
              </div>

              {selectedThreadIds.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedThreadIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => void applyBulk({ type: "mark_resolved" })}
                    className="h-9 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Mark resolved
                  </button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const label = assigneeOptions.find((a) => a.id === id)?.label;
                      if (!label) return;
                      void applyBulk({ type: "reassign", assigneeId: id, assigneeLabel: label });
                      e.target.value = "";
                    }}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="">Reassign…</option>
                    {assigneeOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      value={bulkTagDraft}
                      onChange={(e) => setBulkTagDraft(e.target.value)}
                      placeholder="Add tag"
                      className="h-9 w-36 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = bulkTagDraft.trim();
                        if (!value) return;
                        setBulkTagDraft("");
                        void applyBulk({ type: "add_tag", tag: value });
                      }}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedThreadIds([])}
                    className="ml-auto h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}
            </div>
            <div className="relative min-h-0 flex-1">
              <div
                ref={threadListRef}
                className="min-h-0 h-full overflow-y-auto bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="divide-y divide-slate-100">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setActiveThreadId(thread.id);
                        setThreadDetailsOpen(true);
                        setInThreadSearch("");
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                        thread.id === activeThreadId ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {selectMode ? (
                        <input
                          type="checkbox"
                          checked={selectedThreadIds.includes(thread.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() =>
                            setSelectedThreadIds((prev) =>
                              prev.includes(thread.id)
                                ? prev.filter((id) => id !== thread.id)
                                : [...prev, thread.id],
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
                          aria-label="Select thread"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {thread.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {[thread.propertyLabel, thread.unitLabel].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {thread.lastMessagePreview ?? ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Pill>{thread.assigneeLabel || "Unassigned"}</Pill>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <SlaDot slaDueAt={thread.slaDueAt} />
                          <p className="whitespace-nowrap text-xs text-slate-500">
                            {formatTimestampShort(thread.updatedAt)}
                          </p>
                        </div>
                        {(thread.unreadCount ?? 0) > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[11px] font-semibold text-white">
                            {thread.unreadCount}
                          </span>
                        ) : (
                          <span className="h-5 min-w-5" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {threadListHasMore ? (
                <button
                  type="button"
                  onClick={() =>
                    threadListRef.current?.scrollBy({
                      top: threadListRef.current.clientHeight * 0.9,
                      behavior: "smooth",
                    })
                  }
                  className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  More threads
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col overflow-hidden bg-white">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {activeThread?.title ?? "Select a thread"}
                  </p>
                  {activeThread ? (
                    <>
                      <Pill>{activeThread.status}</Pill>
                      <Pill>{activeThread.priority}</Pill>
                      <Pill>{activeThread.channelDefault.toUpperCase()}</Pill>
                    </>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {activeThread
                    ? [activeThread.propertyLabel, activeThread.unitLabel]
                        .filter(Boolean)
                        .join(" · ")
                    : "--"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search in thread"
                    value={inThreadSearch}
                    onChange={(e) => setInThreadSearch(e.target.value)}
                    className="w-44 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    disabled={!activeThread}
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    {matchData.matchCount
                      ? `${activeMatchIndex + 1}/${matchData.matchCount}`
                      : "0"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMatchIndex((i) =>
                        matchData.matchCount
                          ? (i - 1 + matchData.matchCount) % matchData.matchCount
                          : 0,
                      )
                    }
                    className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm"
                    aria-label="Previous match"
                    disabled={!matchData.matchCount}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMatchIndex((i) =>
                        matchData.matchCount ? (i + 1) % matchData.matchCount : 0,
                      )
                    }
                    className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm"
                    aria-label="Next match"
                    disabled={!matchData.matchCount}
                  >
                    Next
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void updateActiveThread({
                      linkedWorkOrderId:
                        activeThread?.linkedWorkOrderId ??
                        `WO-${Math.floor(1000 + Math.random() * 9000)}`,
                    })
                  }
                  className="hidden sm:inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Create Work Order
                </button>
                <button
                  type="button"
                  onClick={() => setComposerScheduleOpen((v) => !v)}
                  className="hidden sm:inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => void updateActiveThread({ status: "resolved" })}
                  className="hidden sm:inline-flex h-10 items-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  disabled={!activeThread}
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setThreadDetailsOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  <span className="text-xs font-semibold">i</span>
                  <span className="hidden sm:inline">Details</span>
                </button>
              </div>
            </div>
<div className="relative min-h-0 flex-1" {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-900/10">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                    Drop files to attach
                  </div>
                </div>
              ) : null}
              <div
                ref={messageListRef}
                className="min-h-0 h-full space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4 pb-14 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {!activeThread ? (
                  <div className="flex h-full min-h-[220px] items-center justify-center">
                    <div className="max-w-sm text-center">
                      <p className="text-sm font-semibold text-slate-900">No thread selected</p>
                      <p className="mt-1 text-sm text-slate-500">Select a thread to view messages.</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-[220px] items-center justify-center">
                    <div className="max-w-sm text-center">
                      <p className="text-sm font-semibold text-slate-900">No messages yet</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Start the conversation by sending a message.
                      </p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    let matchIndexOffset = 0;
                    return messages.map((m) => {
                      const mine = m.senderId === viewer.actorId;
                      const matches = matchData.byMessageId.get(m.id) ?? [];
                      const offset = matchIndexOffset;
                      matchIndexOffset += matches.length;
                      return (
                        <MessageBubble
                          key={m.id}
                          mine={mine}
                          senderLabel={m.senderLabel}
                          createdAt={m.createdAt}
                          channel={m.channel}
                          body={m.body}
                          matches={matches}
                          matchIndexOffset={offset}
                          activeMatchIndex={activeMatchIndex}
                          attachmentsCount={m.attachments?.length ?? 0}
                          scheduledFor={m.scheduledFor}
                        />
                      );
                    });
                  })()
                )}
              </div>
              {messageListHasMore ? (
                <button
                  type="button"
                  onClick={() =>
                    messageListRef.current?.scrollBy({
                      top: messageListRef.current.clientHeight * 0.9,
                      behavior: "smooth",
                    })
                  }
                  className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                >
                  More messages
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-3">
              {composerFiles.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {composerFiles.map((f) => (
                    <span
                      key={`${f.name}-${f.lastModified}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setComposerFiles((prev) => prev.filter((x) => x !== f))}
                        className="text-slate-400 hover:text-slate-700"
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <select
                  value={composerChannel}
                  onChange={(e) => setComposerChannel(e.target.value as MessagingChannel)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                  aria-label="Message channel"
                  disabled={!activeThread}
                >
                  {channelOptions.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>

                <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    aria-label="Write a reply"
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    disabled={!activeThread}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setComposerCannedOpen((v) => !v)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Canned
                </button>
                <button
                  type="button"
                  onClick={() => setComposerEmojiOpen((v) => !v)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setComposerScheduleOpen((v) => !v)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement(\"input\");
                    input.type = \"file\";
                    input.multiple = true;
                    input.onchange = () => {
                      const files = Array.from(input.files ?? []);
                      if (files.length) setComposerFiles((prev) => [...prev, ...files]);
                    };
                    input.click();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Attach
                </button>
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => void sendMessage()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={!activeThread}
                >
                  <PaperPlaneIcon />
                  Send
                </button>
              </div>

              {composerEmojiOpen ? (
                <div className="relative">
                  <div className="absolute right-0 top-2 z-20 rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: { native?: string }) => {
                        if (!emoji.native) return;
                        setComposerBody((b) => b + emoji.native);
                        setComposerEmojiOpen(false);
                      }}
                      theme="light"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                </div>
              ) : null}

              {composerCannedOpen ? (
                <div className="relative">
                  <div className="absolute right-0 top-2 z-20 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      Canned responses
                    </p>
                    <div className="space-y-1">
                      {cannedResponses.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setComposerBody((b) => (b ? b + \"\\n\\n\" + c : c));
                            setComposerCannedOpen(false);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {composerScheduleOpen ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <label className="text-xs font-semibold text-slate-700">Send later</label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <ThreadDetailsPanel
            isOpen={threadDetailsOpen}
            onClose={() => setThreadDetailsOpen(false)}
            isStaffView={isStaffView}
            data={activeThread ? threadDetailsData : threadDetailsDataEmpty}
            className="hidden xl:flex"
            onUpdateThread={updateActiveThread}
            assignees={assigneeOptions}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            auditEvents={auditEvents}
            threadMeta={
              activeThread
                ? {
                    id: activeThread.id,
                    linkedWorkOrderId: activeThread.linkedWorkOrderId,
                    linkedTaskId: activeThread.linkedTaskId,
                    dueDate: activeThread.dueDate,
                    slaDueAt: activeThread.slaDueAt,
                    tags: activeThread.tags ?? [],
                    assigneeId: activeThread.assigneeId,
                    assigneeLabel: activeThread.assigneeLabel,
                    status: activeThread.status,
                    priority: activeThread.priority,
                  }
                : undefined
            }
          />
        </div>
      </div>

      {threadDetailsOpen ? (
        <div className="xl:hidden">
          <button
            type="button"
            aria-label="Close thread details"
            onClick={() => setThreadDetailsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20"
          />
          <ThreadDetailsPanel
            isOpen={threadDetailsOpen}
            onClose={() => setThreadDetailsOpen(false)}
            isStaffView={isStaffView}
            data={activeThread ? threadDetailsData : threadDetailsDataEmpty}
            className="fixed inset-y-0 right-0 z-50 w-[340px] max-w-[90vw] shadow-xl"
            onUpdateThread={updateActiveThread}
            assignees={assigneeOptions}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            auditEvents={auditEvents}
            threadMeta={
              activeThread
                ? {
                    id: activeThread.id,
                    linkedWorkOrderId: activeThread.linkedWorkOrderId,
                    linkedTaskId: activeThread.linkedTaskId,
                    dueDate: activeThread.dueDate,
                    slaDueAt: activeThread.slaDueAt,
                    tags: activeThread.tags ?? [],
                    assigneeId: activeThread.assigneeId,
                    assigneeLabel: activeThread.assigneeLabel,
                    status: activeThread.status,
                    priority: activeThread.priority,
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {newThreadOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close new thread dialog"
            onClick={() => {
              setNewThreadOpen(false);
              resetNewThread();
            }}
            className="absolute inset-0 bg-slate-900/20"
          />
          <div className="absolute left-1/2 top-1/2 w-[720px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">New Thread</p>
                <p className="mt-1 text-sm text-slate-500">
                  Demo workflow (Prompt 3 will fetch real tenants/units/templates).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewThreadOpen(false);
                  resetNewThread();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Title</label>
                <input
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm"
                  placeholder="Subject / summary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Kind</label>
                  <select
                    value={newThreadKind}
                    onChange={(e) => setNewThreadKind(e.target.value as Thread["kind"])}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="direct">Direct</option>
                    <option value="group">Group</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Channel</label>
                  <select
                    value={newThreadChannel}
                    onChange={(e) => setNewThreadChannel(e.target.value as MessagingChannel)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    {channelOptions.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Unit</label>
                <select
                  value={newThreadUnitId}
                  onChange={(e) => setNewThreadUnitId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  <option value="">(none)</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Template</label>
                <select
                  value={newThreadTemplate}
                  onChange={(e) => setNewThreadTemplate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Participants</label>
                <input
                  value={newThreadParticipantQuery}
                  onChange={(e) => setNewThreadParticipantQuery(e.target.value)}
                  placeholder="Search people"
                  className="h-9 w-56 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {newThreadSelectedParticipantIds.map((id) => {
                  const p = participants.find((x) => x.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNewThreadSelectedParticipantIds((prev) => prev.filter((x) => x !== id))}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      {p?.name ?? id}
                      <span className="text-slate-400">×</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 max-h-40 overflow-auto rounded-2xl border border-slate-200">
                {participants
                  .filter((p) => p.name.toLowerCase().includes(newThreadParticipantQuery.trim().toLowerCase()))
                  .slice(0, 20)
                  .map((p) => {
                    const selected = newThreadSelectedParticipantIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setNewThreadSelectedParticipantIds((prev) =>
                            prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                          )
                        }
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition ${
                          selected ? "bg-slate-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="text-xs font-semibold text-slate-500">{p.role}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Tags</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {newThreadTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewThreadTags((prev) => prev.filter((x) => x !== t))}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    {t}
                    <span className="text-slate-400">×</span>
                  </button>
                ))}
                <input
                  value={newThreadTagDraft}
                  onChange={(e) => setNewThreadTagDraft(e.target.value)}
                  placeholder="Add tag"
                  className="h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const value = newThreadTagDraft.trim();
                    if (!value) return;
                    setNewThreadTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
                    setNewThreadTagDraft("");
                  }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNewThreadOpen(false);
                  resetNewThread();
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createThread()}
                className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
