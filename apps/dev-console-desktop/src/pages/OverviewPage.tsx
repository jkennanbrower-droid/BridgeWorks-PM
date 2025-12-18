import type { DevConsoleModel, ServiceKey } from "../app/useDevConsole";
import { healthNameForService } from "../app/useDevConsole";
import { computeP95, fmtTime, statusFromHealth } from "../app/utils";
import { Dot } from "../components/Dot";
import { EmptyState } from "../components/EmptyState";

export function OverviewPage({ model }: { model: DevConsoleModel }) {
  const { overviewKeys, selection, healthRows, latencyHistory, statusById, audit } = model;

  const healthByName = new Map(healthRows.map((r) => [r.name, r] as const));

  const recentActions = (audit || []).slice(0, 10);

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Overview</div>
          <div className="pageSubtitle">High level health and recent actions.</div>
        </div>
      </div>

      <div className="cards">
        {overviewKeys.map((k) => {
          const healthName = healthNameForService(k);
          const row = healthByName.get(healthName);
          const p95 = computeP95(latencyHistory[healthName] || []);
          const status = statusFromHealth(row, p95);

          const serviceId = selection?.[k] || "";
          const renderStatus = serviceId ? statusById[serviceId] : undefined;

          return (
            <div key={k} className="card">
              <div className="cardTop">
                <div className="cardTitle">{titleCase(k)}</div>
                <span className={`statusChip status-${status.tone}`}>
                  <Dot tone={status.tone} />
                  <span>{status.label}</span>
                </span>
              </div>
              <div className="kv">
                <div className="kvRow">
                  <div className="muted">Latency p95</div>
                  <div className="monoSmall">{p95 ? `${p95} ms` : row ? `${row.ms} ms` : "-"}</div>
                </div>
                <div className="kvRow">
                  <div className="muted">Last deploy</div>
                  <div className="monoSmall">{renderStatus?.lastDeployAt ? fmtTime(renderStatus.lastDeployAt) : "-"}</div>
                </div>
                <div className="kvRow">
                  <div className="muted">Region</div>
                  <div className="monoSmall">-</div>
                </div>
                <div className="kvRow">
                  <div className="muted">Version</div>
                  <div className="monoSmall">-</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panels">
        <div className="panel">
          <div className="panelTitle">Incidents</div>
          <EmptyState title="No incidents" body="When checks fail, incidents will show here." />
        </div>
        <div className="panel">
          <div className="panelTitle">Recent Actions</div>
          {recentActions.length === 0 ? (
            <EmptyState title="No recent actions" body="Deploy/pause/resume actions will appear here." />
          ) : (
            <div className="list">
              {recentActions.map((a, idx) => (
                <div key={`${a.ts}-${idx}`} className="listRow">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Dot tone={a.ok ? "ok" : "bad"} />
                    <div>
                      <div className="cellTitle">{a.action}</div>
                      <div className="monoSmall muted">
                        {a.ts ? fmtTime(a.ts) : "-"} {a.serviceId ? ` • ${a.serviceId}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="monoSmall muted">{a.requestId || ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function titleCase(key: ServiceKey) {
  return key[0].toUpperCase() + key.slice(1);
}

