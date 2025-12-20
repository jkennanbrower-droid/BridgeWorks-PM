export const PLATFORM_ROLES = [
  "founder",
  "platform_admin",
  "support_admin",
  "support_agent",
  "auditor",
] as const;

export const PERSON_STATUSES = ["active", "disabled"] as const;

export const PLATFORM_ROLE_LABELS: Record<(typeof PLATFORM_ROLES)[number], string> =
  {
    founder: "Founder",
    platform_admin: "Platform admin",
    support_admin: "Support admin",
    support_agent: "Support agent",
    auditor: "Auditor",
  };

export const PERSON_STATUS_LABELS: Record<(typeof PERSON_STATUSES)[number], string> =
  {
    active: "Active",
    disabled: "Disabled",
  };
