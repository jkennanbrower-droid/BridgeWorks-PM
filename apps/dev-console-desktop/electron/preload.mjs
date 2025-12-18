import { contextBridge, ipcRenderer } from "electron";

try {
  contextBridge.exposeInMainWorld("bw", {
    // existing
    getConfig: () => ipcRenderer.invoke("config:get"),
    setConfig: (cfg) => ipcRenderer.invoke("config:set", cfg),
    checkAll: () => ipcRenderer.invoke("health:checkAll"),

    // render.com controls
    renderDeploy: (args) => ipcRenderer.invoke("render:deploy", args),
    renderSuspend: (args) => ipcRenderer.invoke("render:suspend", args),
    renderResume: (args) => ipcRenderer.invoke("render:resume", args),
  });
  console.log("✅ exposeInMainWorld succeeded");
} catch (e) {
  console.log("❌ exposeInMainWorld failed:", e);
}

console.log("✅ PRELOAD LOADED");
