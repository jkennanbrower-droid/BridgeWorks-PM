import type promClient from "prom-client";

export type CreateHttpMetricsOptions = {
  serviceName: string;
  registry?: promClient.Registry;
  bucketsMs?: number[];
  collectDefault?: boolean;
};

export type AnyRouteHandler = (...args: any[]) => Response | Promise<Response>;

export type HttpMetrics = {
  registry: promClient.Registry;
  httpRequestsTotal: promClient.Counter<"service" | "method" | "route" | "status">;
  httpRequestDurationMs: promClient.Histogram<
    "service" | "method" | "route" | "status"
  >;
  expressMiddleware: (
    req: any,
    res: any,
    next: (err?: unknown) => void,
  ) => void;
  withRouteHandler: <T extends AnyRouteHandler>(
    handler: T,
    opts?: { route?: string },
  ) => T;
  metricsText: () => Promise<string>;
};

export function normalizeRouteLabel(pathname: string): string;

export function createHttpMetrics(options: CreateHttpMetricsOptions): HttpMetrics;

