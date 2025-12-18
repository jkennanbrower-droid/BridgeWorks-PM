import type { HealthRow } from "../types";

export function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export function nowHHMMSS() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function computeP95(samples: number[]) {
  if (!samples.length) return null;
  const s = [...samples].sort((a, b) => a - b);
  const idx = Math.floor((s.length - 1) * 0.95);
  return s[idx];
}

export function statusFromHealth(row?: HealthRow, p95?: number | null) {
  if (!row) return { label: "Unknown", tone: "neutral" as const };
  if (!row.ok) return { label: "Down", tone: "bad" as const };
  const latency = p95 ?? row.ms;
  if (latency >= 1500) return { label: "Degraded", tone: "warn" as const };
  return { label: "Up", tone: "ok" as const };
}

