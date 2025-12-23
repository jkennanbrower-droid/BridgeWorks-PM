"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import {
  DashboardApp,
  ensureDemoSession,
  getDemoSession,
  setActiveDemoUserRole,
} from "ui";

const appId = "user";
const roleOptions = ["tenant_primary", "tenant_roommate", "tenant_guest"] as const;
type RoleOption = (typeof roleOptions)[number];
// TODO: Real permissions will replace demo SUPER logic.

const modules: ModuleDef[] = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "maintenance", label: "Maintenance" },
  { id: "documents", label: "Documents" },
  { id: "messages", label: "Messages" },
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
  tenant_primary: modules,
  tenant_roommate: modules,
  tenant_guest: modules,
};

const standardLayouts: StandardLayoutsDef = {
  tenant_primary: { overview: overviewLayout },
  tenant_roommate: { overview: overviewLayout },
  tenant_guest: { overview: overviewLayout },
};

const roleLabels: Record<(typeof roleOptions)[number], string> = {
  tenant_primary: "Primary Resident",
  tenant_roommate: "Roommate",
  tenant_guest: "Guest",
};

const roleDisplayNames: Record<(typeof roleOptions)[number], string> = {
  tenant_primary: "Taylor Johnson",
  tenant_roommate: "Morgan Lee",
  tenant_guest: "Casey Smith",
};

function isRoleOption(value: string): value is RoleOption {
  return roleOptions.includes(value as RoleOption);
}

export function UserDashboardClient() {
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
      name: roleDisplayNames[role] ?? "BridgeWorks Resident",
      roleLabel: roleLabels[role] ?? "Resident",
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
