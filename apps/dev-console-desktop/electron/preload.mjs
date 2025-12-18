import { contextBridge, ipcRenderer } from "electron";

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

try {
  const api = {
    app: {
      meta: () => invoke("app:meta")
    },
    config: {
      get: () => invoke("config:get"),
      set: (next) => invoke("config:set", next)
    },
    health: {
      checkAll: () => invoke("health:checkAll")
    },
    render: {
      apiKeyConfigured: () => invoke("render:apiKeyConfigured"),
      listServices: () => invoke("render:listServices"),
      serviceStatus: (args) => invoke("render:serviceStatus", args),
      deploy: (args) => invoke("render:deploy", args),
      suspend: (args) => invoke("render:suspend", args),
      resume: (args) => invoke("render:resume", args)
    },
    audit: {
      path: () => invoke("audit:path"),
      recent: (args) => invoke("audit:recent", args)
    }
  };

  // Back-compat with the earlier API shape used by older renderer code.
  const legacy = {
    getConfig: api.config.get,
    setConfig: api.config.set,
    checkAll: api.health.checkAll,
    renderDeploy: api.render.deploy,
    renderSuspend: api.render.suspend,
    renderResume: api.render.resume
  };

  contextBridge.exposeInMainWorld("bw", { ...api, ...legacy });
  console.log("✅ exposeInMainWorld succeeded");
} catch (e) {
  console.log("❌ exposeInMainWorld failed:", e);
}

console.log("✅ PRELOAD LOADED");
