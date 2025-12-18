import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Store from "electron-store";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store({ name: "bridgeworks-dev-console" });

const RENDER_API_BASE = "https://api.render.com/v1";

function stripSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function getConfig() {
  return {
    publicBaseUrl: stripSlash(store.get("publicBaseUrl") || "https://www.bridgeworkspm.com"),
    userBaseUrl: stripSlash(store.get("userBaseUrl") || "https://user.bridgeworkspm.com"),
    staffBaseUrl: stripSlash(store.get("staffBaseUrl") || "https://staff.bridgeworkspm.com"),
    apiBaseUrl: stripSlash(store.get("apiBaseUrl") || "https://api.bridgeworkspm.com"),

    // Optional for future privileged admin endpoints
    adminToken: String(store.get("adminToken") || ""),

    // Render.com control
    renderApiKey: String(store.get("renderApiKey") || ""),
    renderServices: store.get("renderServices") || {
      public: "",
      user: "",
      staff: "",
      api: ""
    }
  };
}

function setConfig(next) {
  if (typeof next?.publicBaseUrl === "string") store.set("publicBaseUrl", next.publicBaseUrl);
  if (typeof next?.userBaseUrl === "string") store.set("userBaseUrl", next.userBaseUrl);
  if (typeof next?.staffBaseUrl === "string") store.set("staffBaseUrl", next.staffBaseUrl);
  if (typeof next?.apiBaseUrl === "string") store.set("apiBaseUrl", next.apiBaseUrl);
  if (typeof next?.adminToken === "string") store.set("adminToken", next.adminToken);

  if (typeof next?.renderApiKey === "string") store.set("renderApiKey", next.renderApiKey);
  if (next?.renderServices && typeof next.renderServices === "object") store.set("renderServices", next.renderServices);

  return getConfig();
}

function renderHeaders(apiKey) {
  if (!apiKey) throw new Error("Missing Render API key (renderApiKey)");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

async function renderPOST(apiKey, apiPath, body) {
  const res = await fetch(`${RENDER_API_BASE}${apiPath}`, {
    method: "POST",
    headers: renderHeaders(apiKey),
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Render ${res.status}: ${text.slice(0, 400)}`);
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function checkUrl(name, url, headers = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "GET", headers });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
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

async function checkAll() {
  const cfg = getConfig();
  const adminHeaders = cfg.adminToken ? { "X-Admin-Token": cfg.adminToken } : {};

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

  return {
    config: {
      ...cfg,
      adminToken: cfg.adminToken ? "••••••" : "",
      renderApiKey: cfg.renderApiKey ? "••••••" : ""
    },
    results
  };
}

// Render actions
ipcMain.handle("render:deploy", async (_evt, { serviceId, clearCache = false }) => {
  const { renderApiKey } = getConfig();
  if (!serviceId) throw new Error("Missing serviceId");
  return renderPOST(renderApiKey, `/services/${serviceId}/deploy`, { clearCache });
});

ipcMain.handle("render:suspend", async (_evt, { serviceId }) => {
  const { renderApiKey } = getConfig();
  if (!serviceId) throw new Error("Missing serviceId");
  return renderPOST(renderApiKey, `/services/${serviceId}/suspend`);
});

ipcMain.handle("render:resume", async (_evt, { serviceId }) => {
  const { renderApiKey } = getConfig();
  if (!serviceId) throw new Error("Missing serviceId");
  return renderPOST(renderApiKey, `/services/${serviceId}/resume`);
});

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.mjs");
  console.log("PRELOAD PATH =", preloadPath);
  console.log("PRELOAD EXISTS =", fs.existsSync(preloadPath));

  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("config:get", async () => getConfig());
ipcMain.handle("config:set", async (_evt, next) => setConfig(next));
ipcMain.handle("health:checkAll", async () => checkAll());

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
