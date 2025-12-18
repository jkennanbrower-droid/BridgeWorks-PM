import Store from "electron-store";

const store = new Store({ name: "bridgeworks-dev-console" });

const DEFAULT_ENV = "prod";

const DEFAULT_ENV_URLS = {
  publicBaseUrl: "https://www.bridgeworkspm.com",
  userBaseUrl: "https://user.bridgeworkspm.com",
  staffBaseUrl: "https://staff.bridgeworkspm.com",
  apiBaseUrl: "https://api.bridgeworkspm.com"
};

function stripSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function coerceEnv(env) {
  return env === "staging" ? "staging" : "prod";
}

function getEnvUrls(env) {
  const baseKey = `environments.${env}`;
  const fallback = env === "prod" ? DEFAULT_ENV_URLS : {};
  return {
    publicBaseUrl: stripSlash(store.get(`${baseKey}.publicBaseUrl`) || fallback.publicBaseUrl || ""),
    userBaseUrl: stripSlash(store.get(`${baseKey}.userBaseUrl`) || fallback.userBaseUrl || ""),
    staffBaseUrl: stripSlash(store.get(`${baseKey}.staffBaseUrl`) || fallback.staffBaseUrl || ""),
    apiBaseUrl: stripSlash(store.get(`${baseKey}.apiBaseUrl`) || fallback.apiBaseUrl || "")
  };
}

function getAdminToken() {
  return String(store.get("adminToken") || "");
}

function getDebugEnabled() {
  return Boolean(store.get("debug") || false);
}

function getRenderSelection(env) {
  const baseKey = `render.selection.${env}`;
  const sel = store.get(baseKey) || {};
  return {
    public: typeof sel.public === "string" ? sel.public : "",
    user: typeof sel.user === "string" ? sel.user : "",
    staff: typeof sel.staff === "string" ? sel.staff : "",
    api: typeof sel.api === "string" ? sel.api : ""
  };
}

export function getConfigInternal() {
  const env = coerceEnv(String(store.get("env") || DEFAULT_ENV));
  return {
    env,
    environments: {
      prod: getEnvUrls("prod"),
      staging: getEnvUrls("staging")
    },
    adminToken: getAdminToken(),
    debug: getDebugEnabled(),
    renderSelection: {
      prod: getRenderSelection("prod"),
      staging: getRenderSelection("staging")
    }
  };
}

export function getConfigPublic({ renderApiKeyConfigured }) {
  const cfg = getConfigInternal();
  return {
    env: cfg.env,
    environments: cfg.environments,
    debug: cfg.debug,
    render: {
      apiKeyConfigured: Boolean(renderApiKeyConfigured),
      selection: cfg.renderSelection[cfg.env]
    }
  };
}

export function setConfigPartial(next) {
  if (next && typeof next === "object") {
    if (typeof next.env === "string") store.set("env", coerceEnv(next.env));
    if (typeof next.debug === "boolean") store.set("debug", next.debug);

    if (next.environments && typeof next.environments === "object") {
      for (const env of ["prod", "staging"]) {
        const e = next.environments[env];
        if (!e || typeof e !== "object") continue;
        const baseKey = `environments.${env}`;
        if (typeof e.publicBaseUrl === "string") store.set(`${baseKey}.publicBaseUrl`, e.publicBaseUrl);
        if (typeof e.userBaseUrl === "string") store.set(`${baseKey}.userBaseUrl`, e.userBaseUrl);
        if (typeof e.staffBaseUrl === "string") store.set(`${baseKey}.staffBaseUrl`, e.staffBaseUrl);
        if (typeof e.apiBaseUrl === "string") store.set(`${baseKey}.apiBaseUrl`, e.apiBaseUrl);
      }
    }

    if (typeof next.adminToken === "string") store.set("adminToken", next.adminToken);

    if (next.render && typeof next.render === "object") {
      const env = coerceEnv(String(store.get("env") || DEFAULT_ENV));
      if (next.render.selection && typeof next.render.selection === "object") {
        const baseKey = `render.selection.${env}`;
        const s = next.render.selection;
        if (typeof s.public === "string") store.set(`${baseKey}.public`, s.public);
        if (typeof s.user === "string") store.set(`${baseKey}.user`, s.user);
        if (typeof s.staff === "string") store.set(`${baseKey}.staff`, s.staff);
        if (typeof s.api === "string") store.set(`${baseKey}.api`, s.api);
      }
    }
  }
}

