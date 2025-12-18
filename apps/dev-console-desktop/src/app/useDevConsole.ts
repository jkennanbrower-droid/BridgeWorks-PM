import { useCallback, useMemo, useRef, useState } from "react";
import type { AppConfig, AppMeta, AuditEntry, HealthRow, RenderSelection, RenderService, RenderServiceStatus } from "../types";
import { requireBw } from "../bw";
import { nowHHMMSS } from "./utils";

export type ServiceKey = keyof RenderSelection;

export function healthNameForService(key: ServiceKey) {
  if (key === "public") return "Public (landing) /api/health";
  if (key === "user") return "User /api/health";
  if (key === "staff") return "Staff /api/health";
  return "API /health";
}

export function useDevConsole() {
  const bw = useMemo(() => requireBw(), []);

  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [healthRows, setHealthRows] = useState<HealthRow[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<Record<string, number[]>>({});
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("-");
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPath, setAuditPath] = useState<string>("");

  const [services, setServices] = useState<RenderService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [statusById, setStatusById] = useState<Record<string, RenderServiceStatus>>({});

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const pollInFlight = useRef(false);

  const selection = config?.render.selection;
  const overviewKeys: ServiceKey[] = ["public", "user", "staff", "api"];

  const selectedServiceIds = useMemo(() => {
    const sel = selection || ({} as RenderSelection);
    const ordered = [sel.public, sel.user, sel.staff, sel.api].filter(Boolean);
    return Array.from(new Set(ordered));
  }, [selection]);

  const loadMeta = useCallback(async () => {
    const m = await bw.app.meta();
    setMeta(m);
    return m;
  }, [bw]);

  const loadAudit = useCallback(async () => {
    const [p, r] = await Promise.all([bw.audit.path(), bw.audit.recent({ limit: 10 })]);
    setAuditPath(p.path);
    setAudit(r.entries || []);
    return r.entries || [];
  }, [bw]);

  const refreshHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const res = await bw.health.checkAll();
      setConfig(res.config);
      setHealthRows(res.results);
      setLastRefreshAt(nowHHMMSS());

      setLatencyHistory((prev) => {
        const next = { ...prev };
        for (const row of res.results) {
          const arr = next[row.name] ? [...next[row.name]] : [];
          arr.push(Number(row.ms) || 0);
          next[row.name] = arr.slice(-30);
        }
        return next;
      });

      return res;
    } finally {
      setLoadingHealth(false);
    }
  }, [bw]);

  const refreshStatuses = useCallback(
    async (serviceIds: string[]) => {
      if (!serviceIds.length) return;
      const entries = await Promise.all(
        serviceIds.map(async (serviceId) => {
          const s = await bw.render.serviceStatus({ serviceId });
          return [serviceId, s] as const;
        })
      );
      setStatusById((prev) => {
        const next = { ...prev };
        for (const [id, s] of entries) next[id] = s;
        return next;
      });
    },
    [bw]
  );

  const refreshAll = useCallback(async () => {
    const res = await refreshHealth();
    if (res.config.render.apiKeyConfigured) await refreshStatuses(selectedServiceIds);
    await loadAudit();
    return res;
  }, [loadAudit, refreshHealth, refreshStatuses, selectedServiceIds]);

  const loadRenderServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const list = await bw.render.listServices();
      setServices(list);
      return list;
    } finally {
      setLoadingServices(false);
    }
  }, [bw]);

  const saveSelection = useCallback(
    async (serviceKey: ServiceKey, serviceId: string) => {
      const selectionPatch = { [serviceKey]: serviceId } as Partial<RenderSelection>;
      const next = await bw.config.set({ render: { selection: selectionPatch } });
      setConfig(next);
      if (serviceId) await refreshStatuses([serviceId]);
      return next;
    },
    [bw, refreshStatuses]
  );

  return {
    bw,
    meta,
    config,
    selection,
    overviewKeys,
    selectedServiceIds,
    healthRows,
    latencyHistory,
    lastRefreshAt,
    loadingHealth,
    audit,
    auditPath,
    services,
    loadingServices,
    statusById,
    busyKey,
    setBusyKey,
    pollInFlight,
    loadMeta,
    loadAudit,
    refreshHealth,
    refreshStatuses,
    refreshAll,
    loadRenderServices,
    saveSelection,
    setConfig
  };
}

export type DevConsoleModel = ReturnType<typeof useDevConsole>;
