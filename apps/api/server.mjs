import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

import express from "express";
import multer from "multer";
import pg from "pg";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import promClient from "prom-client";
import { createHttpMetrics } from "telemetry-metrics";
import pino from "pino";
import pinoHttp from "pino-http";
import pinoPretty from "pino-pretty";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { checkAuthClerk, checkDb, checkStorageR2 } from "./dependencyHealth.mjs";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (!key || key in process.env) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// Load .env files from monorepo root (two levels up)
const repoRoot = path.join(import.meta.dirname, "../..");
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, ".env"));

const app = express();
app.set("etag", false);
app.use(express.json());

const httpMetrics = createHttpMetrics({ serviceName: "API" });

function createRingBuffer(limit) {
  const items = [];
  return {
    push(value) {
      items.push(value);
      if (items.length > limit) {
        items.splice(0, items.length - limit);
      }
    },
    list() {
      return items.slice();
    },
  };
}

function createBucketStore({ bucketMs, maxBuckets }) {
  const entities = new Map();

  function getEntityBuckets(entity) {
    const key = String(entity || "UNKNOWN").toUpperCase();
    if (!entities.has(key)) {
      entities.set(key, new Map());
    }
    return entities.get(key);
  }

  function pruneBuckets(bucketMap) {
    const cutoff = Date.now() - bucketMs * maxBuckets;
    for (const start of bucketMap.keys()) {
      if (start < cutoff) {
        bucketMap.delete(start);
      }
    }
  }

  function record(entity, { ok = true, latencyMs = null, timestampMs = Date.now() } = {}) {
    const bucketMap = getEntityBuckets(entity);
    const bucketStart = Math.floor(timestampMs / bucketMs) * bucketMs;
    const bucket =
      bucketMap.get(bucketStart) ??
      {
        start: bucketStart,
        count: 0,
        errors: 0,
        latencies: [],
      };

    bucket.count += 1;
    if (!ok) bucket.errors += 1;
    if (typeof latencyMs === "number") {
      bucket.latencies.push(latencyMs);
    }
    bucketMap.set(bucketStart, bucket);
    pruneBuckets(bucketMap);
  }

  function listBuckets(entity, rangeMs) {
    const bucketMap = entities.get(String(entity || "UNKNOWN").toUpperCase());
    if (!bucketMap) return [];
    const cutoff = Date.now() - rangeMs;
    return Array.from(bucketMap.values())
      .filter((bucket) => bucket.start >= cutoff)
      .sort((a, b) => a.start - b.start);
  }

  function listAggregateBuckets(rangeMs) {
    const cutoff = Date.now() - rangeMs;
    const aggregate = new Map();
    for (const bucketMap of entities.values()) {
      for (const bucket of bucketMap.values()) {
        if (bucket.start < cutoff) continue;
        const existing =
          aggregate.get(bucket.start) ??
          {
            start: bucket.start,
            count: 0,
            errors: 0,
            latencies: [],
          };
        existing.count += bucket.count;
        existing.errors += bucket.errors;
        if (bucket.latencies.length > 0) {
          existing.latencies.push(...bucket.latencies);
        }
        aggregate.set(bucket.start, existing);
      }
    }
    return Array.from(aggregate.values()).sort((a, b) => a.start - b.start);
  }

  return {
    bucketMs,
    record,
    listBuckets,
    listAggregateBuckets,
  };
}

const logBuffer = createRingBuffer(600);
const errorBuffer = createRingBuffer(200);
const traceBuffer = createRingBuffer(400);
const serviceMetrics1m = createBucketStore({ bucketMs: 60_000, maxBuckets: 24 * 60 });
const serviceMetrics5m = createBucketStore({ bucketMs: 5 * 60_000, maxBuckets: 7 * 24 * 12 });
const dependencyMetrics1m = createBucketStore({ bucketMs: 60_000, maxBuckets: 24 * 60 });
const dependencyMetrics5m = createBucketStore({ bucketMs: 5 * 60_000, maxBuckets: 7 * 24 * 12 });
const stressRuns = new Map();

const serviceCheckLatencyMs = new promClient.Histogram({
  name: "bw_ops_service_check_latency_ms",
  help: "Ops service check latency in ms",
  registers: [httpMetrics.registry],
  labelNames: ["service"],
  buckets: [25, 50, 100, 250, 500, 1000, 2000, 4000],
});

const serviceCheckTotal = new promClient.Counter({
  name: "bw_ops_service_check_total",
  help: "Ops service check total",
  registers: [httpMetrics.registry],
  labelNames: ["service", "result"],
});

const dependencyProbeLatencyMs = new promClient.Histogram({
  name: "bw_ops_dependency_probe_latency_ms",
  help: "Dependency probe latency in ms",
  registers: [httpMetrics.registry],
  labelNames: ["dependency"],
  buckets: [25, 50, 100, 250, 500, 1000, 2000, 4000],
});

const dependencyProbeTotal = new promClient.Counter({
  name: "bw_ops_dependency_probe_total",
  help: "Dependency probe total",
  registers: [httpMetrics.registry],
  labelNames: ["dependency", "result"],
});

const ExportResultCode = {
  SUCCESS: 0,
  FAILED: 1,
};

class RingBufferSpanExporter {
  export(spans, resultCallback) {
    for (const span of spans) {
      traceBuffer.push(span);
    }
    resultCallback({ code: ExportResultCode.SUCCESS });
  }
  shutdown() {
    return Promise.resolve();
  }
}

