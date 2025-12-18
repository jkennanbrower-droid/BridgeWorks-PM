import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import type { AppConfig, HealthRow, RenderSelection, RenderService, RenderServiceStatus } from "./types";
import { formatUnknownError, requireBw } from "./bw";
import { Modal } from "./ui/modal";
import { ToastHost, useToasts } from "./ui/toasts";

type ServiceKey = keyof RenderSelection;

const REFRESH_OPTIONS_SEC = [5, 15, 30, 60, 90, 120] as const;
type RefreshEverySec = (typeof REFRESH_OPTIONS_SEC)[number];

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function statusPill({ suspended }: { suspended: boolean }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid var(--border)",
        background: suspended ? "rgba(217, 119, 6, 0.10)" : "rgba(22, 163, 74, 0.10)",
        color: suspended ? "var(--warn)" : "var(--success)"
      }}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function rowToServiceKey(rowName: string): { key: ServiceKey | null; label: string } {
  if (rowName.startsWith("Public (landing)")) return { key: "public", label: "Public" };
  if (rowName.startsWith("User ")) return { key: "user", label: "User" };
  if (rowName.startsWith("Staff ")) return { key: "staff", label: "Staff" };
  if (rowName.startsWith("API /health")) return { key: "api", label: "API" };
  return { key: null, label: rowName };
}

