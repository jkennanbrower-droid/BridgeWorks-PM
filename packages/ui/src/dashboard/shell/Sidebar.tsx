import { ProfileBlock } from "./ProfileBlock";
import type { DashboardProfile } from "../types";

type SidebarProps = {
  profile: DashboardProfile;
};

type NavItem = {
  label: string;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Communications",
    items: [
      { label: "Messages", badge: "4" },
      { label: "Team Chat", badge: "2" },
      { label: "Vendors" },
    ],
  },
  {
    title: "Alerts & Approvals",
    items: [
      { label: "Alerts", badge: "6" },
      { label: "Approvals", badge: "3" },
      { label: "Tasks", badge: "5" },
    ],
  },
];

export function Sidebar({ profile }: SidebarProps) {
  return (
    <aside className="flex w-72 flex-col gap-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-5 py-6 text-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">
          BW
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            BridgeWorks PM
          </p>
          <p className="text-base font-semibold text-white">Dashboard</p>
        </div>
      </div>

      <ProfileBlock profile={profile} />

      <nav className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              {group.title}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {group.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
                      {item.badge}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
        <p className="font-semibold text-slate-200">BridgeWorks Help Desk</p>
        <p className="mt-1">Support available 24/7</p>
      </div>
    </aside>
  );
}
