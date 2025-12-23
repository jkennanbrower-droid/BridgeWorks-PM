import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ThreadDetailsPanel,
  type ThreadDetailsPanelData,
} from "./messages/ThreadDetailsPanel";

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

function DotsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

type ThreadFilter = "all" | "groups" | "unread" | "flagged";
type ThreadSort = "mostRecent" | "leastRecent" | "unreadFirst" | "flaggedFirst";

type ConversationSide = "tenant" | "you";
type ConversationMessage = {
  id: string;
  side: ConversationSide;
  minutesAgo: number;
  content: ReactNode;
};

function ThreadFilters({
  value,
  onChange,
}: {
  value: ThreadFilter;
  onChange: (value: ThreadFilter) => void;
}) {
  const items: { value: ThreadFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "groups", label: "Groups" },
    { value: "unread", label: "Unread" },
    { value: "flagged", label: "Flagged" },
  ];

  return (
    <nav aria-label="Message filters" className="flex items-center">
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <div key={item.value} className="flex items-center">
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              className={`text-sm font-semibold transition ${
                active
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => onChange(item.value)}
            >
              {item.label}
            </button>
            {index < items.length - 1 ? (
              <span aria-hidden="true" className="px-2 text-slate-300">
                |
              </span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

type MessageThread = {
  id: string;
  name: string;
  preview: string;
  minutesAgo: number;
  unread?: boolean;
  flagged?: boolean;
  group?: boolean;
  avatarTone: "slate" | "blue" | "emerald";
};

const THREADS: MessageThread[] = [
  {
    id: "anna",
    name: "Anna Williams",
    preview: "Great, thank you!",
    minutesAgo: 0,
    unread: false,
    avatarTone: "emerald",
  },
  {
    id: "robert",
    name: "Robert Mitchell",
    preview: "David replied to the ticket…",
    minutesAgo: 120,
    unread: true,
    flagged: true,
    avatarTone: "blue",
  },
  {
    id: "team",
    name: "Team Chat",
    preview: "Check out the new process for handling…",
    minutesAgo: 3 * 24 * 60,
    unread: false,
    group: true,
    avatarTone: "slate",
  },
  {
    id: "becky",
    name: "Becky Sanders",
    preview: "Thanks for the update, Carlos.",
    minutesAgo: 5 * 24 * 60,
    unread: false,
    avatarTone: "slate",
  },
  {
    id: "carlos",
    name: "Carlos Munoz",
    preview: "I received the checklist, I’ll take care of…",
    minutesAgo: 8 * 24 * 60,
    unread: false,
    avatarTone: "slate",
  },
  {
    id: "ashley",
    name: "Ashley Johnson",
    preview: "Upload complete. All documents…",
    minutesAgo: 14 * 24 * 60,
    unread: false,
    flagged: true,
    avatarTone: "slate",
  },
];

function formatThreadTime(minutesAgo: number) {
  if (minutesAgo <= 0) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function Avatar({
  initials,
  tone,
  online,
}: {
  initials: string;
  tone: MessageThread["avatarTone"];
  online?: boolean;
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25"
      : tone === "blue"
        ? "bg-sky-500/15 text-sky-700 ring-sky-500/25"
        : "bg-slate-500/15 text-slate-700 ring-slate-500/25";

  return (
    <div className="relative">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ${toneClasses}`}
      >
        <span className="text-xs font-semibold">{initials}</span>
      </div>
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      ) : null}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            item.value === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MessagesModule({ isStaffView = false }: { isStaffView?: boolean }) {
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>("all");
  const [activeSort, setActiveSort] = useState<ThreadSort>("mostRecent");
  const [expandedMessageTimestamps, setExpandedMessageTimestamps] = useState(
    () => new Set<string>(),
  );
  const activeThread = THREADS[0];
  const [threadDetailsOpen, setThreadDetailsOpen] = useState(false);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [threadListHasMore, setThreadListHasMore] = useState(false);
  const [messageListHasMore, setMessageListHasMore] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(min-width: 1280px)")?.matches) {
      setThreadDetailsOpen(true);
    }
  }, []);

  const threadDetailsData = useMemo<ThreadDetailsPanelData>(
    () => ({
      title: "AC not cooling - Unit 14 (tenant follow-up)",
      status: "Open",
      priority: "High",
      sla: "SLA 4h",
      createdAtLabel: "Yesterday 3:18 PM",
      lastActivityAtLabel: "Just now",
      channel: "SMS",
      linked: {
        property: { label: "Riverstone Apartments", subtext: "Property • #RS-102" },
        unit: { label: "Unit 14", subtext: "Building A • Floor 2" },
        resident: { label: "Anna Williams", subtext: "Tenant • Lease #L-2218" },
      },
      participants: [
        { id: "p1", name: "Anna Williams", role: "Tenant", online: true },
        { id: "p2", name: "Carlos Munoz", role: "Maintenance", online: false },
        { id: "p3", name: "You", role: "Property Manager", online: true },
      ],
      attachments: [
        {
          id: "a1",
          filename: "ac-video.mp4",
          meta: "12.4 MB • Anna • 2h ago",
          kind: "file",
        },
        {
          id: "a2",
          filename: "thermostat.jpg",
          meta: "2.1 MB • Anna • 2h ago",
          kind: "image",
        },
        {
          id: "a3",
          filename: "maintenance-notes.pdf",
          meta: "320 KB • Carlos • 45m ago",
          kind: "pdf",
        },
        {
          id: "a4",
          filename: "lease.pdf",
          meta: "840 KB • System • 1d ago",
          kind: "pdf",
        },
      ],
      tags: {
        items: ["HVAC", "No cooling", "Follow-up"],
        queue: "Maintenance",
        escalation: "Escalated",
      },
      routing: {
        assignedTo: "Carlos M.",
        queue: "Maintenance",
        sla: "4h remaining",
      },
      activity: [
        {
          id: "e1",
          title: "Thread created",
          actor: "Anna",
          timestampLabel: "Yesterday 3:18 PM",
        },
        {
          id: "e2",
          title: "Assigned to Carlos M.",
          actor: "You",
          timestampLabel: "Yesterday 3:25 PM",
          linkLabel: "View",
        },
        {
          id: "e3",
          title: "Attachment added",
          actor: "Anna",
          timestampLabel: "2h ago",
        },
      ],
      compliance: { retention: "Retention: 7 years", logged: "Logged" },
    }),
    [],
  );

  const conversationMessages = useMemo<ConversationMessage[]>(
    () => [
      {
        id: "m1",
        side: "tenant",
        minutesAgo: 120,
        content: (
          <>
            Hi, the AC unit in our apartment stopped working yesterday. Can you please
            send someone to have a look at it?
          </>
        ),
      },
      {
        id: "m2",
        side: "tenant",
        minutesAgo: 10,
        content: <>When do you think a maintenance tech would be able to come?</>,
      },
      {
        id: "m3",
        side: "you",
        minutesAgo: 0,
        content: (
          <>
            <p className="text-xs font-semibold text-slate-500">
              You Aú BridgeWorks PM
            </p>
            <p className="mt-2">
              Hello Anna, sorry to hear about AC issue.
              <br />
              <br />
              I&apos;ll dispatch a maintenance tech to your unit today to inspect and repair
              the AC. I&apos;ll let you know when they&apos;ll be there.
            </p>
          </>
        ),
      },
    ],
    [],
  );

  const lastMessageIndexBySide = useMemo(() => {
    const map: Record<ConversationSide, number> = { tenant: -1, you: -1 };
    conversationMessages.forEach((message, index) => {
      map[message.side] = index;
    });
    return map;
  }, [conversationMessages]);

  const visibleThreads = useMemo(() => {
    const filtered = THREADS.filter((thread) => {
      if (activeFilter === "groups") return Boolean(thread.group);
      if (activeFilter === "unread") return Boolean(thread.unread);
      if (activeFilter === "flagged") return Boolean(thread.flagged);
      return true;
    });

    const byMostRecent = (a: MessageThread, b: MessageThread) =>
      a.minutesAgo - b.minutesAgo;

    return [...filtered].sort((a, b) => {
      if (activeSort === "leastRecent") return byMostRecent(b, a);
      if (activeSort === "unreadFirst") {
        const unreadDelta = Number(Boolean(b.unread)) - Number(Boolean(a.unread));
        return unreadDelta !== 0 ? unreadDelta : byMostRecent(a, b);
      }
      if (activeSort === "flaggedFirst") {
        const flaggedDelta =
          Number(Boolean(b.flagged)) - Number(Boolean(a.flagged));
        return flaggedDelta !== 0 ? flaggedDelta : byMostRecent(a, b);
      }
      return byMostRecent(a, b);
    });
  }, [activeFilter, activeSort]);

  useEffect(() => {
    const element = threadListRef.current;
    if (!element) return;

    const update = () => {
      const remaining =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      setThreadListHasMore(remaining > 8);
    };

    update();
    element.addEventListener("scroll", update, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => element.removeEventListener("scroll", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [visibleThreads.length]);

  useEffect(() => {
    const element = messageListRef.current;
    if (!element) return;

    const update = () => {
      const remaining =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      setMessageListHasMore(remaining > 8);
    };

    update();
    element.addEventListener("scroll", update, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => element.removeEventListener("scroll", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

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
            <div className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <ThreadFilters value={activeFilter} onChange={setActiveFilter} />
                <select
                  value={activeSort}
                  onChange={(event) =>
                    setActiveSort(event.target.value as ThreadSort)
                  }
                  className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-slate-300"
                  aria-label="Sort threads"
                >
                  <option value="mostRecent">Most recent</option>
                  <option value="leastRecent">Least recent</option>
                  <option value="unreadFirst">Unread first</option>
                  <option value="flaggedFirst">Flagged first</option>
                </select>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search messages"
                    aria-label="Search messages"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  New Thread
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={threadListRef}
                className="min-h-0 h-full overflow-y-auto px-2 pb-14 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleThreads.map((thread) => {
                  const initials = thread.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const active = thread.id === activeThread.id;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-5 text-left transition ${
                        active ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <Avatar
                        initials={initials}
                        tone={thread.avatarTone}
                        online={thread.id === "anna"}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {thread.name}
                        </p>
                        <p
                          className={`mt-0.5 truncate text-sm ${
                            thread.unread ? "text-slate-700" : "text-slate-500"
                          }`}
                        >
                          {thread.preview}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="whitespace-nowrap text-xs text-slate-500">
                          {formatThreadTime(thread.minutesAgo)}
                        </p>
                        {thread.unread ? (
                          <span
                            className="h-2 w-2 rounded-full bg-sky-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="h-2 w-2" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
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
                  More messages
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col overflow-hidden bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <Avatar initials="AW" tone="emerald" online />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Anna Williams
                </p>
                <p className="truncate text-xs text-slate-500">Tenant · Unit 14</p>
                <p className="truncate text-xs text-slate-400">
                  anna.williams@email.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThreadDetailsOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
              >
                <span className="text-xs font-semibold">ⓘ</span>
                <span className="hidden sm:inline">Details</span>
              </button>
              <button
                type="button"
                aria-label="Conversation actions"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
              >
                <DotsIcon />
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={messageListRef}
              className="min-h-0 h-full space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4 pb-14 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex items-start gap-3">
                <Avatar initials="AW" tone="emerald" online />
                <div className="flex max-w-[760px] flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMessageTimestamps((previous) => {
                        const next = new Set(previous);
                        if (next.has("tenant-1")) next.delete("tenant-1");
                        else next.add("tenant-1");
                        return next;
                      })
                    }
                    className="text-left"
                  >
                    <div className="break-words rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
                      Hi, the AC unit in our apartment stopped working yesterday. Can you please
                      send someone to have a look at it?
                    </div>
                  </button>
                  {expandedMessageTimestamps.has("tenant-1") ? (
                    <p className="mt-1 text-xs text-slate-400">2h ago</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Avatar initials="AW" tone="emerald" online />
                <div className="flex max-w-[760px] flex-col">
                  <div className="break-words rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
                    When do you think a maintenance tech would be able to come?
                  </div>
                  <p className="mt-1 text-xs text-slate-400">10m ago</p>
                </div>
              </div>

            <div className="flex justify-end">
              <div className="flex max-w-[760px] flex-col items-end">
                <div className="break-words rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">
                    You · BridgeWorks PM
                  </p>
                  <p className="mt-2">
                    Hello Anna, sorry to hear about AC issue.
                    <br />
                    <br />
                    I&apos;ll dispatch a maintenance tech to your unit today to inspect and
                    repair the AC. I&apos;ll let you know when they&apos;ll be there.
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-400">Just now</p>
              </div>
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

          <div className="border-t border-slate-200 bg-white px-6 py-3">
            <div className="flex items-end gap-3">
              <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  aria-label="Write a reply"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                aria-label="Send message"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <PaperPlaneIcon />
                Send
              </button>
            </div>
          </div>
        </div>
          <ThreadDetailsPanel
            isOpen={threadDetailsOpen}
            onClose={() => setThreadDetailsOpen(false)}
            isStaffView={isStaffView}
            data={threadDetailsData}
            className="hidden xl:flex"
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
            data={threadDetailsData}
            className="fixed inset-y-0 right-0 z-50 w-[340px] max-w-[90vw] shadow-xl"
          />
        </div>
      ) : null}
    </section>
  );
}
