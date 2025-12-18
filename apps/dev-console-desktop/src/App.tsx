import { useEffect, useState } from "react";
import "./App.css";

type Config = {
  publicBaseUrl: string;
  userBaseUrl: string;
  staffBaseUrl: string;
  apiBaseUrl: string;
  adminToken?: string;
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

export default function App() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      if (!window.bw) throw new Error("window.bw is undefined (preload not attached)");
      const data = await window.bw.checkAll();
      setCfg(data.config);
      setRows(data.results);
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

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2>BridgeWorks Dev Console</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={refresh} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </button>

        {cfg ? (
          <span style={{ opacity: 0.7 }}>
            API: {cfg.apiBaseUrl} | Staff: {cfg.staffBaseUrl}
          </span>
        ) : null}
      </div>

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
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
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
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 12, opacity: 0.7 }}>
        This app checks your public/user/staff health endpoints and the API health/ready/db-health endpoints.
      </p>
    </div>
  );
}
