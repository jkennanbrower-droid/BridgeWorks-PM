"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import { DashboardApp } from "ui";

const appId = "user";
const roleOptions = ["tenant"] as const;
const appStorageKey = `bw.dashboard.v1.${appId}`;
type RoleOption = (typeof roleOptions)[number];

const modules: ModuleDef[] = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "maintenance", label: "Maintenance" },
  { id: "documents", label: "Documents" },
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
      sizePreset: "md",
    },
    {
      id: "rent-collections",
      type: "rent_collections",
      sizePreset: "md",
    },
    {
      id: "maintenance-health",
      type: "maintenance_health",
      sizePreset: "md",
    },
    {
      id: "leasing-pipeline",
      type: "leasing_pipeline",
      sizePreset: "md",
    },
  ],
};

const modulesByRole: Record<(typeof roleOptions)[number], ModuleDef[]> = {
  tenant: modules,
};

const standardLayouts: StandardLayoutsDef = {
  tenant: { overview: overviewLayout },
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

export function UserDashboardClient() {
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
      name: "BridgeWorks Resident",
      roleLabel: "Resident",
      company: "BridgeWorks PM",
      avatarUrl: undefined,
      status: "online" as const,
    }),
    [],
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
