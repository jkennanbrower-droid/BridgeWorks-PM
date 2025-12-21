"use client";

import React, { useMemo } from "react";

import { DashboardProvider, useDashboard } from "./DashboardProvider";
import { DashboardShell } from "./shell/DashboardShell";
import { OverviewModule } from "./modules/OverviewModule";
import { PlaceholderModule } from "./modules/PlaceholderModule";
import type {
  DashboardAppProps,
  ModuleDef,
  ModuleLayout,
  StandardLayoutsDef,
} from "./types";

function resolveOrderedModules(
  modules: ModuleDef[],
  moduleOrder: string[],
): ModuleDef[] {
  const lookup = new Map(modules.map((module) => [module.id, module]));
  const ordered = moduleOrder
    .map((id) => lookup.get(id))
    .filter((module): module is ModuleDef => Boolean(module));
  return ordered.length ? ordered : modules;
}

type DashboardContentProps = {
  profile: DashboardAppProps["profile"];
  role: string;
  roleOptions: string[];
  modules: ModuleDef[];
  standardLayouts: StandardLayoutsDef[string];
  onRoleChange?: (role: string) => void;
};

function DashboardContent({
  profile,
  role,
  roleOptions,
  modules,
  standardLayouts,
  onRoleChange,
}: DashboardContentProps) {
  const {
    state,
    setActiveModuleId,
    setModuleOrder,
    setCustomizeMode,
    setCustomLayout,
    resetCustomLayout,
  } = useDashboard();

  const orderedModules = useMemo(
    () => resolveOrderedModules(modules, state.moduleOrder),
    [modules, state.moduleOrder],
  );

  const activeModuleId = state.activeModuleId || orderedModules[0]?.id || "";
  const activeModule = orderedModules.find(
    (module) => module.id === activeModuleId,
  );
  const standardLayout = standardLayouts[activeModuleId];
  const customLayout = state.customLayouts[activeModuleId];
  const effectiveLayout: ModuleLayout =
    customLayout ?? standardLayout ?? { widgets: [] };
  const hasCustomLayout = Boolean(customLayout);

  return (
    <DashboardShell
      profile={profile}
      role={role}
      roleOptions={roleOptions}
      onRoleChange={onRoleChange}
      modules={orderedModules}
      activeModuleId={activeModuleId}
      customizeMode={state.customizeMode}
      layoutLabel={hasCustomLayout ? "My Layout" : "Standard"}
      onModuleSelect={setActiveModuleId}
      onModuleReorder={setModuleOrder}
      onCustomizeToggle={() => setCustomizeMode(!state.customizeMode)}
      onResetLayout={
        hasCustomLayout ? () => resetCustomLayout(activeModuleId) : undefined
      }
    >
      {activeModuleId === "overview" ? (
        <OverviewModule
          layout={effectiveLayout}
          customizeMode={state.customizeMode}
          onLayoutChange={(layout) =>
            setCustomLayout(activeModuleId, layout)
          }
        />
      ) : (
        <PlaceholderModule
          title={activeModule?.label ?? "Module"}
          description={activeModule?.description}
        />
      )}
    </DashboardShell>
  );
}

export function DashboardApp({
  appId,
  profile,
  role,
  roleOptions,
  modulesByRole,
  standardLayouts,
  onRoleChange,
}: DashboardAppProps) {
  const modules = useMemo(
    () => modulesByRole[role] ?? [],
    [modulesByRole, role],
  );
  const layoutsForRole = useMemo(
    () => standardLayouts[role] ?? {},
    [standardLayouts, role],
  );

  return (
    <DashboardProvider appId={appId} role={role} modules={modules}>
      <DashboardContent
        profile={profile}
        role={role}
        roleOptions={roleOptions}
        modules={modules}
        standardLayouts={layoutsForRole}
        onRoleChange={onRoleChange}
      />
    </DashboardProvider>
  );
}
