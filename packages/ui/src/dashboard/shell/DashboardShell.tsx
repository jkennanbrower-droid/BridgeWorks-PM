import type { ReactNode } from "react";

import type { DashboardProfile, ModuleDef } from "../types";

import { ModuleTabs } from "./ModuleTabs";
import { Sidebar } from "./Sidebar";

type DashboardShellProps = {
  profile: DashboardProfile;
  role: string;
  roleOptions: string[];
  onRoleChange?: (role: string) => void;
  modules: ModuleDef[];
  activeModuleId: string;
  customizeMode: boolean;
  layoutLabel: string;
  onModuleSelect: (moduleId: string) => void;
  onModuleReorder: (moduleOrder: string[]) => void;
  onCustomizeToggle: () => void;
  onResetLayout?: () => void;
  children: ReactNode;
};

function BellIcon() {
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
        d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function BuildingIcon() {
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
        d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 11h.01M15 11h.01M9 14h.01M15 14h.01"
      />
    </svg>
  );
}

export function DashboardShell({
  profile,
  role,
  roleOptions,
  onRoleChange,
  modules,
  activeModuleId,
  customizeMode,
  layoutLabel,
  onModuleSelect,
  onModuleReorder,
  onCustomizeToggle,
  onResetLayout,
  children,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar profile={profile} />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-4 px-6 py-4">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <BuildingIcon />
                Canyon Ridge Apartments
              </button>
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Search
                </span>
                <input
                  type="search"
                  placeholder="Search dashboard"
                  aria-label="Search dashboard"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {roleOptions.length > 1 && onRoleChange ? (
                  <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                    <select
                      value={role}
                      onChange={(event) => onRoleChange(event.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="text-slate-400">Layout</span>
                  <span className="text-slate-700">{layoutLabel}</span>
                  {onResetLayout ? (
                    <button
                      type="button"
                      onClick={onResetLayout}
                      className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onCustomizeToggle}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-sm transition ${
                    customizeMode
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {customizeMode ? "Done" : "Customize"}
                </button>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                >
                  <BellIcon />
                </button>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-3">
              <ModuleTabs
                modules={modules}
                activeModuleId={activeModuleId}
                customizeMode={customizeMode}
                onModuleSelect={onModuleSelect}
                onModuleReorder={onModuleReorder}
              />
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
