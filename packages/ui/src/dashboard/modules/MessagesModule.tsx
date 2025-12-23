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

type MessageThread = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: boolean;
  avatarTone: "slate" | "blue" | "emerald";
};

const THREADS: MessageThread[] = [
  {
    id: "anna",
    name: "Anna Williams",
    preview: "Great, thank you!",
    time: "Just now",
    unread: false,
    avatarTone: "emerald",
  },
  {
    id: "robert",
    name: "Robert Mitchell",
    preview: "David replied to the ticket…",
    time: "2h ago",
    unread: true,
    avatarTone: "blue",
  },
  {
    id: "team",
    name: "Team Chat",
    preview: "Check out the new process for handling…",
    time: "3 days ago",
    unread: false,
    avatarTone: "slate",
  },
  {
    id: "becky",
    name: "Becky Sanders",
    preview: "Thanks for the update, Carlos.",
    time: "5 days ago",
    unread: false,
    avatarTone: "slate",
  },
  {
    id: "carlos",
    name: "Carlos Munoz",
    preview: "I received the checklist, I’ll take care of…",
    time: "8 days ago",
    unread: false,
    avatarTone: "slate",
  },
  {
    id: "ashley",
    name: "Ashley Johnson",
    preview: "Upload complete. All documents…",
    time: "14 days ago",
    unread: false,
    avatarTone: "slate",
  },
];

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

export function MessagesModule() {
  const activeThread = THREADS[0];

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <Segmented
            value="all"
            onChange={() => {}}
            items={[
              { value: "all", label: "All (27)" },
              { value: "unread", label: "Unread (4)" },
              { value: "flagged", label: "Flagged" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
          >
            Compose
            <span aria-hidden="true" className="text-slate-500">
              ▾
            </span>
          </button>
          <button
            type="button"
            aria-label="More"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
          >
            <DotsIcon />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
        <div className="grid h-full min-h-0 grid-cols-[30%_70%] overflow-hidden">
          <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="p-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                <SearchIcon />
                <input
                type="search"
                placeholder="Search messages"
                aria-label="Search messages"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {THREADS.map((thread) => {
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
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
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
                        {thread.time}
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
          </aside>

          <div className="flex min-w-0 flex-col overflow-hidden bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
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
            <button
              type="button"
              aria-label="Conversation actions"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
            >
              <DotsIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-6 py-6">
            <div className="flex items-start gap-3">
              <Avatar initials="AW" tone="emerald" online />
              <div className="max-w-[760px] break-words rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
                Hi, the AC unit in our apartment stopped working yesterday. Can you please
                send someone to have a look at it?
              </div>
              <span className="ml-auto whitespace-nowrap pt-2 text-xs text-slate-400">
                2h ago
              </span>
            </div>

            <div className="flex items-start gap-3">
              <Avatar initials="AW" tone="emerald" online />
              <div className="max-w-[760px] break-words rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
                When do you think a maintenance tech would be able to come?
              </div>
              <span className="ml-auto whitespace-nowrap pt-2 text-xs text-slate-400">
                10m ago
              </span>
            </div>

            <div className="flex items-start justify-end gap-3">
              <div className="max-w-[760px] break-words rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
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
              <span className="whitespace-nowrap pt-2 text-xs text-slate-400">
                Just now
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
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
      </div>
      </div>
    </section>
  );
}
