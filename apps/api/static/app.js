/* global window, document */

const REFRESH_INTERVAL_MS = 30_000;
const OK_MS = 800;
const WARN_MS = 2000;

function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function fmtMs(value) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(value)) return "—";
  return `${Math.round(value)}ms`;
}

function fmtUptime(sec) {
  if (!sec && sec !== 0) return "—";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

function badgeClass(ok, latencyMs) {
  if (!ok) return "bad";
  if (latencyMs <= OK_MS) return "ok";
  if (latencyMs <= WARN_MS) return "warn";
  return "bad";
}

function mkBadge(label, cls) {
  const span = document.createElement("span");
  span.className = `badge ${cls}`;
  span.textContent = label;
  return span;
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderChecks(data) {
  const tbody = qs("checksBody");
  tbody.innerHTML = "";

  const rows = [];

  const apiCheck = {
    name: "API process",
    ok: Boolean(data?.api?.ok),
    status: data?.api?.ok ? 200 : 503,
    latencyMs: null,
    details: data?.api,
  };
  rows.push(apiCheck);

  const db = data?.db || {};
  rows.push({
    name: "Database (direct query)",
    ok: Boolean(db.ok),
    status: db.ok ? 200 : 503,
    latencyMs: db.latencyMs ?? null,
    details: db,
  });

  for (const svc of data?.services || []) {
    rows.push({
      name: svc.name,
      ok: Boolean(svc.ok),
      status: svc.status ?? 0,
      latencyMs: svc.latencyMs ?? null,
      details: svc,
    });
  }

  for (const r of rows) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = r.name;

    const tdStatus = document.createElement("td");
    const cls = badgeClass(r.ok, r.latencyMs ?? 0);
    tdStatus.appendChild(mkBadge(r.ok ? "OK" : "DOWN", cls));

    const tdHttp = document.createElement("td");
    tdHttp.className = "mono";
    tdHttp.textContent = r.status ? String(r.status) : "—";

    const tdLatency = document.createElement("td");
    tdLatency.className = "mono";
    tdLatency.textContent = fmtMs(r.latencyMs);

    const tdDetails = document.createElement("td");
    const details = document.createElement("details");
    details.className = "details";
    const summary = document.createElement("summary");
    summary.textContent = "View";
    const pre = document.createElement("pre");
    pre.textContent = safeJson(r.details);
    details.appendChild(summary);
    details.appendChild(pre);
    tdDetails.appendChild(details);

    tr.appendChild(tdName);
    tr.appendChild(tdStatus);
    tr.appendChild(tdHttp);
    tr.appendChild(tdLatency);
    tr.appendChild(tdDetails);
    tbody.appendChild(tr);
  }
}

async function refresh() {
  const started = performance.now();
  qs("refreshBtn").disabled = true;
  try {
    const res = await fetch("/ops/status", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    qs("rawOut").textContent = safeJson(json);

    const api = json?.api || {};
    qs("apiHost").textContent = window.location.host;
    qs("lastUpdated").textContent = json?.api?.timestamp || new Date().toISOString();

    const ok = Boolean(api.ok);
    const apiBadge = qs("apiBadge");
    apiBadge.className = `badge ${ok ? "ok" : "bad"}`;
    apiBadge.textContent = ok ? "OK" : "DOWN";

    qs("uptime").textContent = fmtUptime(api.uptimeSec);
    qs("nodeVersion").textContent = api.nodeVersion || "—";
    qs("pid").textContent = api.pid ? String(api.pid) : "—";
    qs("hostname").textContent = api.hostname || "—";
    qs("buildSha").textContent = api.buildSha || "—";

    renderChecks(json);
  } catch (e) {
    qs("rawOut").textContent = safeJson({ ok: false, error: String(e) });
    renderChecks({ api: { ok: false }, db: { ok: false, error: String(e) }, services: [] });
  } finally {
    qs("refreshBtn").disabled = false;
    const elapsed = performance.now() - started;
    qs("refreshBtn").textContent = `Refresh (${Math.round(elapsed)}ms)`;
    window.setTimeout(() => {
      qs("refreshBtn").textContent = "Refresh";
    }, 1200);
  }
}

async function runCacheTest() {
  const out = qs("cacheTestOut");
  out.textContent = "Running…";
  try {
    const first = await fetch("/cache-test", { cache: "no-store" });
    const firstJson = await first.json().catch(() => null);
    const etag = first.headers.get("etag");

    const second = await fetch("/cache-test", {
      cache: "no-store",
      headers: etag ? { "If-None-Match": etag } : {},
    });
    const secondJson = second.status === 304 ? null : await second.json().catch(() => null);

    const result = {
      first: {
        status: first.status,
        cacheControl: first.headers.get("cache-control"),
        etag: etag,
        age: first.headers.get("age"),
        body: firstJson,
      },
      second: {
        status: second.status,
        cacheControl: second.headers.get("cache-control"),
        etag: second.headers.get("etag"),
        age: second.headers.get("age"),
        body: secondJson,
      },
    };
    out.textContent = safeJson(result);
  } catch (e) {
    out.textContent = safeJson({ ok: false, error: String(e) });
  }
}

let intervalId = null;

function setAutoRefresh(enabled) {
  if (intervalId) window.clearInterval(intervalId);
  intervalId = null;
  if (!enabled) return;
  intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
}

qs("refreshBtn").addEventListener("click", () => refresh());
qs("cacheTestBtn").addEventListener("click", () => runCacheTest());
qs("autoRefresh").addEventListener("change", (e) => setAutoRefresh(Boolean(e.target.checked)));

setAutoRefresh(true);
refresh();

