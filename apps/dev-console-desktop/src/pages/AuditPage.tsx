import type { DevConsoleModel } from "../app/useDevConsole";
import { fmtTime } from "../app/utils";
import { Dot } from "../components/Dot";
import { EmptyState } from "../components/EmptyState";

export function AuditPage({ model, onRefresh }: { model: DevConsoleModel; onRefresh: () => void }) {
  const { audit } = model;

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Audit Trail</div>
          <div className="pageSubtitle">Last 10 actions (local).</div>
        </div>
        <button className="btn btnPrimary" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="panel">
        {audit.length === 0 ? (
          <EmptyState title="No entries" body="Perform a deploy/pause/resume to populate the audit log." />
        ) : (
          <div className="list">
            {audit.map((a, idx) => (
              <div key={`${a.ts}-${idx}`} className="listRow">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot tone={a.ok ? "ok" : "bad"} />
                  <div>
                    <div className="cellTitle">{a.action}</div>
                    <div className="monoSmall muted">
                      {a.ts ? fmtTime(a.ts) : "-"} {a.serviceId ? ` • ${a.serviceId}` : ""}
                    </div>
                    {a.error ? <div className="err">{a.error}</div> : null}
                  </div>
                </div>
                <div className="monoSmall muted">{a.requestId || ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

