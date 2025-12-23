"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import {
  DashboardApp,
  ensureDemoSession,
  getDemoSession,
  setActiveDemoUserRole,
} from "ui";

const appId = "staff";
const roleOptions = ["staff_admin", "property_manager", "maintenance"] as const;
type RoleOption = (typeof roleOptions)[number];
// TODO: Real permissions will replace demo SUPER logic.

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
  staff_admin: modules,
  property_manager: modules,
  maintenance: modules,
};

const standardLayouts: StandardLayoutsDef = {
  staff_admin: { overview: overviewLayout },
  property_manager: { overview: overviewLayout },
  maintenance: { overview: overviewLayout },
};

const roleLabels: Record<(typeof roleOptions)[number], string> = {
  staff_admin: "Staff Admin",
  property_manager: "Senior Property Manager",
  maintenance: "Maintenance Lead",
};

const roleDisplayNames: Record<(typeof roleOptions)[number], string> = {
  staff_admin: "Avery Chen",
  property_manager: "Jordan Patel",
  maintenance: "Sam Rivera",
};

function isRoleOption(value: string): value is RoleOption {
  return roleOptions.includes(value as RoleOption);
}

export function StaffDashboardClient() {
  const [role, setRole] = useState<RoleOption>(() => {
    const session = getDemoSession(appId);
    if (session?.lastRole && isRoleOption(session.lastRole)) return session.lastRole;
    const inferred = roleOptions.find((r) => session?.actorId?.endsWith(`_${r}`));
    return inferred ?? roleOptions[0];
  });

  useEffect(() => {
    ensureDemoSession(appId);
  }, []);

  useEffect(() => {
    setActiveDemoUserRole(appId, role);
  }, [role]);

  const profile = useMemo(
    () => ({
      name: roleDisplayNames[role] ?? "BridgeWorks Staff",
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
          setActiveDemoUserRole(appId, nextRole);
          setRole(nextRole);
        }
      }}
    />
  );
}
