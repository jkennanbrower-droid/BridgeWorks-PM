"use client";

import { useEffect, useMemo, useState } from "react";

import type { ModuleDef, ModuleLayout, StandardLayoutsDef } from "ui";
import {
  DashboardApp,
  ensureDemoSession,
  getDemoSession,
  setActiveDemoUserRole,
} from "ui";

const appId = "org";
const roleOptions = ["org_owner", "org_admin", "org_accountant"] as const;
type RoleOption = (typeof roleOptions)[number];
// TODO: Real permissions will replace demo SUPER logic.

const modules: ModuleDef[] = [
  { id: "overview", label: "Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "performance", label: "Performance" },
  { id: "approvals", label: "Approvals" },
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
  org_owner: modules,
  org_admin: modules,
  org_accountant: modules,
};

const standardLayouts: StandardLayoutsDef = {
  org_owner: { overview: overviewLayout },
  org_admin: { overview: overviewLayout },
  org_accountant: { overview: overviewLayout },
};

const roleLabels: Record<(typeof roleOptions)[number], string> = {
  org_owner: "Organization Owner",
  org_admin: "Organization Admin",
  org_accountant: "Organization Accountant",
};

const roleDisplayNames: Record<(typeof roleOptions)[number], string> = {
  org_owner: "Riley Thompson",
  org_admin: "Alex Martinez",
  org_accountant: "Jamie Nguyen",
};

function isRoleOption(value: string): value is RoleOption {
  return roleOptions.includes(value as RoleOption);
}

export function OrgDashboardClient() {
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
      name: roleDisplayNames[role] ?? "BridgeWorks Org User",
      roleLabel: roleLabels[role] ?? "Organization",
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
