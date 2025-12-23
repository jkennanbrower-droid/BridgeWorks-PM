
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { DashboardProfile, ModuleDef } from "../types";
import {
  buildPublicUrl,
  ensureDemoSession,
  getDemoSession,
  resetDemoSession,
} from "../demoSession";
import { clearDashboardStorage, clearMessagingSessionStorage } from "../storage";

import { ModuleTabs } from "./ModuleTabs";
import { Sidebar } from "./Sidebar";

type DashboardShellProps = {
  appId: string;
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
  contentVariant?: "default" | "full";
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
  appId,
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
  contentVariant = "default",
  children,
}: DashboardShellProps) {
  const sidebarStorageKey = `bw.dashboard.sidebarCollapsed.v1.${appId}`;
  const legacySidebarStorageKey = "bw.dashboard.sidebarCollapsed.v1";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(sidebarStorageKey);
      if (stored === "true") return true;
      if (stored === "false") return false;
      const legacy = window.localStorage.getItem(legacySidebarStorageKey);
      if (legacy === "true") return true;
      if (legacy === "false") return false;
    } catch {
      // ignore storage errors
    }
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        sidebarStorageKey,
        sidebarCollapsed ? "true" : "false",
      );
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed, sidebarStorageKey]);

  const demoActorId = useMemo(() => {
    const session = getDemoSession(appId);
    return session?.actorId ?? "";
  }, [appId, role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(sidebarStorageKey);
      if (stored === "true" || stored === "false") return;
      const legacy = window.localStorage.getItem(legacySidebarStorageKey);
      if (legacy === "true" || legacy === "false") {
        window.localStorage.setItem(sidebarStorageKey, legacy);
        window.localStorage.removeItem(legacySidebarStorageKey);
      }
    } catch {
      // ignore storage errors
    }
  }, [legacySidebarStorageKey, sidebarStorageKey]);

  const publicHomeUrl = buildPublicUrl("/");
  const publicLoginUrl = buildPublicUrl("/login");

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full flex-col lg:flex-row">
        <Sidebar
          profile={profile}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          activeModuleId={activeModuleId}
          onModuleSelect={onModuleSelect}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-4 px-6 py-4">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <BuildingIcon />
                Canyon Ridge Apartments
              </button>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                <span className="text-slate-400">Demo</span>
                <span className="text-slate-700">
                  {appId}
                  {demoActorId ? ` • ${demoActorId.slice(-6)}` : ""}
                </span>
              </div>
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
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.localStorage.setItem(sidebarStorageKey, "true");
                      window.localStorage.removeItem(legacySidebarStorageKey);
                    } catch {
                      // ignore storage errors
                    }
                    clearDashboardStorage(appId);
                    window.location.assign(publicHomeUrl);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-slate-300"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.localStorage.setItem(sidebarStorageKey, "true");
                      window.localStorage.removeItem(legacySidebarStorageKey);
                    } catch {
                      // ignore storage errors
                    }
                    const session = ensureDemoSession(appId);
                    clearMessagingSessionStorage({
                      appId,
                      orgId: session.orgId,
                      actorId: session.actorId,
                      sessionId: session.sessionId,
                    });
                    resetDemoSession(appId);
                    clearDashboardStorage(appId);
                    window.location.assign(publicLoginUrl);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-slate-300"
                >
                  Sign out
                </button>
                {/* Layout/customize controls hidden for now. */}
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

          <div className="min-h-0 flex-1 overflow-y-auto">
            {contentVariant === "full" ? (
              <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
            ) : (
              <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-6">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
