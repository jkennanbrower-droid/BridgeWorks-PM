import { useEffect, useMemo, useState } from "react";
import "./App.css";

type RenderServicesMap = {
  public: string;
  user: string;
  staff: string;
  api: string;
};

type Config = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl: string;
  adminToken?: string;

  // added
  renderApiKey?: string; // masked as •••••• from main
  renderServices?: RenderServicesMap;
};

type Row = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  ms: number;
  body?: unknown;
  error?: string;
};

function formatUnknownError(e: unknown): string {
  if (e instanceof Error) return e.stack || e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function short(s: string, n = 80) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cfg, setCfg] = useState<Config | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // settings form state
  const [showSettings, setShowSettings] = useState(true);
  const [renderApiKeyInput, setRenderApiKeyInput] = useState("");
  const [renderServicesInput, setRenderServicesInput] = useState<RenderServicesMap>({
    public: "",
    user: "",
    staff: "",
    api: "",
  });

  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    setActionMsg(null);
    try {
      if (!window.bw) throw new Error("window.bw is undefined (preload not attached)");
      const data = await window.bw.checkAll();
      setCfg(data.config);
      setRows(data.results);

      // hydrate settings form with stored config (key will come back masked)
      const rs = data.config?.renderServices || { public: "", user: "", staff: "", api: "" };
      setRenderServicesInput(rs);

      // only auto-fill the api key input if user already typed it this run
      // (because the stored key is intentionally masked)
    } catch (e: unknown) {
      setErr(formatUnknownError(e));
      setCfg(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const serviceIdByRowName = useMemo(() => {
    // Map your existing row names to the config keys
    // (your checkAll() uses these exact names)
    return (rowName: string): { key: keyof RenderServicesMap | null; label: string } => {
      if (rowName.startsWith("Public (landing)")) return { key: "public", label: "Public" };
      if (rowName.startsWith("User ")) return { key: "user", label: "User" };
      if (rowName.startsWith("Staff ")) return { key: "staff", label: "Staff" };
      if (rowName.startsWith("API /health")) return { key: "api", label: "API" };
      return { key: null, label: rowName };
    };
  }, []);

  async function saveSettings() {
    setSaving(true);
    setErr(null);
    setActionMsg(null);
    try {
      if (!window.bw) throw new Error("window.bw is undefined (preload not attached)");

      // NOTE: renderApiKey is only saved if the input is non-empty.
      // This avoids overwriting a saved key with blank by accident.
      const payload: any = {
        renderServices: { ...renderServicesInput },
      };
      if (renderApiKeyInput.trim()) payload.renderApiKey = renderApiKeyInput.trim();

      await window.bw.setConfig(payload);

      setActionMsg("Saved settings.");
      setRenderApiKeyInput(""); // clear input after save
      await refresh();
    } catch (e: unknown) {
      setErr(formatUnknownError(e));
    } finally {
      setSaving(false);
    }
  }

  async function doDeploy(serviceId: string, label: string) {
    setErr(null);
    setActionMsg(null);
    setActing(`deploy:${label}`);
    try {
      await window.bw.renderDeploy({ serviceId, clearCache: false });
      setActionMsg(`Deploy triggered for ${label}.`);
      await refresh();
    } catch (e: unknown) {
      setErr(formatUnknownError(e));
    } finally {
      setActing(null);
    }
  }

  async function doSuspend(serviceId: string, label: string) {
    setErr(null);
    setActionMsg(null);
    const typed = prompt(`Type SUSPEND to pause ${label}:`);
    if (typed !== "SUSPEND") return;

    setActing(`suspend:${label}`);
    try {
      await window.bw.renderSuspend({ serviceId });
      setActionMsg(`Suspended ${label}.`);
      await refresh();
    } catch (e: unknown) {
      setErr(formatUnknownError(e));
    } finally {
      setActing(null);
    }
  }

  async function doResume(serviceId: string, label: string) {
    setErr(null);
    setActionMsg(null);
    const ok = confirm(`Resume ${label}?`);
    if (!ok) return;

    setActing(`resume:${label}`);
    try {
      await window.bw.renderResume({ serviceId });
      setActionMsg(`Resumed ${label}.`);
      await refresh();
    } catch (e: unknown) {
      setErr(formatUnknownError(e));
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2>BridgeWorks Dev Console</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={refresh} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </button>

        <button onClick={() => setShowSettings((v) => !v)}>
          {showSettings ? "Hide Settings" : "Show Settings"}
        </button>

        {cfg ? (
          <span style={{ opacity: 0.7 }}>
            API: {cfg.apiBaseUrl} | Staff: {cfg.staffBaseUrl}
          </span>
        ) : null}
      </div>

      {showSettings && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Render Settings</div>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "center" }}>
            <label>Render API Key</label>
            <input
              type="password"
              placeholder={cfg?.renderApiKey ? "Saved (hidden) — paste to change" : "Paste Render API key"}
              value={renderApiKeyInput}
              onChange={(e) => setRenderApiKeyInput(e.target.value)}
            />

            <label>Public serviceId</label>
            <input
              placeholder="srv-xxxx"
              value={renderServicesInput.public}
              onChange={(e) => setRenderServicesInput((p) => ({ ...p, public: e.target.value.trim() }))}
            />

            <label>User serviceId</label>
            <input
              placeholder="srv-xxxx"
              value={renderServicesInput.user}
              onChange={(e) => setRenderServicesInput((p) => ({ ...p, user: e.target.value.trim() }))}
            />

            <label>Staff serviceId</label>
            <input
              placeholder="srv-xxxx"
              value={renderServicesInput.staff}
              onChange={(e) => setRenderServicesInput((p) => ({ ...p, staff: e.target.value.trim() }))}
            />

            <label>API serviceId</label>
            <input
              placeholder="srv-xxxx"
              value={renderServicesInput.api}
              onChange={(e) => setRenderServicesInput((p) => ({ ...p, api: e.target.value.trim() }))}
            />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <span style={{ opacity: 0.7 }}>
              Key is only saved if you paste it (to avoid overwriting). IDs always save.
            </span>
          </div>
        </div>
      )}

      {actionMsg && (
        <div style={{ marginBottom: 12, color: "green", whiteSpace: "pre-wrap" }}>
          {actionMsg}
        </div>
      )}

      {err && (
        <div style={{ marginBottom: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Service</th>
            <th>Status</th>
            <th>Latency</th>
            <th>URL</th>
            <th>Render</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = serviceIdByRowName(r.name);
            const key = meta.key;
            const label = meta.label;

            const serviceId = key ? (cfg?.renderServices?.[key] || "") : "";
            const canControl = Boolean(serviceId && serviceId.startsWith("srv-"));

            const busy =
              acting === `deploy:${label}` ||
              acting === `suspend:${label}` ||
              acting === `resume:${label}`;

            return (
              <tr key={r.name} style={{ borderBottom: "1px solid #eee" }}>
                <td>{r.name}</td>
                <td>{r.ok ? `OK (${r.status})` : `FAIL (${r.status || "no response"})`}</td>
                <td>{r.ms} ms</td>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.url}
                  </a>
                  {r.error ? <div style={{ color: "crimson" }}>{r.error}</div> : null}
                </td>

                <td style={{ whiteSpace: "nowrap" }}>
                  {!key ? (
                    <span style={{ opacity: 0.5 }}>n/a</span>
                  ) : !canControl ? (
                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      Set serviceId ({short(serviceId || "empty")})
                    </span>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button disabled={busy} onClick={() => doDeploy(serviceId, label)}>
                        {acting === `deploy:${label}` ? "Deploying..." : "Deploy"}
                      </button>
                      <button disabled={busy} onClick={() => doSuspend(serviceId, label)}>
                        {acting === `suspend:${label}` ? "Pausing..." : "Pause"}
                      </button>
                      <button disabled={busy} onClick={() => doResume(serviceId, label)}>
                        {acting === `resume:${label}` ? "Resuming..." : "Resume"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ marginTop: 12, opacity: 0.7 }}>
        Health checks + Render controls. Add your Render API key and srv- IDs in Settings.
      </p>
    </div>
  );
}
