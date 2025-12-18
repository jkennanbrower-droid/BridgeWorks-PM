import { useEffect, useMemo, useState } from "react";
import type { RenderSelection } from "../types";
import { formatUnknownError } from "../bw";
import { ToastHost, useToasts } from "../ui/toasts";
import { Modal } from "../ui/modal";
import { EnvPill } from "../components/EnvPill";
import { NAV_ITEMS, type RouteKey } from "./routes";
import { cx } from "./utils";
import { useDevConsole, type ServiceKey } from "./useDevConsole";
import { OverviewPage } from "../pages/OverviewPage";
import { ServicesPage } from "../pages/ServicesPage";
import { HealthPage, type AutoRefreshEverySec } from "../pages/HealthPage";
import { SettingsPage } from "../pages/SettingsPage";
import { AuditPage } from "../pages/AuditPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

const AUTO_REFRESH_OPTIONS_SEC = [0, 5, 15, 30, 60, 90, 120] as const;

export function AppShell() {
  const { toasts, push, dismiss } = useToasts();
  const model = useDevConsole();

  const [route, setRoute] = useState<RouteKey>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<AutoRefreshEverySec>(0);

  const env = model.config?.env || "prod";

  const [deployOpen, setDeployOpen] = useState(false);
  const [deployServiceKey, setDeployServiceKey] = useState<ServiceKey>("public");
  const [deployClearCache, setDeployClearCache] = useState(false);
  const [deployProdConfirm, setDeployProdConfirm] = useState(false);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseTyped, setPauseTyped] = useState("");
  const [pauseServiceKey, setPauseServiceKey] = useState<ServiceKey>("public");

  const serviceIdForKey = useMemo(() => {
    const sel = model.selection || ({} as RenderSelection);
    return (k: ServiceKey) => sel[k] || "";
  }, [model.selection]);

  async function switchEnv() {
    try {
      const nextEnv = env === "prod" ? "staging" : "prod";
      const next = await model.bw.config.set({ env: nextEnv });
      model.setConfig(next);
      push("success", `Environment set to ${nextEnv === "prod" ? "Production" : "Staging"}.`);
      await safeRefreshAll();
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function safeRefreshAll() {
    try {
      await model.refreshAll();
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function safeFetchServices() {
    try {
      await model.loadRenderServices();
      push("success", "Fetched services from Render.");
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  async function safeSaveSelection(k: ServiceKey, serviceId: string) {
    try {
      await model.saveSelection(k, serviceId);
      push("success", "Saved service mapping.");
    } catch (e) {
      push("error", formatUnknownError(e));
    }
  }

  function openDeploy(k: ServiceKey) {
    setDeployServiceKey(k);
    setDeployClearCache(false);
    setDeployProdConfirm(false);
    setDeployOpen(true);
  }

  async function confirmDeploy() {
    const serviceId = serviceIdForKey(deployServiceKey);
    if (!serviceId) return;
    if (env === "prod" && !deployProdConfirm) return;

    const key = `deploy:${serviceId}`;
    if (model.busyKey) return;
    model.setBusyKey(key);
    try {
      const res = await model.bw.render.deploy({ serviceId, clearCache: deployClearCache });
      push("success", `Deploy requested. ${res.requestId}`);
      setDeployOpen(false);
      await model.refreshStatuses([serviceId]);
      await model.loadAudit();
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      model.setBusyKey(null);
    }
  }

  function openPause(k: ServiceKey) {
    setPauseServiceKey(k);
    setPauseTyped("");
    setPauseOpen(true);
  }

  async function confirmPause() {
    if (pauseTyped !== "SUSPEND") return;
    const serviceId = serviceIdForKey(pauseServiceKey);
    if (!serviceId) return;

    const key = `suspend:${serviceId}`;
    if (model.busyKey) return;
    model.setBusyKey(key);
    try {
      const res = await model.bw.render.suspend({ serviceId });
      push("success", `Paused. ${res.requestId}`);
      setPauseOpen(false);
      await model.refreshStatuses([serviceId]);
      await model.loadAudit();
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      model.setBusyKey(null);
    }
  }

  async function resume(k: ServiceKey) {
    const serviceId = serviceIdForKey(k);
    if (!serviceId) return;
    const key = `resume:${serviceId}`;
    if (model.busyKey) return;
    model.setBusyKey(key);
    try {
      const res = await model.bw.render.resume({ serviceId });
      push("success", `Resumed. ${res.requestId}`);
      await model.refreshStatuses([serviceId]);
      await model.loadAudit();
    } catch (e) {
      push("error", formatUnknownError(e));
    } finally {
      model.setBusyKey(null);
    }
  }

  useEffect(() => {
    model.loadMeta().catch(() => {});
    safeRefreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefreshSec) return;
    const ms = autoRefreshSec * 1000;
    const id = window.setInterval(async () => {
      if (model.pollInFlight.current) return;
      model.pollInFlight.current = true;
      try {
        await model.refreshAll();
      } catch {
        // quiet in background
      } finally {
        model.pollInFlight.current = false;
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [autoRefreshSec, model.pollInFlight, model.refreshAll]);

  return (
    <div className="shell">
      <ToastHost toasts={toasts} onDismiss={dismiss} />

      <header className="topbar">
        <div className="topLeft">BridgeWorks Dev Console</div>
        <div className="topCenter">
          <button className="envBtn" onClick={switchEnv} disabled={!model.config}>
            <EnvPill env={env} />
          </button>
        </div>
        <div className="topRight">
          <div className="topMeta">
            <div className="muted">Last refresh</div>
            <div className="monoSmall">{model.lastRefreshAt}</div>
          </div>
          <button className="btn btnPrimary" onClick={safeRefreshAll} disabled={model.loadingHealth}>
            Refresh
          </button>
          <button className="btn" onClick={() => setRoute("settings")}>
            Settings
          </button>
        </div>
      </header>

      <div className={cx("body", sidebarCollapsed && "bodyCollapsed")}>
        <aside className={cx("sidebar", sidebarCollapsed && "sidebarCollapsed")}>
          <div className="sidebarTop">
            <button className="btn btnSmall" onClick={() => setSidebarCollapsed((v) => !v)}>
              {sidebarCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          <nav className="nav">
            {NAV_ITEMS.map((n) => (
              <button key={n.key} className={cx("navItem", route === n.key && "navItemActive")} onClick={() => setRoute(n.key)}>
                <span className="navLabel">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebarFooter monoSmall muted">
            {model.meta ? `v${model.meta.version}${model.meta.commit ? ` • ${model.meta.commit}` : ""}` : "v-"}
          </div>
        </aside>

        <main className="content">
          {route === "overview" ? <OverviewPage model={model} /> : null}
          {route === "services" ? (
            <ServicesPage
              model={model}
              onDeploy={openDeploy}
              onPause={openPause}
              onResume={resume}
              onFetchServices={safeFetchServices}
              onRefresh={safeRefreshAll}
            />
          ) : null}
          {route === "health" ? (
            <HealthPage model={model} autoRefreshSec={autoRefreshSec} setAutoRefreshSec={setAutoRefreshSec} onRefresh={safeRefreshAll} />
          ) : null}
          {route === "settings" ? (
            <SettingsPage model={model} onFetchServices={safeFetchServices} onSaveSelection={safeSaveSelection} />
          ) : null}
          {route === "audit" ? <AuditPage model={model} onRefresh={model.loadAudit} /> : null}
          {route === "deployments" ? <PlaceholderPage title="Deployments" /> : null}
          {route === "links" ? <PlaceholderPage title="Logs & Links" /> : null}
        </main>
      </div>

      <Modal open={deployOpen} title="Deploy" onClose={() => setDeployOpen(false)}>
        <div style={{ display: "grid", gap: 12 }}>
          <label className="fieldRow">
            <span>Service</span>
            <select value={deployServiceKey} onChange={(e) => setDeployServiceKey(e.target.value as ServiceKey)}>
              {model.overviewKeys.map((k) => (
                <option key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="row" style={{ alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={deployClearCache} onChange={(e) => setDeployClearCache(e.target.checked)} />
            <span>Clear cache</span>
          </label>

          {env === "prod" ? (
            <label className="row" style={{ alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={deployProdConfirm} onChange={(e) => setDeployProdConfirm(e.target.checked)} />
              <span>I understand this deploys Production</span>
            </label>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn" onClick={() => setDeployOpen(false)} disabled={Boolean(model.busyKey)}>
              Cancel
            </button>
            <button className="btn btnPrimary" onClick={confirmDeploy} disabled={Boolean(model.busyKey) || (env === "prod" && !deployProdConfirm)}>
              {model.busyKey?.startsWith("deploy:") ? "Deploying..." : "Deploy"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={pauseOpen} title={`Pause ${pauseServiceKey}`} onClose={() => setPauseOpen(false)}>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="hint">
            This will suspend the Render service in <strong>{env === "prod" ? "Production" : "Staging"}</strong>. Traffic will stop and health checks
            will likely fail until you resume.
          </div>
          <label className="fieldRow">
            <span>Type SUSPEND to confirm</span>
            <input value={pauseTyped} onChange={(e) => setPauseTyped(e.target.value)} placeholder="SUSPEND" autoFocus />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn" onClick={() => setPauseOpen(false)} disabled={Boolean(model.busyKey)}>
              Cancel
            </button>
            <button className="btn btnDanger" onClick={confirmPause} disabled={pauseTyped !== "SUSPEND" || Boolean(model.busyKey)}>
              {model.busyKey?.startsWith("suspend:") ? "Pausing..." : "Pause"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
