export const ORG_STATUSES = ["active", "suspended"] as const;

export const HEALTH_STATUSES = ["healthy", "degraded", "down"] as const;

export const ORG_STATUS_LABELS: Record<(typeof ORG_STATUSES)[number], string> = {
  active: "Active",
  suspended: "Suspended",
};

export const HEALTH_STATUS_LABELS: Record<
  (typeof HEALTH_STATUSES)[number],
  string
> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
};
