import { app, ipcMain } from "electron";
import { getConfigInternal, getConfigPublic, setConfigPartial } from "./lib/config.mjs";
import { hasRenderApiKey, getRenderApiKey } from "./lib/secrets.mjs";
import { appendAudit, getAuditPath, readRecentAudit } from "./lib/audit.mjs";
import { checkAll as checkAllHealth } from "./lib/health.mjs";
import {
  deployService,
  suspendService,
  resumeService,
  listAllServices,
  getService,
  listDeploys
} from "./lib/renderClient.mjs";
import childProcess from "node:child_process";

const ACTION_COOLDOWN_MS = 3_000;
const lastActionAt = new Map();

function makeRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

function rateLimit(action, serviceId) {
  const key = `${action}:${serviceId || ""}`;
  const now = Date.now();
  const last = lastActionAt.get(key) || 0;
  if (now - last < ACTION_COOLDOWN_MS) {
    throw new Error(`Please wait before retrying (${action}).`);
  }
  lastActionAt.set(key, now);
}

function normalizeService(item) {
  const s = item?.service ?? item ?? {};
  return {
    id: String(s.id || ""),
    name: String(s.name || ""),
    type: String(s.type || ""),
    suspended: Boolean(s.suspended || false),
    updatedAt: s.updatedAt ? String(s.updatedAt) : ""
  };
}

function requireRenderApiKey() {
  if (!hasRenderApiKey()) {
    throw new Error(
      "Render API key not configured. Set RENDER_API_KEY in your environment once to import it securely."
    );
  }
  return getRenderApiKey();
}

async function audited({ requestId, action, serviceId, ok, error }) {
  const entry = {
    ts: new Date().toISOString(),
    requestId: requestId || "",
    action,
    serviceId: serviceId || "",
    ok: Boolean(ok),
    error: error ? String(error) : ""
  };
  try {
    await appendAudit(entry);
  } catch {
    // avoid breaking the UI on audit write failures
  }
}

function tryGetGitCommit() {
  try {
    const out = childProcess.execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"]
    });
    return String(out).trim();
  } catch {
    return "";
  }
}

export function registerIpcHandlers() {
  ipcMain.handle("app:meta", async () => {
    return {
      version: app.getVersion(),
      commit: process.env.GIT_COMMIT || tryGetGitCommit()
    };
  });

  ipcMain.handle("audit:path", async () => {
    return { path: getAuditPath() };
  });

  ipcMain.handle("audit:recent", async (_evt, { limit = 10 } = {}) => {
    const entries = await readRecentAudit({ limit });
    return { entries };
  });

  ipcMain.handle("config:get", async () => {
    return getConfigPublic({ renderApiKeyConfigured: hasRenderApiKey() });
  });

  ipcMain.handle("config:set", async (_evt, next) => {
    setConfigPartial(next);
    return getConfigPublic({ renderApiKeyConfigured: hasRenderApiKey() });
  });

  ipcMain.handle("health:checkAll", async () => {
    const cfg = getConfigInternal();
    const envUrls = cfg.environments[cfg.env];
    const results = await checkAllHealth({ envUrls, adminToken: cfg.adminToken });
    return { config: getConfigPublic({ renderApiKeyConfigured: hasRenderApiKey() }), results };
  });

  ipcMain.handle("render:apiKeyConfigured", async () => {
    return { configured: hasRenderApiKey() };
  });

  ipcMain.handle("render:listServices", async () => {
    const apiKey = requireRenderApiKey();
    const items = await listAllServices(apiKey);
    const services = items.map(normalizeService).filter((s) => s.id && s.name);
    // Keep only the service types you care about for this app.
    return services.filter((s) => s.type === "web_service");
  });

  ipcMain.handle("render:serviceStatus", async (_evt, { serviceId }) => {
    const apiKey = requireRenderApiKey();
    const raw = await getService(apiKey, serviceId);
    const service = normalizeService(raw);

    let lastDeployAt = "";
    try {
      const deploys = await listDeploys(apiKey, serviceId, { limit: 1 });
      const d0 = Array.isArray(deploys) ? deploys[0] : null;
      // Render deploy objects vary slightly; try a few common fields.
      lastDeployAt = String(d0?.createdAt || d0?.deploy?.createdAt || "");
    } catch {
      // ignore deploy fetch issues for status view
    }

    return {
      ...service,
      lastDeployAt
    };
  });

  ipcMain.handle("render:deploy", async (_evt, { serviceId, clearCache = false }) => {
    const requestId = makeRequestId();
    rateLimit("deploy", serviceId);
    const apiKey = requireRenderApiKey();
    try {
      const res = await deployService(apiKey, { serviceId, clearCache });
      await audited({ requestId, action: "render.deploy", serviceId, ok: true });
      return { requestId, data: res };
    } catch (e) {
      await audited({ requestId, action: "render.deploy", serviceId, ok: false, error: e });
      throw new Error(`[${requestId}] ${String(e?.message || e)}`);
    }
  });

  ipcMain.handle("render:suspend", async (_evt, { serviceId }) => {
    const requestId = makeRequestId();
    rateLimit("suspend", serviceId);
    const apiKey = requireRenderApiKey();
    try {
      const res = await suspendService(apiKey, { serviceId });
      await audited({ requestId, action: "render.suspend", serviceId, ok: true });
      return { requestId, data: res };
    } catch (e) {
      await audited({ requestId, action: "render.suspend", serviceId, ok: false, error: e });
      throw new Error(`[${requestId}] ${String(e?.message || e)}`);
    }
  });

  ipcMain.handle("render:resume", async (_evt, { serviceId }) => {
    const requestId = makeRequestId();
    rateLimit("resume", serviceId);
    const apiKey = requireRenderApiKey();
    try {
      const res = await resumeService(apiKey, { serviceId });
      await audited({ requestId, action: "render.resume", serviceId, ok: true });
      return { requestId, data: res };
    } catch (e) {
      await audited({ requestId, action: "render.resume", serviceId, ok: false, error: e });
      throw new Error(`[${requestId}] ${String(e?.message || e)}`);
    }
  });
}
