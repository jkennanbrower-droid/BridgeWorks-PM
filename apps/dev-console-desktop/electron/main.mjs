import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { registerIpcHandlers } from "./ipc.mjs";
import {
  importRenderApiKeyFromEnvIfPresent,
  migrateLegacyRenderApiKeyIfPresent,
  isEncryptionAvailable
} from "./lib/secrets.mjs";
import { migrateLegacyConfigIfPresent } from "./lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

app.whenReady().then(() => {
  console.log("safeStorage available =", isEncryptionAvailable());
  console.log("userData =", app.getPath("userData"));
  migrateLegacyConfigIfPresent();
  migrateLegacyRenderApiKeyIfPresent();
  const imported = importRenderApiKeyFromEnvIfPresent();
  if (imported.imported) console.log("Imported RENDER_API_KEY into OS-encrypted storage.");

  registerIpcHandlers();

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
