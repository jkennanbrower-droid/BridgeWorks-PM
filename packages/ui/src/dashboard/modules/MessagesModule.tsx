import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ThreadDetailsPanel,
  type ThreadDetailsPanelData,
} from "./messages/ThreadDetailsPanel";

import { useMessagingClient } from "../../messaging/useMessagingClient";
import type {
  AuditEvent,
  Attachment,
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

function formatTimestampDivider(iso: string) {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "--";

  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return `Yesterday ${time}`;

  const dateLabel = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${dateLabel} ${time}`;
}

function shouldShowTimeDivider(prevIso: string | undefined, nextIso: string) {
  if (!prevIso) return true;
  const prev = new Date(prevIso).getTime();
  const next = new Date(nextIso).getTime();
  if (Number.isNaN(prev) || Number.isNaN(next)) return false;

  const prevDate = new Date(prevIso);
  const nextDate = new Date(nextIso);
  const dayChanged =
    prevDate.getFullYear() !== nextDate.getFullYear() ||
    prevDate.getMonth() !== nextDate.getMonth() ||
    prevDate.getDate() !== nextDate.getDate();
  if (dayChanged) return true;

  const gapMinutes = Math.abs(next - prev) / (60 * 1000);
  return gapMinutes >= 60;
}

function stripParentheticals(value: string) {
  return value.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

function AvatarCircle({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = initialsForName(name);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-700"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials}</span>
      )}
    </span>
  );
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur">
      <button
        type="button"
        aria-label="Close image preview"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] max-w-[85vw] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block max-h-[85vh] max-w-[85vw] object-contain" />
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const confirmClasses =
    tone === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`h-10 rounded-xl px-4 text-sm font-semibold shadow-sm transition ${confirmClasses}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
  messageId,
  mine,
  senderLabel,
  senderAvatarUrl,
  showAvatar,
  attachments,
  onOpenAttachmentImage,
  menuOpen,
  onToggleMenu,
  onDeleteForMe,
  onDeleteForEveryone,
  canDeleteForEveryone,
  selectMode,
  selected,
  onToggleSelected,
  createdAt,
  body,
  matches,
  matchIndexOffset,
  activeMatchIndex,
  attachmentsCount,
  scheduledFor,
  showTimestamp,
  onToggleTimestamp,
}: {
  messageId: string;
  mine: boolean;
  senderLabel: string;
  senderAvatarUrl?: string;
  showAvatar?: boolean;
  attachments?: Attachment[];
  onOpenAttachmentImage?: (src: string, alt: string) => void;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  canDeleteForEveryone?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  createdAt: string;
  body: string;
  matches: Array<{ start: number; end: number }>;
  matchIndexOffset: number;
  activeMatchIndex: number;
  attachmentsCount: number;
  scheduledFor?: string;
  showTimestamp: boolean;
  onToggleTimestamp: (messageId: string) => void;
}) {
  const isDeleted = body.trim() === "Message Deleted";
  const parts: Array<{ text: string; highlight?: boolean; matchIndex?: number }> =
    matches.length === 0 ? [{ text: body }] : [];

  const imageAttachments = useMemo(
    () =>
      (attachments ?? []).filter((a) => a.mimeType?.startsWith("image/") && Boolean(a.publicUrl)),
    [attachments],
  );
  const nonImageAttachments = useMemo(
    () => (attachments ?? []).filter((a) => !a.mimeType?.startsWith("image/") || !a.publicUrl),
    [attachments],
  );

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
      {selectMode ? (
        <div className="pt-2">
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() => onToggleSelected?.()}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
            aria-label={selected ? "Deselect message" : "Select message"}
          />
        </div>
      ) : null}
      {!mine && showAvatar ? (
        <div className="pt-1">
          <AvatarCircle name={senderLabel} avatarUrl={senderAvatarUrl} size={28} />
        </div>
      ) : null}
      <div className={`flex max-w-[760px] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`break-words rounded-2xl px-4 py-3 text-sm shadow-sm ${
            mine ? "border border-slate-200 bg-white" : "bg-slate-100"
          } ${isDeleted ? "" : "cursor-pointer"}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (selectMode) {
              onToggleSelected?.();
              return;
            }
            if (isDeleted) return;
            onToggleTimestamp(messageId);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            if (selectMode) {
              onToggleSelected?.();
              return;
            }
            if (isDeleted) return;
            onToggleTimestamp(messageId);
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span>{senderLabel}</span>
            <span className="text-slate-300">·</span>
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
            <span className="ml-auto" />
            <div className="relative -mr-1">
              {selectMode ? null : (
                <>
                  <button
                    type="button"
                    aria-label="Message options"
                    disabled={isDeleted}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleMenu?.();
                    }}
                  >
                    <span aria-hidden="true">⋯</span>
                  </button>
                  {menuOpen ? (
                    <div
                      className={`absolute z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
                        mine ? "right-0" : "left-0"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                      role="menu"
                    >
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        onClick={() => onDeleteForMe?.()}
                        role="menuitem"
                      >
                        Delete for you
                      </button>
                      {canDeleteForEveryone ? (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          onClick={() => onDeleteForEveryone?.()}
                          role="menuitem"
                        >
                          Delete for everyone
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
          {body.trim() ? (
            <div
              className={`mt-2 whitespace-pre-wrap leading-6 ${
                isDeleted ? "italic text-slate-400" : "text-slate-800"
              }`}
            >
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
          ) : null}

          {attachments?.length ? (
            <div className="mt-3 space-y-2">
              {imageAttachments.length ? (
                imageAttachments.length === 1 ? (
                  <button
                    type="button"
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    onClick={(e) => {
                      const a = imageAttachments[0];
                      const src = a?.publicUrl;
                      if (!src) return;
                      e.stopPropagation();
                      onOpenAttachmentImage?.(src, a.fileName);
                    }}
                    aria-label={`Open image ${imageAttachments[0]?.fileName ?? "attachment"}`}
                  >
                    <div className="flex max-w-[520px] items-center justify-center bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageAttachments[0]!.publicUrl!}
                        alt={imageAttachments[0]!.fileName}
                        className="block h-[180px] w-auto max-w-[520px] object-contain transition group-hover:scale-[1.01]"
                      />
                    </div>
                  </button>
                ) : (
                  <div className="grid max-w-[380px] grid-cols-2 gap-2">
                    {imageAttachments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="group aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        onClick={(e) => {
                          const src = a.publicUrl;
                          if (!src) return;
                          e.stopPropagation();
                          onOpenAttachmentImage?.(src, a.fileName);
                        }}
                        aria-label={`Open image ${a.fileName}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.publicUrl!}
                          alt={a.fileName}
                          className="h-full w-full object-cover transition group-hover:scale-[1.01]"
                        />
                      </button>
                    ))}
                  </div>
                )
              ) : null}

              {nonImageAttachments.length ? (
                <div className="flex flex-wrap gap-2">
                  {nonImageAttachments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex max-w-[260px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      <span className="truncate">{a.fileName}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {showTimestamp ? (
          <p className="mt-1 text-xs text-slate-400">{formatTimestampShort(createdAt)}</p>
        ) : null}
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
  const hiddenMessagesStorageKey = `bw.messages.hidden.v1.${appId}`;

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

  const [threads, setThreads] = useState<Thread[]>([]);
  const [allThreads, setAllThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => (activeThreadId ? allThreads.find((t) => t.id === activeThreadId) ?? null : null),
    [activeThreadId, allThreads],
  );

  const activeThreadParticipantById = useMemo(() => {
    const byId = new Map<string, { avatarUrl?: string; name: string }>();
    (activeThread?.participants ?? []).forEach((p) => byId.set(p.id, { avatarUrl: p.avatarUrl, name: p.name }));
    return byId;
  }, [activeThread]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const hiddenMessageIdSet = useMemo(() => new Set(hiddenMessageIds), [hiddenMessageIds]);
  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenMessageIdSet.has(m.id)),
    [hiddenMessageIdSet, messages],
  );
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<{
    scope: "me" | "everyone";
    threadId: string;
    messageIds: string[];
  } | null>(null);

  const threadListRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [threadListHasMore, setThreadListHasMore] = useState(false);
  const [messageListHasMore, setMessageListHasMore] = useState(false);

  const [composerBody, setComposerBody] = useState("");
  const [composerChannel, setComposerChannel] = useState<MessagingChannel>("portal");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerFilePreviews, setComposerFilePreviews] = useState<Map<string, string>>(() => new Map());
  const [composerFileNames, setComposerFileNames] = useState<Map<string, string>>(() => new Map());
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ threadId: string; messageId: string } | null>(null);
  const sentAttachmentObjectUrlsRef = useRef<string[]>([]);
  const composerFileIdMapRef = useRef<WeakMap<File, string>>(new WeakMap());
  const composerFileIdSeqRef = useRef(0);
  const [composerScheduleOpen, setComposerScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [inThreadSearch, setInThreadSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [expandedTimestampMessageIds, setExpandedTimestampMessageIds] = useState<string[]>([]);
  const [composerActionsOpen, setComposerActionsOpen] = useState(false);

  const getComposerFileId = useCallback((file: File) => {
    const existing = composerFileIdMapRef.current.get(file);
    if (existing) return existing;
    const next = `cf_${(composerFileIdSeqRef.current += 1)}`;
    composerFileIdMapRef.current.set(file, next);
    return next;
  }, []);

  const [bulkTagDraft, setBulkTagDraft] = useState("");

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadKind, setNewThreadKind] = useState<Thread["kind"]>("direct");
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
  // Channel remains in the data model for Prompts 3–4, but UI hides it for now (portal-only).

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
    const [activeResult, archivedResult] = await Promise.all([
      client.listThreads({ tab: "all", sortKey: "updated_desc" }),
      client.listThreads({ tab: "archived", sortKey: "updated_desc" }),
    ]);
    const byId = new Map<string, Thread>();
    activeResult.threads.forEach((t) => byId.set(t.id, t));
    archivedResult.threads.forEach((t) => byId.set(t.id, t));
    setAllThreads([...byId.values()]);
  }, [client]);

  const refreshThreads = useCallback(async () => {
    const result = await client.listThreads(query);
    setThreads(result.threads);
    setSelectedThreadIds((prev) => prev.filter((id) => result.threads.some((t) => t.id === id)));
    setActiveThreadId((prev) => (prev && result.threads.some((t) => t.id === prev) ? prev : null));
  }, [client, query]);

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
    setComposerFilePreviews((prev) => {
      const next = new Map(prev);
      const keep = new Set<string>();
      composerFiles.forEach((f) => {
        const id = getComposerFileId(f);
        keep.add(id);
        if (!next.has(id) && f.type.startsWith("image/")) {
          next.set(id, URL.createObjectURL(f));
        }
      });
      Array.from(next.keys()).forEach((k) => {
        if (!keep.has(k)) {
          const url = next.get(k);
          if (url) URL.revokeObjectURL(url);
          next.delete(k);
        }
      });
      return next;
    });

    setComposerFileNames((prev) => {
      const next = new Map(prev);
      const keep = new Set<string>();
      composerFiles.forEach((f) => {
        const id = getComposerFileId(f);
        keep.add(id);
        if (!next.has(id)) next.set(id, f.name);
      });
      Array.from(next.keys()).forEach((k) => {
        if (!keep.has(k)) next.delete(k);
      });
      return next;
    });
  }, [composerFiles, getComposerFileId]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      sentAttachmentObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      sentAttachmentObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(messagesUiStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        query: ThreadQuery;
        threadDetailsOpen: boolean;
        selectMode: boolean;
      }>;
      if (parsed.query) setQuery(parsed.query);
      if (typeof parsed.threadDetailsOpen === "boolean") setThreadDetailsOpen(parsed.threadDetailsOpen);
      if (typeof parsed.selectMode === "boolean") setSelectMode(parsed.selectMode);
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
        JSON.stringify({ version: 1, query, threadDetailsOpen, selectMode }),
      );
    } catch {
      // ignore
    }
  }, [messagesUiStorageKey, query, selectMode, threadDetailsOpen]);

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
          | "archivedAt"
          | "linkedWorkOrderId"
          | "linkedTaskId"
          | "followers"
        >
      >,
    ) => {
      if (!activeThread) return;
      await client.updateThread(activeThread.id, patch);
      await refreshAllThreads();
      if (patch.archivedAt === null && query.tab === "archived") {
        setQuery((q) => ({ ...q, tab: "all" }));
        setActiveThreadId(activeThread.id);
        return;
      }
      await refreshThreads();
    },
    [activeThread, client, query.tab, refreshAllThreads, refreshThreads, setQuery],
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
      channel: "portal",
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
    // Keep details panel closed; user opens via Details button.
  }, [
    client,
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
      channel: undefined,
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
    // Use hysteresis to avoid flicker around the threshold.
    const showMoreMessages = remaining > 160;
    setMessageListHasMore(showMoreMessages);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`${hiddenMessagesStorageKey}.${viewer.actorId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) setHiddenMessageIds(parsed.filter((x) => typeof x === "string"));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `${hiddenMessagesStorageKey}.${viewer.actorId}`,
        JSON.stringify(hiddenMessageIds),
      );
    } catch {
      // ignore
    }
  }, [hiddenMessageIds, hiddenMessagesStorageKey, viewer.actorId]);

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
    if (activeThread.archivedAt) return;
    const body = composerBody.trim();
    if (!body && composerFiles.length === 0) return;
    const attachments = composerFiles.map((f) => {
      const isImage = (f.type || "").startsWith("image/");
      const publicUrl =
        typeof window !== "undefined" && isImage ? URL.createObjectURL(f) : undefined;
      if (publicUrl) sentAttachmentObjectUrlsRef.current.push(publicUrl);
      const id = getComposerFileId(f);
      const fileName = (composerFileNames.get(id) ?? f.name).trim() || f.name;
      return {
        fileName,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: f.size,
        publicUrl,
      };
    });

    if (attachments.length) {
      const attachmentsBody = body
        ? ""
        : attachments
            .map((a) => a.fileName)
            .filter(Boolean)
            .join(", ") || "(attachment)";

      await client.sendMessage(activeThread.id, {
        body: attachmentsBody,
        channel: "portal",
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        attachments,
      });
    }

    if (body) {
      await client.sendMessage(activeThread.id, {
        body,
        channel: "portal",
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        attachments: [],
      });
    }
    setComposerBody("");
    setComposerFiles([]);
    setScheduledFor("");
    setComposerScheduleOpen(false);
    setBulkDeleteMode(false);
    setSelectedMessageIds([]);
    setConfirmBulkDelete(null);
    await refreshAllThreads();
    await refreshThreads();
    const { messages: next } = await client.listMessages(activeThread.id);
    setMessages(next);
  }, [
    activeThread,
    client,
    composerBody,
    composerFileNames,
    composerFiles,
    getComposerFileId,
    refreshAllThreads,
    refreshThreads,
    scheduledFor,
  ]);

  const matchData = useMemo(() => {
    const q = inThreadSearch.trim();
    if (!q) return { matchCount: 0, byMessageId: new Map<string, Array<{ start: number; end: number }>>() };
    const byMessageId = new Map<string, Array<{ start: number; end: number }>>();
    let count = 0;
    visibleMessages.forEach((m) => {
      const matches = findMatches(m.body, q);
      if (matches.length) {
        byMessageId.set(m.id, matches);
        count += matches.length;
      }
    });
    return { matchCount: count, byMessageId };
  }, [inThreadSearch, visibleMessages]);

  const directRecipient = useMemo(() => {
    if (!activeThread) return null;
    if (activeThread.kind !== "direct") return null;
    return activeThread.participants.find((p) => p.id !== viewer.actorId) ?? null;
  }, [activeThread, viewer.actorId]);

  const activeThreadArchived = Boolean(activeThread?.archivedAt);

  const expandedTimestampSet = useMemo(
    () => new Set(expandedTimestampMessageIds),
    [expandedTimestampMessageIds],
  );

  useEffect(() => {
    setExpandedTimestampMessageIds([]);
  }, [activeThreadId, query.tab, query.sortKey, query.text]);

  const lastMessageIdBySender = useMemo(() => {
    const map = new Map<string, string>();
    visibleMessages.forEach((m) => map.set(m.senderId, m.id));
    return map;
  }, [visibleMessages]);

  const selectedMessages = useMemo(
    () => visibleMessages.filter((m) => selectedMessageIds.includes(m.id)),
    [selectedMessageIds, visibleMessages],
  );

  const canBulkDeleteForEveryone = useMemo(() => {
    if (!selectedMessages.length) return false;
    return selectedMessages.every((m) => m.senderId === viewer.actorId);
  }, [selectedMessages, viewer.actorId]);

  useEffect(() => {
    if (!selectedMessageIds.length) return;
    const keep = new Set(visibleMessages.map((m) => m.id));
    setSelectedMessageIds((prev) => prev.filter((id) => keep.has(id)));
  }, [selectedMessageIds.length, visibleMessages]);

  const toggleTimestamp = useCallback((messageId: string) => {
    setExpandedTimestampMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    );
  }, []);

  const toggleSelectedMessage = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    );
  }, []);

  const pendingScrollToBottomThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [inThreadSearch]);

  useEffect(() => {
    if (!activeThreadId) return;
    pendingScrollToBottomThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    if (pendingScrollToBottomThreadIdRef.current !== activeThreadId) return;
    if (inThreadSearch.trim()) return;
    const root = messageListRef.current;
    if (!root) return;
    requestAnimationFrame(() => {
      root.scrollTop = root.scrollHeight;
    });
    pendingScrollToBottomThreadIdRef.current = null;
  }, [activeThreadId, inThreadSearch, visibleMessages]);

  useEffect(() => {
    if (!composerActionsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setComposerActionsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composerActionsOpen]);

  useEffect(() => {
    const root = messageListRef.current;
    if (!root) return;
    const el = root.querySelector(
      `[data-match-index="${activeMatchIndex}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatchIndex]);

  useEffect(() => {
    if (!openMessageMenuId) return;
    if (typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMessageMenuId(null);
    };
    const onClick = () => setOpenMessageMenuId(null);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
    };
  }, [openMessageMenuId]);

  useEffect(() => {
    setOpenMessageMenuId(null);
    setConfirmDelete(null);
    setBulkDeleteMode(false);
    setSelectedMessageIds([]);
    setConfirmBulkDelete(null);
  }, [activeThreadId]);

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
                  {(["all", "groups", "unread", "archived"] as const).map((tab) => {
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
                              : "Archived"}
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
                  onClick={() => setNewThreadOpen(true)}
                  className="h-10 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  New Thread
                </button>
              </div>

              {/* Filter controls intentionally removed (Prompt 1 UI simplification). */}

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
                <div className="divide-y divide-slate-200/70">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setActiveThreadId(thread.id);
                        setInThreadSearch("");
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        thread.id === activeThreadId ? "bg-slate-100" : "hover:bg-slate-50"
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
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {thread.lastMessagePreview ?? ""}
                        </p>
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
            <div className="h-16 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
              <div className="flex h-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeThread?.kind === "direct" && directRecipient ? (
                      <div className="flex min-w-0 items-center gap-3">
                        <AvatarCircle
                          name={directRecipient.name}
                          avatarUrl={directRecipient.avatarUrl}
                          size={threadDetailsOpen ? 40 : 36}
                        />
                        {threadDetailsOpen ? null : (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {directRecipient.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[activeThread.propertyLabel, activeThread.unitLabel].filter(Boolean).join(" | ") ||
                                "--"}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {activeThread?.title ?? "Select a thread"}
                      </p>
                    )}
                  </div>
                  {threadDetailsOpen && activeThread?.kind === "direct"
                    ? null
                    : activeThread?.kind === "direct"
                      ? null
                      : (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {activeThread
                        ? [activeThread.propertyLabel, activeThread.unitLabel].filter(Boolean).join(" | ")
                        : "--"}
                    </p>
                      )}
                </div>

                <div className="flex items-center gap-2">
                <div className="hidden sm:flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
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
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm"
                    aria-label="Previous match"
                    disabled={!matchData.matchCount}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMatchIndex((i) =>
                        matchData.matchCount ? (i + 1) % matchData.matchCount : 0,
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm"
                    aria-label="Next match"
                    disabled={!matchData.matchCount}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setThreadDetailsOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  disabled={!activeThread}
                >
                  Details
                </button>
              </div>
            </div>
            </div>
            <div className="relative min-h-0 flex-1">
              <div
                ref={messageListRef}
                className="min-h-0 h-full overflow-y-auto overflow-x-hidden px-6 pb-8 pt-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {activeThread?.kind === "direct" ? (
                  <div className="sticky top-0 z-10 -mx-6 border-b border-t border-slate-200/70 bg-white/40 px-6 py-2 backdrop-blur">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                      <p className="max-w-[min(520px,70%)] truncate text-center text-sm font-semibold text-slate-600/80">
                        {stripParentheticals(activeThread.title)}
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4 pt-4">
                  {!activeThread ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                      <div className="max-w-sm text-center">
                        <p className="text-sm font-semibold text-slate-900">No thread selected</p>
                        <p className="mt-1 text-sm text-slate-500">Select a thread to view messages.</p>
                      </div>
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                      <div className="max-w-sm text-center">
                        <p className="text-sm font-semibold text-slate-900">No messages</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Start the conversation by sending a message.
                        </p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      let matchIndexOffset = 0;
                      return visibleMessages.map((m, i) => {
                      const mine = m.senderId === viewer.actorId;
                      const sender = activeThreadParticipantById.get(m.senderId);
                      const showAvatar = !mine && activeThread?.kind === "group";
                      const matches = matchData.byMessageId.get(m.id) ?? [];
                      const offset = matchIndexOffset;
                      matchIndexOffset += matches.length;
                      const prev = visibleMessages[i - 1];
                      const showDivider = shouldShowTimeDivider(prev?.createdAt, m.createdAt);
                        return (
                          <div key={m.id}>
                            {showDivider ? (
                              <div className="flex items-center gap-3 py-1">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {formatTimestampDivider(m.createdAt)}
                                </span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            ) : null}
                            <MessageBubble
                              messageId={m.id}
                              mine={mine}
                              senderLabel={m.senderLabel}
                              senderAvatarUrl={sender?.avatarUrl}
                              showAvatar={showAvatar}
                              attachments={m.attachments}
                              onOpenAttachmentImage={(src, alt) => setLightbox({ src, alt })}
                              createdAt={m.createdAt}
                              body={m.body}
                              matches={matches}
                              matchIndexOffset={offset}
                              activeMatchIndex={activeMatchIndex}
                              attachmentsCount={m.attachments?.length ?? 0}
                              scheduledFor={m.scheduledFor}
                              selectMode={bulkDeleteMode}
                              selected={selectedMessageIds.includes(m.id)}
                              onToggleSelected={() => toggleSelectedMessage(m.id)}
                              menuOpen={openMessageMenuId === m.id}
                              onToggleMenu={() =>
                                setOpenMessageMenuId((prevId) => (prevId === m.id ? null : m.id))
                              }
                              onDeleteForMe={() => {
                                setHiddenMessageIds((prevIds) =>
                                  prevIds.includes(m.id) ? prevIds : [...prevIds, m.id],
                                );
                                setOpenMessageMenuId(null);
                              }}
                              canDeleteForEveryone={mine}
                              onDeleteForEveryone={() => {
                                setOpenMessageMenuId(null);
                                if (!mine) return;
                                setConfirmDelete({ threadId: m.threadId, messageId: m.id });
                              }}
                              showTimestamp={
                                expandedTimestampSet.has(m.id) ||
                                lastMessageIdBySender.get(m.senderId) === m.id
                              }
                              onToggleTimestamp={toggleTimestamp}
                            />
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
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

            <div className="relative border-t border-slate-200 bg-white px-6 py-2">
              {activeThreadArchived ? null : (
                <>
                  {bulkDeleteMode ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {selectedMessageIds.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkDeleteMode(false);
                          setSelectedMessageIds([]);
                          setConfirmBulkDelete(null);
                        }}
                        className="ml-auto h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={selectedMessageIds.length === 0}
                        onClick={() => {
                          if (!activeThread) return;
                          setConfirmBulkDelete({
                            scope: "me",
                            threadId: activeThread.id,
                            messageIds: selectedMessageIds,
                          });
                        }}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50"
                      >
                        Delete for you
                      </button>
                      <button
                        type="button"
                        disabled={selectedMessageIds.length === 0 || !canBulkDeleteForEveryone}
                        onClick={() => {
                          if (!activeThread) return;
                          setConfirmBulkDelete({
                            scope: "everyone",
                            threadId: activeThread.id,
                            messageIds: selectedMessageIds,
                          });
                        }}
                        className={`h-9 rounded-xl px-3 text-xs font-semibold shadow-sm transition ${
                          selectedMessageIds.length === 0 || !canBulkDeleteForEveryone
                            ? "border border-slate-200 bg-white text-slate-400"
                            : "bg-rose-600 text-white hover:bg-rose-700"
                        }`}
                        aria-disabled={selectedMessageIds.length === 0 || !canBulkDeleteForEveryone}
                        title={
                          canBulkDeleteForEveryone
                            ? "Delete for everyone"
                            : "Only your own messages can be deleted for everyone"
                        }
                      >
                        Delete for everyone
                      </button>
                    </div>
                  ) : null}

                  {composerFiles.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {composerFiles.map((f) => (
                    <span
                      key={`${f.name}-${f.lastModified}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      {f.type.startsWith("image/") ? (
                        <button
                          type="button"
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                          aria-label={`Preview ${f.name}`}
                          onClick={() => {
                            const src = composerFilePreviews.get(getComposerFileId(f));
                            if (!src) return;
                            setLightbox({ src, alt: f.name });
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={composerFilePreviews.get(getComposerFileId(f)) ?? ""}
                            alt={f.name}
                            className="h-8 w-8 object-cover"
                          />
                        </button>
                      ) : null}
                      <input
                        value={composerFileNames.get(getComposerFileId(f)) ?? f.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          const id = getComposerFileId(f);
                          setComposerFileNames((prev) => {
                            const next = new Map(prev);
                            next.set(id, value);
                            return next;
                          });
                        }}
                        className="min-w-[12ch] max-w-[320px] truncate bg-transparent text-xs font-semibold text-slate-700 outline-none"
                        aria-label="Attachment name"
                      />
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

              {composerScheduleOpen ? (
                <div className="absolute bottom-full left-0 right-0 mb-2 px-6">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <label className="text-xs font-semibold text-slate-700">
                      Send later
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setComposerScheduleOpen(false)}
                      className="ml-auto h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Message actions"
                      onClick={() => setComposerActionsOpen((v) => !v)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300"
                      disabled={!activeThread || activeThreadArchived}
                    >
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
                        d="M12 5v14M5 12h14"
                      />
                    </svg>
                  </button>
                  {composerActionsOpen ? (
                    <div className="absolute bottom-12 left-0 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setComposerActionsOpen(false);
                          void updateActiveThread({
                            linkedWorkOrderId:
                              activeThread?.linkedWorkOrderId ??
                              `WO-${Math.floor(1000 + Math.random() * 9000)}`,
                          });
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Create Work Order
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposerActionsOpen(false);
                          setComposerScheduleOpen(true);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposerActionsOpen(false);
                          void updateActiveThread({ status: "resolved" });
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Mark Resolved
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposerActionsOpen(false);
                          setOpenMessageMenuId(null);
                          setBulkDeleteMode(true);
                          setSelectedMessageIds([]);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Delete Messages
                      </button>
                    </div>
                  ) : null}
                </div>

                  <button
                    type="button"
                    aria-label="Attach files"
                    onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.onchange = () => {
                      const files = Array.from(input.files ?? []);
                      if (files.length) setComposerFiles((prev) => [...prev, ...files]);
                    };
                    input.click();
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300"
                    disabled={!activeThread || activeThreadArchived || bulkDeleteMode}
                  >
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
                      d="M21.44 11.05 12.7 19.8a6 6 0 0 1-8.49-8.49l9.19-9.19a4.5 4.5 0 1 1 6.36 6.36L10.1 18.14a3 3 0 0 1-4.24-4.24l9.19-9.19"
                    />
                  </svg>
                </button>

                <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    aria-label="Write a reply"
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      void sendMessage();
                    }}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    disabled={!activeThread || activeThreadArchived || bulkDeleteMode}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => void sendMessage()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={!activeThread || activeThreadArchived || bulkDeleteMode}
                >
                  <PaperPlaneIcon />
                  Send
                </button>
                </div>
                </>
              )}
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
                    archivedAt: activeThread.archivedAt,
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
                    archivedAt: activeThread.archivedAt,
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
                <div />
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

      {lightbox ? (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete message?"
          message="This will delete the message for everyone in the thread."
          confirmLabel="Delete for everyone"
          cancelLabel="Cancel"
          tone="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            const { threadId, messageId } = confirmDelete;
            setConfirmDelete(null);
            void (async () => {
              await client.deleteMessage(threadId, messageId);
              setHiddenMessageIds((prevIds) => prevIds.filter((id) => id !== messageId));
              await refreshAllThreads();
              await refreshThreads();
              const { messages: next } = await client.listMessages(threadId);
              setMessages(next);
            })();
          }}
        />
      ) : null}

      {confirmBulkDelete ? (
        <ConfirmDialog
          title={
            confirmBulkDelete.scope === "everyone" ? "Delete messages for everyone?" : "Delete messages for you?"
          }
          message={`Delete ${confirmBulkDelete.messageIds.length} message${
            confirmBulkDelete.messageIds.length === 1 ? "" : "s"
          }${confirmBulkDelete.scope === "everyone" ? " for everyone in the thread" : " from your view"}?`}
          confirmLabel={confirmBulkDelete.scope === "everyone" ? "Delete for everyone" : "Delete for you"}
          cancelLabel="Cancel"
          tone={confirmBulkDelete.scope === "everyone" ? "danger" : "default"}
          onCancel={() => setConfirmBulkDelete(null)}
          onConfirm={() => {
            const { scope, threadId, messageIds } = confirmBulkDelete;
            setConfirmBulkDelete(null);
            if (scope === "me") {
              setHiddenMessageIds((prev) => {
                const next = new Set(prev);
                messageIds.forEach((id) => next.add(id));
                return [...next];
              });
              setBulkDeleteMode(false);
              setSelectedMessageIds([]);
              return;
            }

            void (async () => {
              const allowed = new Set(
                messages.filter((m) => m.senderId === viewer.actorId).map((m) => m.id),
              );
              if (!messageIds.every((id) => allowed.has(id))) {
                setBulkDeleteMode(false);
                setSelectedMessageIds([]);
                return;
              }
              await Promise.all(messageIds.map((id) => client.deleteMessage(threadId, id)));
              setHiddenMessageIds((prevIds) => prevIds.filter((id) => !messageIds.includes(id)));
              setBulkDeleteMode(false);
              setSelectedMessageIds([]);
              await refreshAllThreads();
              await refreshThreads();
              const { messages: next } = await client.listMessages(threadId);
              setMessages(next);
            })();
          }}
        />
      ) : null}
    </section>
  );
}
