function stripSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

async function checkUrl(name, url, headers = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "GET", headers });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }
    return {
      name,
      url,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      body: json ?? (text ? text.slice(0, 300) : "")
    };
  } catch (e) {
    return {
      name,
      url,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: String(e)
    };
  }
}

export async function checkAll({ envUrls, adminToken }) {
  const cfg = {
    publicBaseUrl: stripSlash(envUrls.publicBaseUrl),
    userBaseUrl: stripSlash(envUrls.userBaseUrl),
    staffBaseUrl: stripSlash(envUrls.staffBaseUrl),
    apiBaseUrl: stripSlash(envUrls.apiBaseUrl)
  };

  const adminHeaders = adminToken ? { "X-Admin-Token": adminToken } : {};
  const targets = [
    { name: "Public (landing) /api/health", url: `${cfg.publicBaseUrl}/api/health` },
    { name: "User /api/health", url: `${cfg.userBaseUrl}/api/health` },
    { name: "Staff /api/health", url: `${cfg.staffBaseUrl}/api/health` },
    { name: "API /health", url: `${cfg.apiBaseUrl}/health` },
    { name: "API /ready (DB)", url: `${cfg.apiBaseUrl}/ready` },
    { name: "API /db-health", url: `${cfg.apiBaseUrl}/db-health` }
  ];

  const results = [];
  for (const t of targets) results.push(await checkUrl(t.name, t.url, adminHeaders));
  return results;
}

