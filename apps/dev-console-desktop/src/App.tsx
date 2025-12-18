import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { AppConfig, HealthRow, RenderSelection, RenderService, RenderServiceStatus } from "./types";
import { formatUnknownError, requireBw } from "./bw";
import { Modal } from "./ui/modal";
import { ToastHost, useToasts } from "./ui/toasts";

type ServiceKey = keyof RenderSelection;

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
        border: "1px solid rgba(255,255,255,0.10)",
        background: suspended ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
        color: suspended ? "rgba(251, 191, 36, 0.95)" : "rgba(52, 211, 153, 0.95)"
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

  const [services, setServices] = useState<RenderService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [statusById, setStatusById] = useState<Record<string, RenderServiceStatus>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTyped, setSuspendTyped] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<{ serviceId: string; label: string } | null>(null);

  const selection = config?.render.selection;

  const selectedServiceIds = useMemo(() => {
    const ids = Object.values(selection || {}).filter(Boolean);
    return Array.from(new Set(ids));
  }, [selection]);

  async function refreshHealth() {
    setLoadingHealth(true);
    try {
      const bw = requireBw();
      const res = await bw.health.checkAll();
      setConfig(res.config);
      setRows(res.results);
    } catch (e: unknown) {
      push("error", formatUnknownError(e));
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
      push("error", formatUnknownError(e));
    }
  }

  async function refreshAll() {
    await refreshHealth();
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!config?.render.apiKeyConfigured) return;
    refreshStatuses(selectedServiceIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.render.apiKeyConfigured, selectedServiceIds.join("|")]);

  async function setEnv(env: AppConfig["env"]) {
    try {
      const bw = requireBw();
      const next = await bw.config.set({ env });
      setConfig(next);
      push("success", `Environment set to ${env}.`);
      await refreshHealth();
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

  async function saveSelection(nextSelection: Partial<RenderSelection>) {
    try {
      const bw = requireBw();
      const next = await bw.config.set({ render: { selection: nextSelection } });
      setConfig(next);
      push("success", "Saved Render service selection.");
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

          <label className="field" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={Boolean(config?.debug)}
              onChange={(e) => setDebug(e.target.checked)}
              disabled={!config}
            />
            <span>Debug</span>
          </label>

          <button onClick={refreshAll} disabled={loadingHealth}>
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

            <button onClick={loadRenderServices} disabled={!config?.render.apiKeyConfigured || loadingServices}>
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
                  onChange={(e) => saveSelection({ [k]: e.target.value } as any)}
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

                  const canRender = Boolean(config?.render.apiKeyConfigured && serviceId);
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
                        ) : !config?.render.apiKeyConfigured ? (
                          <span style={{ opacity: 0.7 }}>Configure API key</span>
                        ) : !serviceId ? (
                          <span style={{ opacity: 0.7 }}>Select service</span>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {renderStatus ? statusPill({ suspended: Boolean(renderStatus.suspended) }) : null}
                              <span style={{ opacity: 0.75, fontSize: 12 }}>
                                Last deploy: {renderStatus?.lastDeployAt ? fmtTime(renderStatus.lastDeployAt) : "—"}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button disabled={!canRender || busy} onClick={() => doDeploy(serviceId, label)}>
                                {busyKey === `deploy:${serviceId}` ? "Deploying…" : "Deploy"}
                              </button>
                              <button
                                disabled={!canRender || busy}
                                onClick={() => openSuspend(serviceId, label)}
                                style={{ borderColor: "rgba(251, 191, 36, 0.35)" }}
                              >
                                {busyKey === `suspend:${serviceId}` ? "Pausing…" : "Pause"}
                              </button>
                              <button disabled={!canRender || busy} onClick={() => doResume(serviceId, label)}>
                                {busyKey === `resume:${serviceId}` ? "Resuming…" : "Resume"}
                              </button>
                            </div>
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
              onClick={confirmSuspend}
              disabled={suspendTyped !== "SUSPEND" || Boolean(busyKey)}
              style={{ borderColor: "rgba(239, 68, 68, 0.55)" }}
            >
              {busyKey?.startsWith("suspend:") ? "Pausing…" : "Pause"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

