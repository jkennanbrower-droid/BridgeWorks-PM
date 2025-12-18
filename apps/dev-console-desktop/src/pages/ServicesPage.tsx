import type { DevConsoleModel, ServiceKey } from "../app/useDevConsole";
import { healthNameForService } from "../app/useDevConsole";
import { computeP95, fmtTime, statusFromHealth } from "../app/utils";
import { Dot } from "../components/Dot";

export function ServicesPage({
  model,
  onDeploy,
  onPause,
  onResume,
  onFetchServices,
  onRefresh
}: {
  model: DevConsoleModel;
  onDeploy: (k: ServiceKey) => void;
  onPause: (k: ServiceKey) => void;
  onResume: (k: ServiceKey) => void;
  onFetchServices: () => void;
  onRefresh: () => void;
}) {
  const { overviewKeys, selection, healthRows, latencyHistory, statusById, busyKey, loadingHealth, loadingServices, config, lastRefreshAt } =
    model;

  const healthByName = new Map(healthRows.map((r) => [r.name, r] as const));

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Services</div>
          <div className="pageSubtitle">Render service state and actions.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={onFetchServices} disabled={!config?.render.apiKeyConfigured || loadingServices}>
            {loadingServices ? "Loading..." : "Fetch services"}
          </button>
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
                <th>Current state</th>
                <th>Health</th>
                <th>Latency</th>
                <th>Deploy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overviewKeys.map((k) => {
                const serviceId = selection?.[k] || "";
                const renderStatus = serviceId ? statusById[serviceId] : undefined;
                const healthName = healthNameForService(k);
                const row = healthByName.get(healthName);
                const p95 = computeP95(latencyHistory[healthName] || []);
                const status = statusFromHealth(row, p95);

                const busy =
                  busyKey === `deploy:${serviceId}` || busyKey === `suspend:${serviceId}` || busyKey === `resume:${serviceId}`;

                const canAct = Boolean(config?.render.apiKeyConfigured && serviceId);

                return (
                  <tr key={k}>
                    <td>
                      <div className="cellTitle">{titleCase(k)}</div>
                      <div className="monoSmall muted">{serviceId || "Not mapped"}</div>
                    </td>
                    <td>{renderStatus ? (renderStatus.suspended ? "Suspended" : "Running") : "-"}</td>
                    <td>
                      <span className={`statusChip status-${status.tone}`}>
                        <Dot tone={status.tone} />
                        <span>{status.label}</span>
                      </span>
                      <div className="monoSmall muted">{row ? `Last check ${lastRefreshAt}` : ""}</div>
                    </td>
                    <td>
                      <div className="monoSmall">{row ? `${row.ms} ms` : "-"}</div>
                      <div className="monoSmall muted">{p95 ? `p95 ${p95} ms` : ""}</div>
                    </td>
                    <td className="monoSmall">{renderStatus?.lastDeployAt ? fmtTime(renderStatus.lastDeployAt) : "-"}</td>
                    <td>
                      <div className="actions">
                        <button className="btn" onClick={() => onDeploy(k)} disabled={!canAct || busy}>
                          {busyKey === `deploy:${serviceId}` ? "Deploying..." : "Deploy"}
                        </button>
                        <button className="btn btnDanger" onClick={() => onPause(k)} disabled={!canAct || busy}>
                          {busyKey === `suspend:${serviceId}` ? "Pausing..." : "Pause"}
                        </button>
                        <button className="btn" onClick={() => onResume(k)} disabled={!canAct || busy}>
                          {busyKey === `resume:${serviceId}` ? "Resuming..." : "Resume"}
                        </button>
                      </div>
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

function titleCase(key: ServiceKey) {
  return key[0].toUpperCase() + key.slice(1);
}

