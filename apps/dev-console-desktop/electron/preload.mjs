import { contextBridge, ipcRenderer } from "electron";

try {
  contextBridge.exposeInMainWorld("bw", {
    getConfig: () => ipcRenderer.invoke("config:get"),
    setConfig: (cfg) => ipcRenderer.invoke("config:set", cfg),
    checkAll: () => ipcRenderer.invoke("health:checkAll")
  });
  console.log("✅ exposeInMainWorld succeeded");
} catch (e) {
  console.log("❌ exposeInMainWorld failed:", e);
}

console.log("✅ PRELOAD LOADED");