const telemetrySdk = new NodeSDK({
  traceExporter: new RingBufferSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  telemetrySdk.start();
} catch (error) {
  console.warn("otel init failed", error);
}

const logStream = {
  write(chunk) {
    try {
      const event = JSON.parse(chunk);
      const level =
        event.level >= 50 ? "error" : event.level >= 40 ? "warn" : "info";
      const item = {
        id: event.req?.id ?? crypto.randomUUID(),
        timestamp: event.time ? new Date(event.time).toISOString() : new Date().toISOString(),
        level,
        message: event.msg ?? "request",
        method: event.req?.method,
        route: event.req?.url,
        status: event.res?.statusCode,
        durationMs: event.responseTime,
        traceId: event.traceId ?? null,
        service: "API",
      };
      logBuffer.push(item);
      if (item.status && item.status >= 500) {
        errorBuffer.push({
          id: item.id,
          timestamp: item.timestamp,
          message: item.message,
          route: item.route ?? "",
          status: item.status,
          count: 1,
          traceId: item.traceId ?? null,
          service: "API",
        });
      }
    } catch {
      // ignore log parse errors
    }
  },
};

const prettyStream =
  process.env.LOG_PRETTY === "1"
    ? pinoPretty({
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: true,
      })
    : process.stdout;

const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  pino.multistream([{ stream: prettyStream }, { stream: logStream }]),
);

app.use(
  pinoHttp({
    logger,
    autoLogging: false,
  }),
);

app.use(httpMetrics.expressMiddleware);

app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path ?? "unknown";
    const duration = performance.now() - start;
    recordServiceSample("API", {
      ok: res.statusCode < 500,
      latencyMs: duration,
      timestampMs: Date.now(),
    });
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](
      {
        req: {
          id: req.id ?? crypto.randomUUID(),
          method: req.method,
          url: req.originalUrl ?? req.url,
        },
        res: { statusCode: res.statusCode },
        responseTime: Math.round(duration),
      },
      "request completed",
    );
  });
  next();
});

function noStore(res) {
  res.setHeader("cache-control", "no-store");
}

function noCache(res) {
  res.setHeader(
    "cache-control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("pragma", "no-cache");
  res.setHeader("expires", "0");
  res.setHeader("surrogate-control", "no-store");
}

function stripConditionalHeaders(req) {
  delete req.headers["if-none-match"];
  delete req.headers["if-modified-since"];
  delete req.headers["if-match"];
  delete req.headers["if-unmodified-since"];
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? 1_000_000;
  const fallback = options.fallback ?? min;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const allowedOrigins = parseCsv(process.env.CORS_ORIGINS);
const devOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && devOriginPattern.test(origin)) {
    return true;
  }
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Upload-Token, X-OPS-KEY, Authorization",
  );
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

function isTruthyEnv(value) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function requireOpsAccess(req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !isTruthyEnv(process.env.OPS_ALLOW_TESTS)) {
    noStore(res);
    return res.status(403).json({ ok: false, error: "Ops endpoints disabled." });
  }

  const requiredKey = process.env.OPS_KEY;
  if (requiredKey) {
    const provided = req.headers["x-ops-key"];
    const value = Array.isArray(provided) ? provided[0] : provided;
    if (!value || value !== requiredKey) {
      noStore(res);
      return res.status(401).json({ ok: false, error: "Unauthorized." });
    }
  }

  return next();
}

app.use("/ops", requireOpsAccess);

function addAlias(pathA, pathB, handler) {
  app.all(pathA, handler);
  app.all(pathB, handler);
}

function getBuildSha() {
  return process.env.BUILD_SHA ?? process.env.GIT_SHA ?? process.env.RENDER_GIT_COMMIT;
}

function getSelfBaseUrl(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader)
    ?.split(",")[0]
    ?.trim();
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto || req.protocol || "http"}://${host}`;
}

