export type RouteKey = "overview" | "services" | "deployments" | "health" | "links" | "audit" | "settings";

export const NAV_ITEMS: Array<{ key: RouteKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "services", label: "Services" },
  { key: "deployments", label: "Deployments" },
  { key: "health", label: "Health Checks" },
  { key: "links", label: "Logs & Links" },
  { key: "audit", label: "Audit Trail" },
  { key: "settings", label: "Settings" }
];

