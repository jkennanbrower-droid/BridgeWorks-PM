import { readResponseBody, formatHttpError } from "./http.mjs";

const RENDER_API_BASE = "https://api.render.com/v1";

function headers(apiKey) {
  if (!apiKey) throw new Error("Missing Render API key");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

async function getJson(apiKey, path, { searchParams } = {}) {
  const url = new URL(`${RENDER_API_BASE}${path}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, { method: "GET", headers: headers(apiKey) });
  const body = await readResponseBody(res);
  if (!res.ok) throw formatHttpError("Render", res, body);
  return body.json ?? null;
}

async function postJson(apiKey, path, payload) {
  const res = await fetch(`${RENDER_API_BASE}${path}`, {
    method: "POST",
    headers: headers(apiKey),
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const body = await readResponseBody(res);
  if (!res.ok) throw formatHttpError("Render", res, body);
  return body.json ?? null;
}

export async function listAllServices(apiKey) {
  const out = [];
  let cursor = undefined;
  for (let i = 0; i < 20; i++) {
    // Render v1 pagination uses "cursor" when present.
    const page = await getJson(apiKey, "/services", { searchParams: { cursor } });
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    const last = page[page.length - 1];
    cursor = last?.cursor;
    if (!cursor) break;
  }
  return out;
}

export async function getService(apiKey, serviceId) {
  if (!serviceId) throw new Error("Missing serviceId");
  return getJson(apiKey, `/services/${serviceId}`);
}

export async function listDeploys(apiKey, serviceId, { limit = 1 } = {}) {
  if (!serviceId) throw new Error("Missing serviceId");
  return getJson(apiKey, `/services/${serviceId}/deploys`, { searchParams: { limit } });
}

export async function deployService(apiKey, { serviceId, clearCache = false }) {
  if (!serviceId) throw new Error("Missing serviceId");
  // Render uses /deploys (plural) on v1.
  return postJson(apiKey, `/services/${serviceId}/deploys`, { clearCache: Boolean(clearCache) });
}

export async function suspendService(apiKey, { serviceId }) {
  if (!serviceId) throw new Error("Missing serviceId");
  return postJson(apiKey, `/services/${serviceId}/suspend`);
}

export async function resumeService(apiKey, { serviceId }) {
  if (!serviceId) throw new Error("Missing serviceId");
  return postJson(apiKey, `/services/${serviceId}/resume`);
}