async function fetchWithTimeout(url, { timeoutMs = 5000, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: controller.signal, headers, redirect: "manual" });
    const latencyMs = performance.now() - started;
    return { res, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

function join(base, path) {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

async function checkUrl(name, url, pathChecked, timeoutMs) {
  try {
    const { res, latencyMs } = await fetchWithTimeout(url, { timeoutMs });
    const ok = res.ok;
    const contentType = res.headers.get("content-type") || "";
    let preview = null;
    if (!ok) {
      preview = await res
        .text()
        .then((text) => text.slice(0, 200))
        .catch(() => null);
      logger.debug(
        {
          check: {
            name,
            url,
            status: res.status,
            latencyMs: Math.round(latencyMs),
            redirected: res.status >= 300 && res.status < 400,
            location: res.headers.get("location"),
            headers: {
              server: res.headers.get("server"),
              cfRay: res.headers.get("cf-ray"),
              cfCacheStatus: res.headers.get("cf-cache-status"),
              contentType,
            },
            preview,
          },
        },
        "ops/status check failed",
      );
    }
    return {
      name,
      pathChecked,
      ok,
      status: res.status,
      latencyMs: Math.round(latencyMs),
    };
  } catch (e) {
    logger.debug(
      {
        check: {
          name,
          url,
          pathChecked,
          status: 0,
          error: e instanceof Error ? e.message : String(e),
        },
      },
      "ops/status check threw",
    );
    return {
      name,
      pathChecked,
      ok: false,
      status: 0,
      latencyMs: null,
    };
  }
}

async function checkServiceReachable(name, baseUrl) {
  if (!baseUrl) {
    logger.debug(
      { check: { name, url: null, pathChecked: "/api/health", status: 0, error: "Missing base URL" } },
      "ops/status check threw",
    );
    return { name, pathChecked: "/api/health", ok: false, status: 0, latencyMs: null };
  }
  const url = join(String(baseUrl), "/api/health");
  return await checkUrl(name, url, "/api/health", 5000);
}

function envUrl(envKey) {
  const value = process.env[envKey];
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function getLocalApiBaseUrl() {
  const port = envUrl("PORT") ?? "3000";
  return `http://127.0.0.1:${port}`;
}

async function probeServices(selfBase, timestampMs) {
  const services = [];
  try {
    const apiBase = getLocalApiBaseUrl();
    services.push(await checkUrl("API /health", join(apiBase, "/health"), "/health", 5000));
    services.push(await checkUrl("API /health/db", join(apiBase, "/health/db"), "/health/db", 5000));
    services.push(await checkServiceReachable("Public", process.env.PUBLIC_INTERNAL_URL));
    services.push(await checkServiceReachable("User", process.env.USER_INTERNAL_URL));
    services.push(await checkServiceReachable("Staff", process.env.STAFF_INTERNAL_URL));
    services.push(await checkServiceReachable("Org", process.env.ORG_INTERNAL_URL));
    services.push(await checkServiceReachable("Console", process.env.CONSOLE_INTERNAL_URL));
  } catch (e) {
    services.push({
      name: "ops/status",
      pathChecked: "/ops/status",
      ok: false,
      status: 0,
      latencyMs: null,
    });
  }

  const seenMetrics = new Set();
  for (const service of services) {
    const serviceName = normalizeServiceName(service.name);
    if (seenMetrics.has(serviceName)) continue;
    seenMetrics.add(serviceName);
    recordServiceCheck(service.name, {
      ok: Boolean(service.ok),
      latencyMs: typeof service.latencyMs === "number" ? service.latencyMs : null,
      timestampMs,
    });
  }

  return services;
}

function parseRangeMs(range) {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

function parsePrometheusNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getPrometheusBaseUrl() {
  const raw = process.env.PROMETHEUS_BASE_URL ?? "http://localhost:9090";
  return String(raw).trim().replace(/\/+$/, "");
}

function pickStepSec(rangeMs) {
  if (rangeMs <= 60 * 60 * 1000) return 15;
  if (rangeMs <= 6 * 60 * 60 * 1000) return 30;
  if (rangeMs <= 24 * 60 * 60 * 1000) return 60;
  return 300;
}

async function prometheusQueryRange(query, { startSec, endSec, stepSec }) {
  const base = getPrometheusBaseUrl();
  const url = new URL(`${base}/api/v1/query_range`);
  url.searchParams.set("query", query);
  url.searchParams.set("start", String(startSec));
  url.searchParams.set("end", String(endSec));
  url.searchParams.set("step", String(stepSec));

  const { res } = await fetchWithTimeout(url.toString(), { timeoutMs: 8000 });
  if (!res.ok) {
    throw new Error(`Prometheus query_range ${res.status}`);
  }
  const payload = await res.json().catch(() => null);
  if (!payload || payload.status !== "success") {
    throw new Error(payload?.error ?? "Prometheus query_range failed");
  }
  return Array.isArray(payload.data?.result) ? payload.data.result : [];
}

async function prometheusQueryInstant(query, { timeSec } = {}) {
  const base = getPrometheusBaseUrl();
  const url = new URL(`${base}/api/v1/query`);
  url.searchParams.set("query", query);
  if (typeof timeSec === "number") {
    url.searchParams.set("time", String(timeSec));
  }

  const { res } = await fetchWithTimeout(url.toString(), { timeoutMs: 8000 });
  if (!res.ok) {
    throw new Error(`Prometheus query ${res.status}`);
  }
  const payload = await res.json().catch(() => null);
  if (!payload || payload.status !== "success") {
    throw new Error(payload?.error ?? "Prometheus query failed");
  }
  return Array.isArray(payload.data?.result) ? payload.data.result : [];
}

function buildTimeline(startMs, endMs, stepSec) {
  const startSec = Math.floor(startMs / 1000);
  const endSec = Math.floor(endMs / 1000);
  const epochSecs = [];
  const timestamps = [];
  for (let t = startSec; t <= endSec; t += stepSec) {
    epochSecs.push(t);
    timestamps.push(new Date(t * 1000).toISOString());
  }
  return { startSec, endSec, stepSec, epochSecs, timestamps };
}

function extractSingleMatrixValues(result) {
  const first = Array.isArray(result) ? result[0] : null;
  const values = first?.values;
  return Array.isArray(values) ? values : [];
}

function fillSeries(epochSecs, matrixValues) {
  const bySec = new Map();
  for (const entry of matrixValues) {
    const sec = Math.round(Number(entry?.[0]));
    bySec.set(sec, entry?.[1]);
  }
  return epochSecs.map((sec) => parsePrometheusNumber(bySec.get(sec)));
}

function normalizeServiceName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "UNKNOWN";
  const lower = raw.toLowerCase();
  if (lower.startsWith("api")) return "API";
  if (lower === "public") return "PUBLIC";
  if (lower === "user") return "USER";
  if (lower === "staff") return "STAFF";
  if (lower === "org") return "ORG";
  if (lower === "console") return "CONSOLE";
  return raw.toUpperCase();
}

function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[index];
}

function buildSeriesFromBuckets(buckets, bucketMs) {
  const timestamps = [];
  const requestsPerMin = [];
  const errorRate = [];
  const latencyP50 = [];
  const latencyP95 = [];
  const latencyP99 = [];

  for (const bucket of buckets) {
    timestamps.push(new Date(bucket.start).toISOString());
    const perMin = bucket.count / (bucketMs / 60000);
    requestsPerMin.push(Number.isFinite(perMin) ? perMin : null);
    errorRate.push(bucket.count > 0 ? bucket.errors / bucket.count : null);
    latencyP50.push(percentile(bucket.latencies, 50));
    latencyP95.push(percentile(bucket.latencies, 95));
    latencyP99.push(percentile(bucket.latencies, 99));
  }

  return { timestamps, requestsPerMin, errorRate, latencyP50, latencyP95, latencyP99 };
}

function buildEmptySeries(timestamps) {
  return {
    timestamps,
    requestsPerMin: timestamps.map(() => null),
    errorRate: timestamps.map(() => null),
    latencyP50: timestamps.map(() => null),
    latencyP95: timestamps.map(() => null),
    latencyP99: timestamps.map(() => null),
  };
}

function recordServiceSample(serviceName, { ok = true, latencyMs = null, timestampMs = Date.now() } = {}) {
  const normalized = normalizeServiceName(serviceName);
  serviceMetrics1m.record(normalized, { ok, latencyMs, timestampMs });
  serviceMetrics5m.record(normalized, { ok, latencyMs, timestampMs });
}

function recordServiceCheck(serviceName, { ok = true, latencyMs = null, timestampMs = Date.now() } = {}) {
  const normalized = normalizeServiceName(serviceName);
  serviceCheckTotal.labels(normalized, ok ? "ok" : "error").inc();
  if (typeof latencyMs === "number") {
    serviceCheckLatencyMs.labels(normalized).observe(latencyMs);
  }
  recordServiceSample(normalized, { ok, latencyMs, timestampMs });
}

function recordDependencySample(
  dependency,
  { state = "healthy", latencyMs = null, timestampMs = Date.now() } = {},
) {
  const key = String(dependency || "unknown").toLowerCase();
  const result = state === "disabled" ? "disabled" : state === "healthy" ? "ok" : "error";
  dependencyProbeTotal.labels(key, result).inc();
  if (typeof latencyMs === "number") {
    dependencyProbeLatencyMs.labels(key).observe(latencyMs);
    dependencyMetrics1m.record(key, { ok: result === "ok", latencyMs, timestampMs });
    dependencyMetrics5m.record(key, { ok: result === "ok", latencyMs, timestampMs });
  }
}

async function probeDependencies(timestampMs = Date.now()) {
  const [dbHealth, authHealth, storageHealth] = await Promise.all([
    checkDb(pool),
    checkAuthClerk(),
    checkStorageR2(),
  ]);

  recordDependencySample("db", {
    state: dbHealth.state,
    latencyMs: dbHealth.latencyMs,
    timestampMs,
  });
  recordDependencySample("auth", {
    state: authHealth.state,
    latencyMs: authHealth.latencyMs,
    timestampMs,
  });
  recordDependencySample("storage", {
    state: storageHealth.state,
    latencyMs: storageHealth.latencyMs,
    timestampMs,
  });

  return { dbHealth, authHealth, storageHealth };
}

function selectMetricsStores(rangeMs) {
  const useLong = rangeMs > 24 * 60 * 60 * 1000;
  return {
    serviceStore: useLong ? serviceMetrics5m : serviceMetrics1m,
    dependencyStore: useLong ? dependencyMetrics5m : dependencyMetrics1m,
  };
}

function getServiceSeries(serviceName, rangeMs, store) {
  const normalized = normalizeServiceName(serviceName);
  const buckets = store.listBuckets(normalized, rangeMs);
  return buildSeriesFromBuckets(buckets, store.bucketMs);
}

function getPlatformSeries(rangeMs, store) {
  const buckets = store.listAggregateBuckets(rangeMs);
  return buildSeriesFromBuckets(buckets, store.bucketMs);
}

function collectDependencyTimestamps(rangeMs, store) {
  const timestamps = new Set();
  for (const name of ["db", "auth", "storage"]) {
    for (const bucket of store.listBuckets(name, rangeMs)) {
      timestamps.add(new Date(bucket.start).toISOString());
    }
  }
  return Array.from(timestamps).sort();
}

function buildDependencySeries(timestamps, rangeMs, store) {
  const series = {};
  for (const name of ["db", "auth", "storage"]) {
    const buckets = store.listBuckets(name, rangeMs);
    const bucketMap = new Map(
      buckets.map((bucket) => [
        new Date(bucket.start).toISOString(),
        percentile(bucket.latencies, 95),
      ]),
    );
    series[`${name}LatencyP95`] = timestamps.map((ts) =>
      bucketMap.has(ts) ? bucketMap.get(ts) : null,
    );
  }
  return series;
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function buildStressTargetUrl(baseUrl, path) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return null;
  return `${normalized}${path}`;
}

function getStressTargetDefinitions(selfBase) {
  return [
    {
      key: "api",
      label: "API",
      url: buildStressTargetUrl(selfBase, "/ops/stress/echo"),
    },
    {
      key: "public",
      label: "Public",
      url: buildStressTargetUrl(process.env.NEXT_PUBLIC_PUBLIC_APP_URL, "/api/stress/echo"),
    },
    {
      key: "user",
      label: "User",
      url: buildStressTargetUrl(process.env.NEXT_PUBLIC_USER_APP_URL, "/api/stress/echo"),
    },
    {
      key: "staff",
      label: "Staff",
      url: buildStressTargetUrl(process.env.NEXT_PUBLIC_STAFF_APP_URL, "/api/stress/echo"),
    },
    {
      key: "org",
      label: "Org",
      url: buildStressTargetUrl(process.env.NEXT_PUBLIC_ORG_APP_URL, "/api/stress/echo"),
    },
    {
      key: "console",
      label: "Console",
      url: buildStressTargetUrl(process.env.NEXT_PUBLIC_CONSOLE_APP_URL, "/api/stress/echo"),
    },
  ];
}

function resolveStressTargets(selfBase, requestedTargets) {
  const definitions = getStressTargetDefinitions(selfBase);
  const byKey = new Map(definitions.map((target) => [target.key, target]));
  const normalizedRequested = requestedTargets.length
    ? requestedTargets
    : definitions.map((target) => target.key);

  const active = [];
  const skipped = [];

  for (const raw of normalizedRequested) {
    const key = String(raw || "").trim().toLowerCase();
    const target = byKey.get(key);
    if (!target) {
      skipped.push({ key, reason: "Unknown target" });
      continue;
    }
    if (!target.url) {
      skipped.push({ key: target.key, reason: "Missing base URL" });
      continue;
    }
    active.push({
      ...target,
      sent: 0,
      completed: 0,
      errors: 0,
      latencies: [],
    });
  }

  return { active, skipped };
}

function summarizeLatencies(latencies) {
  if (!latencies.length) {
    return { avg: null, p95: null, p99: null };
  }
  const sum = latencies.reduce((total, value) => total + value, 0);
  return {
    avg: sum / latencies.length,
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

function buildStressStatus(run) {
  const targets = run.targets.map((target) => {
    const stats = summarizeLatencies(target.latencies);
    return {
      key: target.key,
      label: target.label,
      url: target.url,
      sent: target.sent,
      completed: target.completed,
      errors: target.errors,
      avgLatencyMs: stats.avg,
      p95LatencyMs: stats.p95,
      p99LatencyMs: stats.p99,
    };
  });
  const allLatencies = run.targets.flatMap((target) => target.latencies);
  const overall = summarizeLatencies(allLatencies);
  return {
    ok: true,
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt ?? null,
    durationMs: run.durationMs ?? null,
    config: run.config,
    progress: run.progress,
    targets,
    skippedTargets: run.skippedTargets ?? [],
    summary: {
      sent: run.progress.sent,
      completed: run.progress.completed,
      errors: run.progress.errors,
      avgLatencyMs: overall.avg,
      p95LatencyMs: overall.p95,
      p99LatencyMs: overall.p99,
    },
    error: run.error ?? null,
  };
}

function pruneStressRuns(maxAgeMs = 30 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, run] of stressRuns.entries()) {
    const finishedAt = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
    const startedAt = new Date(run.startedAt).getTime();
    const latest = finishedAt ?? startedAt;
    if (latest < cutoff) {
      stressRuns.delete(id);
    }
  }
}

async function executeStressRun(run) {
  const { durationSec, rps, concurrency, bytes, ms } = run.config;
  const targets = run.targets;
  if (!targets.length) {
    run.status = "failed";
    run.error = "No valid targets.";
    run.finishedAt = new Date().toISOString();
    run.durationMs = 0;
    return;
  }

  const intervalMs = Math.max(1, Math.floor(1000 / rps));
  const startedAt = Date.now();
  const endAt = startedAt + durationSec * 1000;
  let nextLaunch = Date.now();
  let inFlight = 0;

  const fire = async (target) => {
    const url = new URL(target.url);
    url.searchParams.set("bytes", String(bytes));
    if (ms > 0) {
      url.searchParams.set("ms", String(ms));
    }
    const requestStart = performance.now();
    let ok = false;
    try {
      const headers = {};
      if (target.key === "api" && process.env.OPS_KEY) {
        headers["x-ops-key"] = process.env.OPS_KEY;
      }
      const res = await fetch(url.toString(), { cache: "no-store", headers });
      ok = res.ok;
    } catch {
      ok = false;
    }
    const latencyMs = Math.round(performance.now() - requestStart);
    target.completed += 1;
    if (!ok) target.errors += 1;
    target.latencies.push(latencyMs);
    run.progress.completed += 1;
    if (!ok) run.progress.errors += 1;
    run.progress.lastUpdatedAt = new Date().toISOString();

    if (target.key !== "api") {
      recordServiceSample(target.label, {
        ok,
        latencyMs,
        timestampMs: Date.now(),
      });
    }
  };

  try {
    while (Date.now() < endAt || inFlight > 0) {
      while (Date.now() < endAt && inFlight < concurrency && Date.now() >= nextLaunch) {
        const index = run.progress.sent % targets.length;
        const target = targets[index];
        run.progress.sent += 1;
        target.sent += 1;
        inFlight += 1;
        void fire(target).finally(() => {
          inFlight -= 1;
        });
        nextLaunch += intervalMs;
      }
      await sleepMs(5);
    }

    run.status = "completed";
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.now() - startedAt;
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : "Stress run failed.";
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.now() - startedAt;
  }
}

const staticDir = path.join(import.meta.dirname, "static");
app.use("/static", express.static(staticDir));

// Ops console (static app)
app.get("/", (req, res) => {
  noStore(res);
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get("/health", (req, res) => {
  stripConditionalHeaders(req);
  noCache(res);
  res.status(200).json({ ok: true });
});

app.get("/metrics", async (req, res) => {
  noStore(res);
  res.setHeader("Content-Type", httpMetrics.registry.contentType);
  res.end(await httpMetrics.metricsText());
});

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
});

app.get("/health/db", async (req, res) => {
  stripConditionalHeaders(req);
  noCache(res);
  try {
    await pool.query("select 1");
    res.status(200).json({ ok: true, db: "ok" });
  } catch (e) {
    res.status(200).json({ ok: false, db: "error" });
  }
});

app.get("/whoami", (req, res) => {
  noStore(res);
  const buildSha = getBuildSha();
  res.json({
    ok: true,
    service: "api",
    hostname: os.hostname(),
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    ...(buildSha ? { buildSha } : {}),
  });
});

app.get("/cache-test", (req, res) => {
  const nonce = crypto.randomUUID();
  const etag = `"${nonce}"`;

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  res.setHeader("ETag", etag);

  const inm = req.headers["if-none-match"];
  const inmValue = Array.isArray(inm) ? inm.join(",") : inm;
  if (inmValue && inmValue.split(",").map((s) => s.trim()).includes(etag)) {
    return res.status(304).end();
  }

  return res.json({ ok: true, nonce, timestamp: new Date().toISOString() });
});

app.get("/ops/dependencies/status", async (req, res) => {
  noStore(res);
  const now = new Date().toISOString();
  const timestampMs = Date.now();

  const { dbHealth, authHealth, storageHealth } = await probeDependencies(timestampMs);

  res.json({
    now,
    db: dbHealth,
    auth: authHealth,
    storage: storageHealth,
  });
});

app.get("/ops/status", async (req, res) => {
  noStore(res);

  const buildSha = getBuildSha();
  const timestamp = new Date().toISOString();
  const timestampMs = Date.now();
  const selfBase = getSelfBaseUrl(req);

  const api = {
    ok: true,
    uptimeSec: Math.floor(process.uptime()),
    nodeVersion: process.version,
    pid: process.pid,
    hostname: os.hostname(),
    timestamp,
    ...(buildSha ? { buildSha } : {}),
  };

  const { dbHealth, authHealth, storageHealth } = await probeDependencies(timestampMs);

  const db = {
    ok: dbHealth.state === "healthy",
    latencyMs: dbHealth.latencyMs ?? null,
    ...(dbHealth.message ? { error: dbHealth.message } : {}),
  };

  const services = await probeServices(selfBase, timestampMs);

  const dependencies = {
    db: dbHealth,
    auth: authHealth,
    storage: storageHealth,
  };

  let prometheus = null;
  try {
    const servicesMatcher = 'service=~"PUBLIC|USER|STAFF|ORG|API|CONSOLE"';
    const reqPerMinByService = await prometheusQueryInstant(
      `sum by (service) (rate(bw_http_requests_total{${servicesMatcher}}[1m])) * 60`,
    );
    const errRateByService = await prometheusQueryInstant(
      `sum by (service) (rate(bw_http_requests_total{${servicesMatcher},status=~"5.."}[5m])) / sum by (service) (rate(bw_http_requests_total{${servicesMatcher}}[5m]))`,
    );
    const p95ByService = await prometheusQueryInstant(
      `histogram_quantile(0.95, sum by (service,le) (rate(bw_http_request_duration_ms_bucket{${servicesMatcher}}[5m])))`,
    );

    const metricsByService = new Map();
    for (const item of reqPerMinByService) {
      const service = normalizeServiceName(item?.metric?.service);
      metricsByService.set(service, { requestsPerMin: parsePrometheusNumber(item?.value?.[1]) });
    }
    for (const item of errRateByService) {
      const service = normalizeServiceName(item?.metric?.service);
      const current = metricsByService.get(service) ?? {};
      metricsByService.set(service, {
        ...current,
        errorRate: parsePrometheusNumber(item?.value?.[1]),
      });
    }
    for (const item of p95ByService) {
      const service = normalizeServiceName(item?.metric?.service);
      const current = metricsByService.get(service) ?? {};
      metricsByService.set(service, {
        ...current,
        latencyP95: parsePrometheusNumber(item?.value?.[1]),
      });
    }

    const servicesList = Array.from(metricsByService.entries()).map(([service, values]) => ({
      service,
      requestsPerMin: values.requestsPerMin ?? null,
      errorRate: values.errorRate ?? null,
      latencyP95: values.latencyP95 ?? null,
    }));

    const avg = (field) => {
      const nums = servicesList
        .map((item) => item[field])
        .filter((value) => typeof value === "number" && Number.isFinite(value));
      if (!nums.length) return null;
      return nums.reduce((sum, value) => sum + value, 0) / nums.length;
    };

    prometheus = {
      ok: true,
      baseUrl: getPrometheusBaseUrl(),
      platform: {
        requestsPerMin: avg("requestsPerMin"),
        errorRate: avg("errorRate"),
        latencyP95: avg("latencyP95"),
      },
      services: servicesList,
    };
  } catch (error) {
    prometheus = {
      ok: false,
      baseUrl: getPrometheusBaseUrl(),
      error: error instanceof Error ? error.message : "Prometheus error",
    };
  }

  res.json({ api, db, services, dependencies, prometheus });
});

app.post("/ops/test/run", async (req, res) => {
  noStore(res);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const selfBase = getSelfBaseUrl(req);

  const { dbHealth, authHealth, storageHealth } = await probeDependencies(startedAtMs);
  const services = await probeServices(selfBase, startedAtMs);

  const finishedAt = new Date().toISOString();
  res.json({
    ok: true,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startedAtMs,
    dependencies: {
      db: dbHealth,
      auth: authHealth,
      storage: storageHealth,
    },
    services,
  });
});

app.get("/ops/stress/echo", async (req, res) => {
  noStore(res);
  const bytes = parsePositiveInt(req.query.bytes, { min: 0, max: 256 * 1024, fallback: 256 });
  const delayMs = parsePositiveInt(req.query.ms, { min: 0, max: 10_000, fallback: 0 });
  if (delayMs > 0) {
    await sleepMs(delayMs);
  }
  const payload = Buffer.alloc(bytes, 97);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(payload);
});

app.get("/api/stress/echo", requireOpsAccess, async (req, res) => {
  noStore(res);
  const bytes = parsePositiveInt(req.query.bytes, { min: 0, max: 256 * 1024, fallback: 256 });
  const delayMs = parsePositiveInt(req.query.ms, { min: 0, max: 10_000, fallback: 0 });
  if (delayMs > 0) {
    await sleepMs(delayMs);
  }
  const payload = Buffer.alloc(bytes, 97);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(payload);
});

app.post("/ops/stress/run", async (req, res) => {
  noStore(res);
  pruneStressRuns();

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const durationSec = parsePositiveInt(body.durationSec, { min: 1, max: 600, fallback: 30 });
  const rps = parsePositiveInt(body.rps, { min: 1, max: 2000, fallback: 25 });
  const concurrency = parsePositiveInt(body.concurrency, { min: 1, max: 500, fallback: 25 });
  const bytes = parsePositiveInt(body.bytes, { min: 0, max: 256 * 1024, fallback: 256 });
  const delayMs = parsePositiveInt(body.ms, { min: 0, max: 10_000, fallback: 0 });
  const requestedTargets = Array.isArray(body.targets)
    ? body.targets.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const { active, skipped } = resolveStressTargets(getSelfBaseUrl(req), requestedTargets);

  if (!active.length) {
    return res.status(400).json({
      ok: false,
      error: "No valid stress targets available.",
      skippedTargets: skipped,
    });
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const run = {
    id: runId,
    status: "running",
    startedAt,
    finishedAt: null,
    durationMs: null,
    config: {
      durationSec,
      rps,
      concurrency,
      bytes,
      ms: delayMs,
      targets: active.map((target) => target.key),
    },
    progress: {
      sent: 0,
      completed: 0,
      errors: 0,
      lastUpdatedAt: startedAt,
    },
    targets: active,
    skippedTargets: skipped,
    error: null,
  };

  stressRuns.set(runId, run);
  void executeStressRun(run);

  return res.status(202).json(buildStressStatus(run));
});

app.get("/ops/stress/status", (req, res) => {
  noStore(res);
  pruneStressRuns();
  const runId = String(req.query.id ?? "");
  const run = stressRuns.get(runId);
  if (!run) {
    return res.status(404).json({ ok: false, error: "Stress run not found." });
  }
  return res.json(buildStressStatus(run));
});

app.get("/ops/metrics", async (req, res) => {
  noStore(res);
  const range = String(req.query.range ?? "1h");
  const requestedService = String(req.query.service ?? "platform");
  const rangeMs = parseRangeMs(range);
  const stepSec = pickStepSec(rangeMs);

  const endMs = Date.now();
  const startMs = endMs - rangeMs;
  const timeline = buildTimeline(startMs, endMs, stepSec);

  const isPlatform =
    requestedService.toLowerCase() === "platform" ||
    requestedService.toLowerCase() === "all";
  const serviceLabel = isPlatform
    ? 'service=~"PUBLIC|USER|STAFF|ORG|API|CONSOLE"'
    : `service="${normalizeServiceName(requestedService)}"`;

  const queryRequestsPerMin = `sum(rate(bw_http_requests_total{${serviceLabel}}[1m])) * 60`;
  const queryErrorRate = `sum(rate(bw_http_requests_total{${serviceLabel},status=~"5.."}[5m])) / sum(rate(bw_http_requests_total{${serviceLabel}}[5m]))`;
  const queryLatency = (q) =>
    `histogram_quantile(${q}, sum by (le) (rate(bw_http_request_duration_ms_bucket{${serviceLabel}}[5m])))`;

  try {
    const [reqResult, errResult, p50Result, p95Result, p99Result] = await Promise.all([
      prometheusQueryRange(queryRequestsPerMin, timeline),
      prometheusQueryRange(queryErrorRate, timeline),
      prometheusQueryRange(queryLatency(0.5), timeline),
      prometheusQueryRange(queryLatency(0.95), timeline),
      prometheusQueryRange(queryLatency(0.99), timeline),
    ]);

    const requestsPerMin = fillSeries(
      timeline.epochSecs,
      extractSingleMatrixValues(reqResult),
    );
    const errorRate = fillSeries(
      timeline.epochSecs,
      extractSingleMatrixValues(errResult),
    );
    const latencyP50 = fillSeries(
      timeline.epochSecs,
      extractSingleMatrixValues(p50Result),
    );
    const latencyP95 = fillSeries(
      timeline.epochSecs,
      extractSingleMatrixValues(p95Result),
    );
    const latencyP99 = fillSeries(
      timeline.epochSecs,
      extractSingleMatrixValues(p99Result),
    );

    const anyData =
      requestsPerMin.some((v) => typeof v === "number") ||
      errorRate.some((v) => typeof v === "number") ||
      latencyP95.some((v) => typeof v === "number");

    res.json({
      ok: true,
      service: isPlatform ? "platform" : normalizeServiceName(requestedService),
      range,
      stepSec,
      generatedAt: new Date().toISOString(),
      empty: !anyData,
      timestamps: timeline.timestamps,
      requestsPerMin,
      errorRate,
      latencyP50,
      latencyP95,
      latencyP99,
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      range,
      service: isPlatform ? "platform" : normalizeServiceName(requestedService),
      error: error instanceof Error ? error.message : "Prometheus error",
    });
  }
});

app.get("/ops/errors", (req, res) => {
  noStore(res);
  const range = String(req.query.range ?? "1h");
  const service = String(req.query.service ?? "API");
  const query = String(req.query.query ?? "").toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 200), 500);
  const cutoff = Date.now() - parseRangeMs(range);

  const items = errorBuffer
    .list()
    .filter((item) => new Date(item.timestamp).getTime() >= cutoff)
    .filter((item) => {
      if (!service) return true;
      if (service.toLowerCase() === "platform" || service.toLowerCase() === "all") {
        return true;
      }
      return item.service === service.toUpperCase() || item.service === service;
    })
    .filter((item) =>
      query
        ? `${item.message} ${item.route ?? ""} ${item.traceId ?? ""}`
            .toLowerCase()
            .includes(query)
        : true,
    )
    .slice(-limit)
    .reverse();

  res.json({ ok: true, range, service, items });
});

function hrTimeToMs(hrTime) {
  if (!hrTime || hrTime.length < 2) return 0;
  return hrTime[0] * 1000 + hrTime[1] / 1e6;
}

app.get("/ops/traces", (req, res) => {
  noStore(res);
  const range = String(req.query.range ?? "1h");
  const service = String(req.query.service ?? "API");
  const query = String(req.query.query ?? "").toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 100), 300);
  const cutoff = Date.now() - parseRangeMs(range);

  if (service && service.toUpperCase() !== "API" && service.toLowerCase() !== "platform") {
    return res.json({ ok: true, range, service, items: [] });
  }

  const spans = traceBuffer
    .list()
    .filter((span) => hrTimeToMs(span.startTime) >= cutoff)
    .filter((span) => (query ? span.name.toLowerCase().includes(query) : true));

  const grouped = new Map();
  for (const span of spans) {
    const context = span.spanContext();
    const traceId = context.traceId;
    if (!grouped.has(traceId)) {
      grouped.set(traceId, []);
    }
    grouped.get(traceId).push(span);
  }

  const traces = Array.from(grouped.entries())
    .map(([traceId, traceSpans]) => {
      const sorted = traceSpans.sort(
        (a, b) => hrTimeToMs(a.startTime) - hrTimeToMs(b.startTime),
      );
      const root = sorted.find((span) => !span.parentSpanId) ?? sorted[0];
      const start = hrTimeToMs(root.startTime);
      const end = hrTimeToMs(root.endTime ?? root.startTime);
      const durationMs = Math.max(0, end - start);
      return {
        id: traceId,
        name: root.name,
        durationMs,
        status: root.status?.code === 2 ? "error" : "ok",
        timestamp: new Date(start).toISOString(),
        spans: sorted.map((span) => ({
          id: span.spanContext().spanId,
          name: span.name,
          parentId: span.parentSpanId ?? null,
          durationMs: Math.max(0, hrTimeToMs(span.endTime ?? span.startTime) - hrTimeToMs(span.startTime)),
        })),
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  res.json({ ok: true, range, service, items: traces });
});

app.get("/ops/logs", (req, res) => {
  noStore(res);
  const range = String(req.query.range ?? "1h");
  const service = String(req.query.service ?? "API");
  const level = String(req.query.level ?? "").toLowerCase();
  const query = String(req.query.query ?? "").toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 200), 500);
  const cutoff = Date.now() - parseRangeMs(range);

  const items = logBuffer
    .list()
    .filter((item) => new Date(item.timestamp).getTime() >= cutoff)
    .filter((item) => {
      if (!service) return true;
      if (service.toLowerCase() === "platform" || service.toLowerCase() === "all") {
        return true;
      }
      return item.service === service.toUpperCase() || item.service === service;
    })
    .filter((item) => (level ? item.level === level : true))
    .filter((item) =>
      query
        ? `${item.message} ${item.route ?? ""}`.toLowerCase().includes(query)
        : true,
    )
    .slice(-limit)
    .reverse();

  res.json({ ok: true, range, service, items });
});

