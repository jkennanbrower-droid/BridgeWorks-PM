import type { ModuleLayout } from "./types";

export type DashboardState = {
  activeModuleId: string;
  moduleOrder: string[];
  customLayouts: Record<string, ModuleLayout>;
  customizeMode: boolean;
};

export type DashboardAction =
  | { type: "hydrate"; state: DashboardState }
  | { type: "setActiveModule"; moduleId: string }
  | { type: "setModuleOrder"; moduleOrder: string[] }
  | { type: "setCustomizeMode"; value: boolean }
  | { type: "setCustomLayout"; moduleId: string; layout: ModuleLayout }
  | { type: "resetCustomLayout"; moduleId: string };

export function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "setActiveModule":
      return {
        ...state,
        activeModuleId: action.moduleId,
      };
    case "setModuleOrder":
      return {
        ...state,
        moduleOrder: action.moduleOrder,
      };
    case "setCustomizeMode":
      return {
        ...state,
        customizeMode: action.value,
      };
    case "setCustomLayout":
      return {
        ...state,
        customLayouts: {
          ...state.customLayouts,
          [action.moduleId]: action.layout,
        },
      };
    case "resetCustomLayout": {
      const { [action.moduleId]: _, ...rest } = state.customLayouts;
      return {
        ...state,
        customLayouts: rest,
      };
    }
    default:
      return state;
  }
}
