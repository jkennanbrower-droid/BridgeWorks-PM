import { safeStorage } from "electron";
import Store from "electron-store";

const store = new Store({ name: "bridgeworks-dev-console" });

const KEY_RENDER_API_ENC = "secrets.renderApiKeyEnc";
const KEY_RENDER_API_LEGACY = "renderApiKey";

function toB64(buf) {
  return Buffer.from(buf).toString("base64");
}

function fromB64(s) {
  return Buffer.from(String(s || ""), "base64");
}

export function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

export function hasRenderApiKey() {
  const enc = store.get(KEY_RENDER_API_ENC);
  return typeof enc === "string" && enc.length > 0;
}

export function getRenderApiKey() {
  const enc = store.get(KEY_RENDER_API_ENC);
  if (typeof enc !== "string" || !enc) return "";
  if (!isEncryptionAvailable()) {
    throw new Error("OS encryption unavailable (Electron safeStorage)");
  }
  const decrypted = safeStorage.decryptString(fromB64(enc));
  return String(decrypted || "");
}

export function setRenderApiKey(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) throw new Error("Render API key is empty");
  if (!isEncryptionAvailable()) {
    throw new Error("OS encryption unavailable (Electron safeStorage)");
  }
  const enc = safeStorage.encryptString(key);
  store.set(KEY_RENDER_API_ENC, toB64(enc));
}

export function migrateLegacyRenderApiKeyIfPresent() {
  const legacy = store.get(KEY_RENDER_API_LEGACY);
  if (typeof legacy !== "string" || !legacy.trim()) return;
  if (hasRenderApiKey()) {
    store.delete(KEY_RENDER_API_LEGACY);
    return;
  }
  if (!isEncryptionAvailable()) return;
  setRenderApiKey(legacy);
  store.delete(KEY_RENDER_API_LEGACY);
}

export function importRenderApiKeyFromEnvIfPresent() {
  const fromEnv = String(process.env.RENDER_API_KEY || "").trim();
  if (!fromEnv) return { imported: false };
  if (hasRenderApiKey()) return { imported: false };
  if (!isEncryptionAvailable()) return { imported: false };
  setRenderApiKey(fromEnv);
  return { imported: true };
}

