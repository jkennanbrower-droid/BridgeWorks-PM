"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import { DashboardApp } from "ui";

const appId = "staff";
const roleOptions = ["property_manager", "admin", "maintenance"] as const;
const appStorageKey = `bw.dashboard.v1.${appId}`;
type RoleOption = (typeof roleOptions)[number];

const modules: ModuleDef[] = [
  { id: "overview", label: "Overview" },
  { id: "tenants", label: "Tenants" },
  { id: "units", label: "Units" },
  { id: "maintenance", label: "Maintenance" },
  { id: "leasing", label: "Leasing" },
  { id: "reports", label: "Reports" },
  { id: "messages", label: "Messages" },
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
  property_manager: modules,
  admin: modules,
  maintenance: modules,
};

const standardLayouts: StandardLayoutsDef = {
  property_manager: { overview: overviewLayout },
  admin: { overview: overviewLayout },
  maintenance: { overview: overviewLayout },
};

const roleLabels: Record<(typeof roleOptions)[number], string> = {
  property_manager: "Senior Property Manager",
  admin: "Portfolio Admin",
  maintenance: "Maintenance Lead",
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

export function StaffDashboardClient() {
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
      name: "BridgeWorks User",
      roleLabel: roleLabels[role] ?? "Property Manager",
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
