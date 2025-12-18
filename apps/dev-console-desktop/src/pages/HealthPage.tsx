import type { DevConsoleModel } from "../app/useDevConsole";
import { computeP95 } from "../app/utils";
import { Dot } from "../components/Dot";
import { Sparkline } from "../components/Sparkline";

const AUTO_REFRESH_OPTIONS_SEC = [0, 5, 15, 30, 60, 90, 120] as const;
export type AutoRefreshEverySec = (typeof AUTO_REFRESH_OPTIONS_SEC)[number];

export function HealthPage({
  model,
  autoRefreshSec,
  setAutoRefreshSec,
  onRefresh
}: {
  model: DevConsoleModel;
  autoRefreshSec: AutoRefreshEverySec;
  setAutoRefreshSec: (v: AutoRefreshEverySec) => void;
  onRefresh: () => void;
}) {
  const { healthRows, latencyHistory, lastRefreshAt, loadingHealth } = model;

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Health Checks</div>
          <div className="pageSubtitle">Latency trend uses the last 30 samples.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="selectInline">
            <span className="muted">Auto</span>
            <select value={autoRefreshSec} onChange={(e) => setAutoRefreshSec(Number(e.target.value) as AutoRefreshEverySec)}>
              {AUTO_REFRESH_OPTIONS_SEC.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? "Off" : `${s}s`}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btnPrimary" onClick={onRefresh} disabled={loadingHealth}>
            Refresh
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Trend</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {healthRows.map((r) => {
                const tone = r.ok ? "ok" : "bad";
                const samples = latencyHistory[r.name] || [];
                const p95 = computeP95(samples);
                return (
                  <tr key={r.name}>
                    <td className="cellTitle">{r.name}</td>
                    <td>
                      <span className={`statusChip status-${tone}`}>
                        <Dot tone={tone as any} />
                        <span>{r.ok ? "OK" : "Fail"}</span>
                      </span>
                      <div className="monoSmall muted">{lastRefreshAt}</div>
                    </td>
                    <td>
                      <div className="monoSmall">{r.ms} ms</div>
                      <div className="monoSmall muted">{p95 ? `p95 ${p95} ms` : ""}</div>
                    </td>
                    <td>
                      <Sparkline values={samples} />
                    </td>
                    <td className="monoSmall">
                      <a href={r.url} target="_blank" rel="noreferrer">
                        Open endpoint
                      </a>
                      {r.error ? <div className="err">{String(r.error)}</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

