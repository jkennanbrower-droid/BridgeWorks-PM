import type { ReactElement } from "react";

import { ProfileBlock } from "./ProfileBlock";
import type { DashboardProfile } from "../types";

type SidebarProps = {
  profile: DashboardProfile;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  activeModuleId: string;
  onModuleSelect: (moduleId: string) => void;
};

type NavItem = {
  label: string;
  badge?: string;
  icon: () => ReactElement;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function ChevronIcon({
  direction,
  className,
}: {
  direction: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"}
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.3 4.4l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.6l-8-14a2 2 0 0 0-3.4 0Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 11.5 11.5 14 16 9.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h.01" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.1 9a3 3 0 1 1 5.7 1.4c-.6 1-1.8 1.4-2.3 2.4-.2.4-.3.8-.3 1.2v.5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="-1 -1 26 26"
      className="h-5 w-5 overflow-visible"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"
      />
    </svg>
  );
}

const navGroups: NavGroup[] = [
  {
    title: "Alerts & Approvals",
    items: [
      { label: "Alerts", badge: "6", icon: AlertIcon },
      { label: "Approvals", badge: "3", icon: CheckIcon },
      { label: "Tasks", badge: "5", icon: TaskIcon },
    ],
  },
];

export function Sidebar({
  profile,
  collapsed,
  onToggleCollapsed,
  activeModuleId,
  onModuleSelect,
}: SidebarProps) {
  const messagesActive = activeModuleId === "messages";

  return (
    <aside
      onClick={
        collapsed
          ? () => {
              onToggleCollapsed();
            }
          : undefined
      }
      className={`relative flex h-full shrink-0 flex-col gap-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 py-6 text-slate-100 transition-[width] duration-200 ${
        collapsed ? "w-20 cursor-pointer px-3" : "w-72 px-5"
      }`}
    >
      {!collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse sidebar"
          className="absolute -right-5 top-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black text-white shadow-xl shadow-black/50 ring-1 ring-black/20 transition hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronIcon direction="left" className="h-6 w-6" />
        </button>
      ) : null}

      <div
        className={
          collapsed
            ? "flex flex-col items-center gap-3"
            : "flex items-start justify-between gap-3"
        }
      >
        <div className={`flex items-center gap-3 ${collapsed ? "" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">
            BW
          </div>
          {!collapsed ? (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                BridgeWorks PM
              </p>
              <p className="text-base font-semibold text-white">Dashboard</p>
            </div>
          ) : null}
        </div>
      </div>

      <ProfileBlock profile={profile} collapsed={collapsed} />

      <div>
        {collapsed ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onModuleSelect("messages");
            }}
            aria-label="Messages"
            className={`relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
              messagesActive
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            }`}
          >
            <MessageIcon />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1 text-[10px] font-semibold text-slate-100">
              4
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onModuleSelect("messages")}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              messagesActive
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-slate-300">
                <MessageIcon />
              </span>
              Messages
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
              4
            </span>
          </button>
        )}
      </div>

      <nav className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                {group.title}
              </p>
            ) : null}
            <ul className={`${collapsed ? "mt-0 space-y-3" : "mt-3 space-y-2"} text-sm`}>
              {group.items.map((item) => (
                <li key={item.label}>
                  {collapsed ? (
                    <div
                      title={item.label}
                      className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100"
                    >
                      <item.icon />
                      {item.badge ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1 text-[10px] font-semibold text-slate-100">
                          {item.badge}
                        </span>
                      ) : null}
                      <span className="sr-only">{item.label}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100">
                      <span className="flex items-center gap-2">
                        <span className="text-slate-300">
                          <item.icon />
                        </span>
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto">
        <div className={collapsed ? "flex flex-col items-center gap-3" : "space-y-3"}>
          {collapsed ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapsed();
              }}
              aria-label="Expand sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
            >
              <ChevronIcon direction="right" className="h-5 w-5" />
            </button>
          ) : null}

          {collapsed ? (
            <div
              title="BridgeWorks Help Desk"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200"
            >
              <HelpIcon />
              <span className="sr-only">BridgeWorks Help Desk</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">BridgeWorks Help Desk</p>
              <p className="mt-1">Support available 24/7</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
