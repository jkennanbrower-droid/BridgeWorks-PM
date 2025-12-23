"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import { normalizeModuleOrder, resolveActiveModuleId } from "./defaults";
import { dashboardReducer, type DashboardState } from "./reducer";
import { ensureDemoSession } from "./demoSession";
import { loadRoleState, saveAppState, saveRoleState } from "./storage";
import type { ModuleDef, ModuleLayout } from "./types";

type DashboardProviderProps = {
  appId: string;
  role: string;
  modules: ModuleDef[];
  children: React.ReactNode;
};

type DashboardContextValue = {
  state: DashboardState;
  setActiveModuleId: (moduleId: string) => void;
  setModuleOrder: (moduleOrder: string[]) => void;
  setCustomizeMode: (value: boolean) => void;
  setCustomLayout: (moduleId: string, layout: ModuleLayout) => void;
  resetCustomLayout: (moduleId: string) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function buildState(
  appId: string,
  role: string,
  modules: ModuleDef[],
): DashboardState {
  const stored = loadRoleState(appId, role);
  const moduleOrder = normalizeModuleOrder(stored?.moduleOrder, modules);
  const activeModuleId = resolveActiveModuleId(
    stored?.activeModuleId,
    moduleOrder,
  );

  return {
    activeModuleId,
    moduleOrder,
    customLayouts: stored?.customLayouts ?? {},
    customizeMode: stored?.customizeMode ?? false,
  };
}

export function DashboardProvider({
  appId,
  role,
  modules,
  children,
}: DashboardProviderProps) {
  const initialState = useMemo(
    () => buildState(appId, role, modules),
    [appId, role, modules],
  );

  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  useEffect(() => {
    ensureDemoSession(appId);
  }, [appId]);

  useEffect(() => {
    dispatch({ type: "hydrate", state: buildState(appId, role, modules) });
    saveAppState(appId, { version: 1, activeRole: role });
  }, [appId, role, modules]);

  useEffect(() => {
    saveRoleState(appId, role, {
      version: 1,
      activeModuleId: state.activeModuleId,
      moduleOrder: state.moduleOrder,
      customLayouts: state.customLayouts,
      customizeMode: state.customizeMode,
    });
  }, [appId, role, state]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      state,
      setActiveModuleId: (moduleId) =>
        dispatch({ type: "setActiveModule", moduleId }),
      setModuleOrder: (moduleOrder) =>
        dispatch({ type: "setModuleOrder", moduleOrder }),
      setCustomizeMode: (value) =>
        dispatch({ type: "setCustomizeMode", value }),
      setCustomLayout: (moduleId, layout) =>
        dispatch({ type: "setCustomLayout", moduleId, layout }),
      resetCustomLayout: (moduleId) =>
        dispatch({ type: "resetCustomLayout", moduleId }),
    }),
    [state],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
