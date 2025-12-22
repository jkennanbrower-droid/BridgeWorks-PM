import { performance } from "node:perf_hooks";

import promClient from "prom-client";

const DEFAULT_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2000, 4000];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_24_RE = /^[0-9a-f]{24}$/i;
const HEX_32_RE = /^[0-9a-f]{32}$/i;
const DIGITS_RE = /^\d+$/;

function trimSlashes(pathname) {
  if (!pathname) return "/";
  const cleaned = String(pathname).split("?")[0].trim();
  if (!cleaned || cleaned === "/") return "/";
  const withLeading = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

function normalizeSegment(segment) {
  if (!segment) return "";
  if (segment.startsWith(":")) return ":id";
  if (segment.startsWith("[") && segment.endsWith("]")) return ":id";
  if (DIGITS_RE.test(segment)) return ":id";
  if (UUID_RE.test(segment)) return ":id";
  if (HEX_24_RE.test(segment) || HEX_32_RE.test(segment)) return ":id";
  const looksLikeId =
    segment.length >= 16 &&
    /[0-9]/.test(segment) &&
    /[a-z]/i.test(segment) &&
    /^[a-z0-9_-]+$/i.test(segment);
  if (looksLikeId) return ":id";
  return segment;
}

export function normalizeRouteLabel(pathname) {
  const base = trimSlashes(pathname);
  if (base === "/") return "/";
  const normalized = base
    .split("/")
    .map((segment, index) => (index === 0 ? "" : normalizeSegment(segment)))
    .join("/");
  return normalized.length > 160 ? normalized.slice(0, 160) : normalized;
}

function joinPaths(a, b) {
  const left = trimSlashes(a);
  const right = trimSlashes(b);
  if (left === "/") return right;
  if (right === "/") return left;
  return `${left}${right}`;
}

function resolveExpressRoute(req) {
  const routePath = req?.route?.path;
  if (typeof routePath === "string") {
    return normalizeRouteLabel(joinPaths(req.baseUrl ?? "", routePath));
  }
  return normalizeRouteLabel(req?.path ?? req?.originalUrl ?? "unknown");
}

function resolveNextRoute(request, routeOverride) {
  if (routeOverride) return normalizeRouteLabel(routeOverride);
  const pathname =
    request?.nextUrl?.pathname ??
    (typeof request?.url === "string" ? new URL(request.url).pathname : "");
  return normalizeRouteLabel(pathname || "unknown");
}

export function createHttpMetrics({
  serviceName,
  registry,
  bucketsMs = DEFAULT_BUCKETS_MS,
  collectDefault = true,
} = {}) {
  if (!serviceName) {
    throw new Error("createHttpMetrics requires serviceName");
  }

  const reg = registry ?? new promClient.Registry();
  if (collectDefault) {
    promClient.collectDefaultMetrics({ register: reg });
  }

  const httpRequestsTotal = new promClient.Counter({
    name: "bw_http_requests_total",
    help: "HTTP requests total",
    registers: [reg],
    labelNames: ["service", "method", "route", "status"],
  });

  const httpRequestDurationMs = new promClient.Histogram({
    name: "bw_http_request_duration_ms",
    help: "HTTP request duration in ms",
    registers: [reg],
    labelNames: ["service", "method", "route", "status"],
    buckets: bucketsMs,
  });

  function observe({ method, route, status, durationMs }) {
    const labelValues = [
      String(serviceName).toUpperCase(),
      String(method || "UNKNOWN").toUpperCase(),
      normalizeRouteLabel(route || "unknown"),
      String(status || "0"),
    ];
    httpRequestsTotal.labels(...labelValues).inc(1);
    httpRequestDurationMs.labels(...labelValues).observe(durationMs);
  }

  function expressMiddleware(req, res, next) {
    const requestPath = String(req?.path ?? req?.originalUrl ?? "").split("?")[0];
    if (requestPath === "/metrics" || requestPath.startsWith("/metrics/")) {
      return next();
    }
    const started = performance.now();
    res.on("finish", () => {
      observe({
        method: req.method,
        route: resolveExpressRoute(req),
        status: res.statusCode,
        durationMs: performance.now() - started,
      });
    });
    next();
  }

  function withRouteHandler(handler, { route } = {}) {
    return async function wrappedRouteHandler(...args) {
      const request = args[0];
      const started = performance.now();
      try {
        const response = await handler(...args);
        observe({
          method: request?.method,
          route: resolveNextRoute(request, route),
          status: response?.status ?? 200,
          durationMs: performance.now() - started,
        });
        return response;
      } catch (error) {
        observe({
          method: request?.method,
          route: resolveNextRoute(request, route),
          status: 500,
          durationMs: performance.now() - started,
        });
        throw error;
      }
    };
  }

  async function metricsText() {
    return await reg.metrics();
  }

  return {
    registry: reg,
    httpRequestsTotal,
    httpRequestDurationMs,
    expressMiddleware,
    withRouteHandler,
    metricsText,
  };
}
