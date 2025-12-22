import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  Globe,
  Monitor,
  ShieldCheck,
  Users,
} from "lucide-react";

export const SERVICE_KEYS = [
  "PUBLIC",
  "USER",
  "STAFF",
  "ORG",
  "API",
  "CONSOLE",
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];

export type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

export type ServiceDefinition = {
  key: ServiceKey;
  label: string;
  opsNames: string[];
  icon: LucideIcon;
};

export const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { key: "PUBLIC", label: "Public", opsNames: ["Public"], icon: Globe },
  { key: "USER", label: "User", opsNames: ["User"], icon: Users },
  { key: "STAFF", label: "Staff", opsNames: ["Staff"], icon: ShieldCheck },
  { key: "ORG", label: "Org", opsNames: ["Org"], icon: Building2 },
  { key: "API", label: "API", opsNames: ["API /health", "API root"], icon: Activity },
  { key: "CONSOLE", label: "Console", opsNames: ["Console"], icon: Monitor },
];