export default function App() {
  const { toasts, push, dismiss } = useToasts();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [backgroundErr, setBackgroundErr] = useState<string | null>(null);
  const pollInFlight = useRef(false);
  const [refreshEverySec, setRefreshEverySec] = useState<RefreshEverySec>(15);

  const [services, setServices] = useState<RenderService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [statusById, setStatusById] = useState<Record<string, RenderServiceStatus>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTyped, setSuspendTyped] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<{ serviceId: string; label: string } | null>(null);

  const selection = config?.render.selection;

  const selectedServiceIds = useMemo(() => {
    const sel = selection || ({} as RenderSelection);
    const ordered = [sel.public, sel.user, sel.staff, sel.api].filter(Boolean);
    return Array.from(new Set(ordered));
  }, [selection]);

  async function refreshHealth({ showToastOnError }: { showToastOnError: boolean }) {
    setLoadingHealth(true);
    setBackgroundErr(null);
    try {
      const bw = requireBw();
      const res = await bw.health.checkAll();
      setConfig(res.config);
      setRows(res.results);
    } catch (e: unknown) {
      const msg = formatUnknownError(e);
      setBackgroundErr(msg);
      if (showToastOnError) push("error", msg);
      setRows([]);
    } finally {
      setLoadingHealth(false);
    }
  }

  async function refreshStatuses(serviceIds: string[]) {
    if (serviceIds.length === 0) return;
    try {
      const bw = requireBw();
      const entries = await Promise.all(
        serviceIds.map(async (serviceId) => {
          try {
            const s = await bw.render.serviceStatus({ serviceId });
            return [serviceId, s] as const;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return [
              serviceId,
              {
                id: serviceId,
                name: "",
                type: "web_service",
                suspended: false,
                lastDeployAt: "",
                updatedAt: ""
              } satisfies RenderServiceStatus
            ] as const;
          }
        })
      );
      setStatusById((prev) => {
        const next = { ...prev };
        for (const [id, s] of entries) next[id] = s;
        return next;
      });
    } catch (e) {
      // Background status refresh errors should not spam toasts.
      setBackgroundErr(formatUnknownError(e));
    }
  }

  async function manualRefresh() {
    await refreshHealth({ showToastOnError: true });
    if (config?.render.apiKeyConfigured) await refreshStatuses(selectedServiceIds);
  }

  useEffect(() => {
    // Initial load (avoid React StrictMode effect spam causing repeated calls).
    if (pollInFlight.current) return;
    pollInFlight.current = true;
    refreshHealth({ showToastOnError: true }).finally(() => {
      pollInFlight.current = false;
    });
  }, []);

  useEffect(() => {
    const intervalMs = refreshEverySec * 1000;
    const tick = async () => {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        await refreshHealth({ showToastOnError: false });
        if (config?.render.apiKeyConfigured) await refreshStatuses(selectedServiceIds);
      } finally {
        pollInFlight.current = false;
      }
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [config?.render.apiKeyConfigured, selectedServiceIds, refreshEverySec]);

  async function setEnv(env: AppConfig["env"]) {
    try {
      const bw = requireBw();
      const next = await bw.config.set({ env });
      setConfig(next);
      push("success", `Environment set to ${env}.`);
      await refreshHealth({ showToastOnError: true });
      if (next.render.apiKeyConfigured) await refreshStatuses(selectedServiceIds);
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function setDebug(debug: boolean) {
    try {
      const bw = requireBw();
      const next = await bw.config.set({ debug });
      setConfig(next);
      push("success", debug ? "Debug logging enabled." : "Debug logging disabled.");
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function saveSelection(serviceKey: ServiceKey, serviceId: string) {
    try {
      const bw = requireBw();
      const selectionPatch = { [serviceKey]: serviceId } as Partial<RenderSelection>;
      const next = await bw.config.set({ render: { selection: selectionPatch } });
      setConfig(next);
      push("success", "Saved Render service selection.");
      if (serviceId) await refreshStatuses([serviceId]);
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function loadRenderServices() {
    setLoadingServices(true);
    try {
      const bw = requireBw();
      const list = await bw.render.listServices();
      setServices(list);
      push("success", `Loaded ${list.length} Render services.`);
    } catch (e) {
      push("error", formatUnknownError(e));
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }

  async function doDeploy(serviceId: string, label: string) {
    const key = `deploy:${serviceId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const bw = requireBw();
      await bw.render.deploy({ serviceId, clearCache: false });
      push("success", `Deploy triggered for ${label}.`);
      await refreshStatuses([serviceId]);
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      setBusyKey(null);
    }
  }

  function openSuspend(serviceId: string, label: string) {
    setSuspendTyped("");
    setSuspendTarget({ serviceId, label });
    setSuspendOpen(true);
  }

  async function confirmSuspend() {
    const target = suspendTarget;
    if (!target) return;
    if (suspendTyped !== "SUSPEND") return;

    const key = `suspend:${target.serviceId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const bw = requireBw();
      await bw.render.suspend({ serviceId: target.serviceId });
      push("success", `Suspended ${target.label}.`);
      setSuspendOpen(false);
      await refreshStatuses([target.serviceId]);
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function doResume(serviceId: string, label: string) {
    const key = `resume:${serviceId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const bw = requireBw();
      await bw.render.resume({ serviceId });
      push("success", `Resumed ${label}.`);
      await refreshStatuses([serviceId]);
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="app">
      <ToastHost toasts={toasts} onDismiss={dismiss} />

      <div className="topbar">
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <div className="title">BridgeWorks Dev Console</div>
          <div className="subtitle">Health checks + Render controls</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label className="field">
            <span>Environment</span>
            <select
              value={config?.env || "prod"}
              onChange={(e) => setEnv(e.target.value as AppConfig["env"])}
              disabled={!config}
            >
              <option value="prod">prod</option>
              <option value="staging">staging</option>
            </select>
          </label>

          <label className="field">
            <span>Auto refresh</span>
            <select
              value={refreshEverySec}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (REFRESH_OPTIONS_SEC.includes(next as RefreshEverySec)) {
                  setRefreshEverySec(next as RefreshEverySec);
                }
              }}
              disabled={!config}
            >
              {REFRESH_OPTIONS_SEC.map((s) => (
                <option key={s} value={s}>
                  Every {s}s
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={Boolean(config?.debug)}
              onChange={(e) => setDebug(e.target.checked)}
              disabled={!config}
            />
            <span>Debug</span>
          </label>

          <button
            className="btnPrimary"
            onClick={manualRefresh}
            disabled={loadingHealth}
          >
            {loadingHealth ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="cardTitle">Render Settings</div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ opacity: 0.75 }}>API key</span>
              {config?.render.apiKeyConfigured ? (
                <span className="pill ok">Configured</span>
              ) : (
                <span className="pill warn">Missing</span>
              )}
            </div>

            <button
              className="btnPrimary"
              onClick={loadRenderServices}
              disabled={!config?.render.apiKeyConfigured || loadingServices}
            >
              {loadingServices ? "Loading services…" : "Fetch services from Render"}
            </button>

            {!config?.render.apiKeyConfigured ? (
              <div className="hint">
                Set `RENDER_API_KEY` in your environment and restart once. The main process imports it into
                OS-encrypted storage (renderer never receives it).
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
            {(["public", "user", "staff", "api"] as ServiceKey[]).map((k) => (
              <label key={k} className="fieldRow">
                <span style={{ textTransform: "capitalize" }}>{k}</span>
                <select
                  value={(selection?.[k] || "") as string}
                  onChange={(e) => saveSelection(k, e.target.value)}
                  disabled={!config?.render.apiKeyConfigured}
                >
                  <option value="">(not selected)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {config?.render.apiKeyConfigured && services.length === 0 ? (
            <div className="hint" style={{ marginTop: 10 }}>
              Fetch services to populate the dropdowns.
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="cardTitle">Health</div>
          <div className="hint">
            Health checks run from the Electron main process against the currently selected environment base URLs.
          </div>
          {backgroundErr ? (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(220, 38, 38, 0.06)",
                color: "var(--danger)",
                fontSize: 13
              }}
            >
              {backgroundErr}
            </div>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Health</th>
                  <th>Latency</th>
                  <th>URL</th>
                  <th>Render</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = rowToServiceKey(r.name);
                  const serviceKey = meta.key;
                  const label = meta.label;

                  const serviceId = serviceKey ? selection?.[serviceKey] || "" : "";
                  const renderStatus = serviceId ? statusById[serviceId] : undefined;

                  const hasKey = Boolean(config?.render.apiKeyConfigured);
                  const hasServiceSelected = Boolean(serviceId);
                  const canRender = Boolean(hasKey && hasServiceSelected);
                  const busy =
                    busyKey === `deploy:${serviceId}` ||
                    busyKey === `suspend:${serviceId}` ||
                    busyKey === `resume:${serviceId}`;

                  return (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>
                        <span className={r.ok ? "pill ok" : "pill bad"}>
                          {r.ok ? `OK (${r.status})` : `FAIL (${r.status || "no response"})`}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.ms} ms</td>
                      <td className="mono">
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.url}
                        </a>
                        {r.error ? <div className="err">{String(r.error)}</div> : null}
                      </td>
                      <td>
                        {!serviceKey ? (
                          <span style={{ opacity: 0.6 }}>n/a</span>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {renderStatus && canRender ? statusPill({ suspended: Boolean(renderStatus.suspended) }) : null}
                              <span style={{ opacity: 0.75, fontSize: 12 }}>
                                Last deploy: {renderStatus?.lastDeployAt ? fmtTime(renderStatus.lastDeployAt) : "—"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button disabled={!canRender || busy} onClick={() => doDeploy(serviceId, label)}>
                                {busyKey === `deploy:${serviceId}` ? "Deploying…" : "Deploy"}
                              </button>
                              <button
                                className="btnDanger"
                                disabled={!canRender || busy}
                                onClick={() => openSuspend(serviceId, label)}
                              >
                                {busyKey === `suspend:${serviceId}` ? "Pausing…" : "Pause"}
                              </button>
                              <button disabled={!canRender || busy} onClick={() => doResume(serviceId, label)}>
                                {busyKey === `resume:${serviceId}` ? "Resuming…" : "Resume"}
                              </button>
                            </div>

                            {!hasKey ? (
                              <div className="hint">Configure the Render API key first.</div>
                            ) : !hasServiceSelected ? (
                              <div className="hint">Select a Render service for this row.</div>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={suspendOpen}
        title={`Pause ${suspendTarget?.label || ""}`}
        onClose={() => setSuspendOpen(false)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ opacity: 0.9 }}>
            This will suspend the Render service (stop running instances and stop serving traffic). Health checks will
            likely fail until you resume it.
          </div>

          <label className="field">
            <span>Type SUSPEND to confirm</span>
            <input
              value={suspendTyped}
              onChange={(e) => setSuspendTyped(e.target.value)}
              placeholder="SUSPEND"
              autoFocus
            />
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setSuspendOpen(false)} disabled={Boolean(busyKey)}>
              Cancel
            </button>
            <button
              className="btnDanger"
              onClick={confirmSuspend}
              disabled={suspendTyped !== "SUSPEND" || Boolean(busyKey)}
            >
              {busyKey?.startsWith("suspend:") ? "Pausing…" : "Pause"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