// Convenience / legacy helpers (keep working)
addAlias("/ready", "/api/ready", async (req, res) => {
  noStore(res);
  try {
    await pool.query("select 1");
    res.json({ ok: true, service: "api", db: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, service: "api", db: "down", error: String(e) });
  }
});

addAlias("/db-health", "/api/db-health", async (req, res) => {
  noStore(res);
  try {
    const { rows } = await pool.query("select now() as now");
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

addAlias("/db-proof", "/api/db-proof", async (req, res) => {
  noStore(res);
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ ok: false });
  }

  const table = "bw_neon_proof";
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        message TEXT NOT NULL
      );
    `);

    const ins = await pool.query(
      `INSERT INTO ${table} (message) VALUES ($1) RETURNING id, created_at, message`,
      [`proof-${new Date().toISOString()}`]
    );

    const cols = await pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
      `,
      [table]
    );

    const rows = await pool.query(`SELECT id, created_at, message FROM ${table} ORDER BY id DESC LIMIT 5;`);

    return res.json({
      ok: true,
      table,
      inserted: ins.rows[0],
      columns: cols.rows,
      lastRows: rows.rows,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function getR2Client() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");
  const publicBaseUrl = optionalEnv("R2_PUBLIC_BASE_URL")?.replace(/\/+$/, "");
  const endpoint =
    optionalEnv("R2_ENDPOINT")?.replace(/\/+$/, "") ??
    `https://${accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket, publicBaseUrl };
}

function checkUploadToken(req) {
  const required = process.env.R2_UPLOAD_TOKEN;
  if (!required) return null;
  const provided = req.headers["x-upload-token"];
  if (!provided || provided !== required) return "Unauthorized";
  return null;
}

function getBearerToken(req) {
  const raw = req.headers.authorization;
  if (!raw) return null;
  const [type, token] = raw.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

function sanitizeFilename(name) {
  return String(name || "upload.bin")
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replaceAll("..", "_")
    .replace(/[^\w.\-()+@ ]/g, "_")
    .trim()
    .slice(0, 120);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

addAlias("/r2-upload", "/api/r2-upload", (req, res) => {
  noStore(res);
  return upload.single("file")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 15 MB)." : String(err);
      return res.status(413).json({ ok: false, error: msg });
    }

    try {
      const authError = checkUploadToken(req);
      if (authError) return res.status(401).json({ ok: false, error: authError });

      const file = req.file;
      if (!file) {
        return res.status(400).json({ ok: false, error: "Missing file field 'file'." });
      }

      const { client, bucket, publicBaseUrl } = getR2Client();

      const safeName = sanitizeFilename(file.originalname);
      const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;

      const result = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || "application/octet-stream",
        })
      );

      const url = publicBaseUrl ? `${publicBaseUrl}/${key}` : undefined;
      return res.status(200).json({ ok: true, key, etag: result.ETag, url });
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: e instanceof Error ? e.message : "Upload failed." });
    }
  });
});

addAlias("/auth/bootstrap", "/api/auth/bootstrap", async (req, res) => {
  noStore(res);

  const rawEmail = process.env.NO_AUTH_EMAIL ?? "no-auth@bridgeworks.local";
  const normalizedEmail = rawEmail.trim().toLowerCase();
  const now = new Date();

  let userRow = null;
  try {
    const existing = await pool.query(
      'SELECT id, email FROM "User" WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      userRow = existing.rows[0];
      await pool.query(
        'UPDATE "User" SET "lastLoginAt" = $2, "updatedAt" = $2 WHERE id = $1',
        [userRow.id, now]
      );
    } else {
      const newId = crypto.randomUUID();
      const insert = await pool.query(
        'INSERT INTO "User" (id, email, status, "lastLoginAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4, $4) RETURNING id, email',
        [newId, normalizedEmail, "ACTIVE", now]
      );
      userRow = insert.rows[0];
    }

    await pool.query(
      'INSERT INTO "AuthAccount" (provider, "providerAccountId", "userId", "lastUsedAt") VALUES ($1, $2, $3, $4) ON CONFLICT (provider, "providerAccountId") DO UPDATE SET "userId" = EXCLUDED."userId", "lastUsedAt" = EXCLUDED."lastUsedAt"',
      ["NO_AUTH", normalizedEmail, userRow.id, now]
    );

    return res.json({
      ok: true,
      authProvider: "NO_AUTH",
      user: { id: userRow.id, email: userRow.email },
      access: {
        isStaff: true,
        isTenant: true,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

const port = process.env.PORT || 3103;
app.listen(port, "0.0.0.0", () => console.log("listening on", port));
