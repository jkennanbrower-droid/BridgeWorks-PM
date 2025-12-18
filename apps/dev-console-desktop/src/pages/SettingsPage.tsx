import type { DevConsoleModel, ServiceKey } from "../app/useDevConsole";

export function SettingsPage({
  model,
  onFetchServices,
  onSaveSelection
}: {
  model: DevConsoleModel;
  onFetchServices: () => void;
  onSaveSelection: (k: ServiceKey, serviceId: string) => void;
}) {
  const { config, services, selection, loadingServices, auditPath } = model;
  const overviewKeys: ServiceKey[] = ["public", "user", "staff", "api"];

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Settings</div>
          <div className="pageSubtitle">Connections and mappings.</div>
        </div>
      </div>

      <div className="panelGrid">
        <div className="panel">
          <div className="panelTitle">Render</div>
          <div className="row">
            <span className="muted">Connection</span>
            {config?.render.apiKeyConfigured ? (
              <span className="pill pill-success">Configured</span>
            ) : (
              <span className="pill pill-warn">Not configured</span>
            )}
          </div>
          {!config?.render.apiKeyConfigured ? (
            <div className="hint" style={{ marginTop: 10 }}>
              Set <span className="monoSmall">RENDER_API_KEY</span> in your shell once, restart the app, then click Fetch services.
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn btnPrimary" onClick={onFetchServices} disabled={!config?.render.apiKeyConfigured || loadingServices}>
              {loadingServices ? "Loading..." : "Fetch services"}
            </button>
          </div>

          <div style={{ marginTop: 12 }} className="formGrid">
            {overviewKeys.map((k) => (
              <label key={k} className="fieldRow">
                <span>{titleCase(k)}</span>
                <select
                  value={(selection?.[k] || "") as string}
                  onChange={(e) => onSaveSelection(k, e.target.value)}
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
        </div>

        <div className="panel">
          <div className="panelTitle">Security</div>
          <div className="row">
            <span className="muted">Audit log</span>
            <span className="monoSmall">{auditPath || "-"}</span>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            Deploy/pause/resume actions are appended locally (JSONL).
          </div>
        </div>
      </div>
    </div>
  );
}

function titleCase(key: ServiceKey) {
  return key[0].toUpperCase() + key.slice(1);
}

