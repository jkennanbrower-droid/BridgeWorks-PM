"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import { DashboardApp } from "ui";

const appId = "org";
const roleOptions = ["org_admin", "org_manager"] as const;
const appStorageKey = `bw.dashboard.v1.${appId}`;
type RoleOption = (typeof roleOptions)[number];

const modules: ModuleDef[] = [
  { id: "overview", label: "Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "performance", label: "Performance" },
  { id: "approvals", label: "Approvals" },
  { id: "settings", label: "Settings" },
];

const overviewLayout: ModuleLayout = {
  widgets: [
    {
      id: "urgent-attention",
      type: "urgent_attention",
      sizePreset: "tall",
    },
    {
      id: "kpi-tiles",
      type: "kpi_tiles",
      sizePreset: "sm",
    },
    {
      id: "rent-collections",
      type: "rent_collections",
      sizePreset: "sm",
    },
    {
      id: "maintenance-health",
      type: "maintenance_health",
      sizePreset: "sm",
    },
    {
      id: "leasing-pipeline",
      type: "leasing_pipeline",
      sizePreset: "sm",
    },
  ],
};

const modulesByRole: Record<(typeof roleOptions)[number], ModuleDef[]> = {
  org_admin: modules,
  org_manager: modules,
};

const standardLayouts: StandardLayoutsDef = {
  org_admin: { overview: overviewLayout },
  org_manager: { overview: overviewLayout },
};

const roleLabels: Record<(typeof roleOptions)[number], string> = {
  org_admin: "Organization Admin",
  org_manager: "Organization Manager",
};

function isRoleOption(value: string): value is RoleOption {
  return roleOptions.includes(value as RoleOption);
}

function getStoredRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(appStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { activeRole?: string };
    return parsed.activeRole ?? null;
  } catch {
    return null;
  }
}

export function OrgDashboardClient() {
  const [role, setRole] = useState<RoleOption>(roleOptions[0]);

  useEffect(() => {
    const storedRole = getStoredRole();
    if (storedRole && isRoleOption(storedRole)) {
      setRole(storedRole);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      appStorageKey,
      JSON.stringify({ version: 1, activeRole: role }),
    );
  }, [role]);

  const profile = useMemo(
    () => ({
      name: "BridgeWorks Org User",
      roleLabel: roleLabels[role] ?? "Organization Admin",
      company: "BridgeWorks PM",
      avatarUrl: undefined,
      status: "online" as const,
    }),
    [role],
  );

  return (
    <DashboardApp
      appId={appId}
      profile={profile}
      role={role}
      roleOptions={[...roleOptions]}
      modulesByRole={modulesByRole}
      standardLayouts={standardLayouts}
      onRoleChange={(nextRole) => {
        if (isRoleOption(nextRole)) {
          setRole(nextRole);
        }
      }}
    />
  );
}
