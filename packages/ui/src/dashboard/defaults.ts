import type { ModuleDef } from "./types";

export function getDefaultModuleOrder(modules: ModuleDef[]): string[] {
  return modules.map((module) => module.id);
}

export function normalizeModuleOrder(
  storedOrder: string[] | undefined,
  modules: ModuleDef[],
): string[] {
  const moduleIds = modules.map((module) => module.id);
  if (!storedOrder?.length) {
    return moduleIds;
  }

  const nextOrder = storedOrder.filter((id) => moduleIds.includes(id));
  for (const id of moduleIds) {
    if (!nextOrder.includes(id)) {
      nextOrder.push(id);
    }
  }

  return nextOrder;
}

export function resolveActiveModuleId(
  storedActiveId: string | undefined,
  moduleOrder: string[],
): string {
  if (storedActiveId && moduleOrder.includes(storedActiveId)) {
    return storedActiveId;
  }

  return moduleOrder[0] ?? "";
}
