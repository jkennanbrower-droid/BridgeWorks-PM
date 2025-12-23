import type { ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Popover from "@radix-ui/react-popover";
import * as Tabs from "@radix-ui/react-tabs";
import CountUp from "react-countup";
import { format } from "date-fns";
import {
  Activity,
  Copy,
  Database,
  Gauge,
  FlaskConical,
  MoreVertical,
  Percent,
  RefreshCw,
  TriangleAlert,
  Zap,
} from "lucide-react";

import { LineChartPanel } from "./charts/LineChartPanel";
import { HealthTabs } from "./HealthTabs";

type TrendMetric = "latency" | "errorRate" | "requests";

type ChartPoint = {
  timestamp: string;
  value: number | null;
};

type OverallHealthHeaderProps = {
  statusLabel: string;
  statusTone: "ok" | "warn" | "down" | "unknown";
  healthScore: number;
  serviceCounts: { total: number; degraded: number; outage: number };
  kpis: {
    availability: number | null;
    errorRate: number | null;
    p95Latency: number | null;
    dbLatency: number | null;
    dbOk: boolean | null;
    dbStatusLabel?: string | null;
  };
  trend: {
    latency: ChartPoint[];
    errorRate: ChartPoint[];
    requests: ChartPoint[];
  };
  activeTrend: TrendMetric;
  onTrendChange: (value: TrendMetric) => void;
  range: string;
  onRangeChange: (value: string) => void;
  refreshMs: number;
  onRefreshChange: (value: number) => void;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onCopySummary: () => void;
  onCreateIncident: () => void;
  onRefreshNow: () => void;
  onTestHealth: () => void;
  onStressTest: () => void;
  isTestRunning: boolean;
  isStressRunning: boolean;
};

const STATUS_TONES: Record<OverallHealthHeaderProps["statusTone"], string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  down: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

const AUTO_REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "30s", value: 30_000 },
  { label: "60s", value: 60_000 },
  { label: "5m", value: 300_000 },
];

const RANGE_OPTIONS = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

const TREND_TABS: { value: TrendMetric; label: string; color: string }[] = [
  { value: "latency", label: "Latency (p95)", color: "#2563eb" },
  { value: "errorRate", label: "Error rate", color: "#db2777" },
  { value: "requests", label: "Requests/min", color: "#16a34a" },
];

type HealthHeaderProps = Pick<
  OverallHealthHeaderProps,
  | "range"
  | "onRangeChange"
  | "refreshMs"
  | "onRefreshChange"
  | "lastUpdated"
  | "isRefreshing"
  | "onCopySummary"
  | "onCreateIncident"
  | "onRefreshNow"
  | "onTestHealth"
  | "onStressTest"
  | "isTestRunning"
  | "isStressRunning"
>;

function HealthHeaderTitle() {
  return (
    <div className="min-w-[16rem]">
      <h1 className="text-2xl font-semibold text-slate-900">Platform Health</h1>
      <p className="mt-2 text-sm text-slate-600">
        Service status and operational signals across BridgeWorks.
      </p>
    </div>
  );
}

function HealthHeaderMeta({
  lastUpdated,
  isRefreshing,
  refreshMs,
}: Pick<HealthHeaderProps, "lastUpdated" | "isRefreshing" | "refreshMs">) {
  const showAutoRefresh = refreshMs > 0;

  return (
    <div className="flex items-center justify-end">
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
        {showAutoRefresh ? (
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              isRefreshing ? "bg-sky-500 animate-pulse" : "bg-emerald-500"
            }`}
          />
        ) : null}
        <span className="whitespace-nowrap">
          Last updated {lastUpdated ? format(lastUpdated, "h:mm a") : "Not updated"}
          {isRefreshing ? " (refreshing)" : ""}
        </span>
      </span>
    </div>
  );
}

function HealthHeaderControls({
  range,
  onRangeChange,
  refreshMs,
  onRefreshChange,
}: Pick<HealthHeaderProps, "range" | "onRangeChange" | "refreshMs" | "onRefreshChange">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 shadow-sm">
        <span className="text-xs font-semibold text-slate-500">Range</span>
        <select
          value={range}
          onChange={(event) => onRangeChange(event.target.value)}
          aria-label="Time range"
          className="h-10 bg-transparent pr-2 text-sm font-semibold text-slate-700 outline-none"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 shadow-sm">
        <span className="text-xs font-semibold text-slate-500">Refresh</span>
        <select
          value={refreshMs}
          onChange={(event) => onRefreshChange(Number(event.target.value))}
          aria-label="Auto refresh interval"
          className="h-10 bg-transparent pr-2 text-sm font-semibold text-slate-700 outline-none"
        >
          {AUTO_REFRESH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function HealthHeaderActions({
  onCopySummary,
  onCreateIncident,
  onRefreshNow,
  onTestHealth,
  onStressTest,
  isTestRunning,
  isStressRunning,
}: Pick<
  HealthHeaderProps,
  | "onCopySummary"
  | "onCreateIncident"
  | "onRefreshNow"
  | "onTestHealth"
  | "onStressTest"
  | "isTestRunning"
  | "isStressRunning"
>) {
  const menuItemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCreateIncident}
        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Create incident
      </button>

      <button
        type="button"
        onClick={onRefreshNow}
        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 max-[600px]:hidden"
      >
        Refresh now
      </button>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            role="menu"
            aria-label="More actions"
            className="z-50 w-56 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg outline-none"
          >
            <Popover.Close asChild>
              <button
                type="button"
                onClick={onRefreshNow}
                className={`${menuItemClass} max-[600px]:flex min-[601px]:hidden`}
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
                Refresh now
              </button>
            </Popover.Close>

            <Popover.Close asChild>
              <button
                type="button"
                onClick={onTestHealth}
                disabled={isTestRunning}
                className={menuItemClass}
              >
                <FlaskConical className="h-4 w-4 text-slate-500" />
                {isTestRunning ? "Testing health" : "Test Health"}
              </button>
            </Popover.Close>

            <Popover.Close asChild>
              <button
                type="button"
                onClick={onStressTest}
                disabled={isStressRunning}
                className={menuItemClass}
              >
                <Zap className="h-4 w-4 text-slate-500" />
                {isStressRunning ? "Stress running" : "Stress Test"}
              </button>
            </Popover.Close>

            <Popover.Close asChild>
              <button type="button" onClick={onCopySummary} className={menuItemClass}>
                <Copy className="h-4 w-4 text-slate-500" />
                Copy status summary
              </button>
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function HealthHeader(props: HealthHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <HealthHeaderTitle />
        <HealthHeaderMeta
          lastUpdated={props.lastUpdated}
          isRefreshing={props.isRefreshing}
          refreshMs={props.refreshMs}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="order-1 w-full min-[900px]:w-auto">
          <HealthTabs active="platform" />
        </div>
        <div className="order-2 w-full min-[900px]:w-auto min-[900px]:flex-1 min-[900px]:justify-center">
          <div className="flex justify-start min-[900px]:justify-center">
            <HealthHeaderControls
              range={props.range}
              onRangeChange={props.onRangeChange}
              refreshMs={props.refreshMs}
              onRefreshChange={props.onRefreshChange}
            />
          </div>
        </div>
        <div className="order-3 w-full min-[900px]:w-auto min-[900px]:ml-auto">
          <HealthHeaderActions
            onCopySummary={props.onCopySummary}
            onCreateIncident={props.onCreateIncident}
            onRefreshNow={props.onRefreshNow}
            onTestHealth={props.onTestHealth}
            onStressTest={props.onStressTest}
            isTestRunning={props.isTestRunning}
            isStressRunning={props.isStressRunning}
          />
        </div>
      </div>
    </div>
  );
}

export function OverallHealthHeader({
  statusLabel,
  statusTone,
  healthScore,
  serviceCounts,
  kpis,
  trend,
  activeTrend,
  onTrendChange,
  range,
  onRangeChange,
  refreshMs,
  onRefreshChange,
  lastUpdated,
  isRefreshing,
  onCopySummary,
  onCreateIncident,
  onRefreshNow,
  onTestHealth,
  onStressTest,
  isTestRunning,
  isStressRunning,
}: OverallHealthHeaderProps) {
  const dbSubtitle =
    kpis.dbStatusLabel ??
    (kpis.dbOk === null ? "Unknown" : kpis.dbOk ? "OK" : "Down");

  return (
    <div className="-mx-6 border-b border-slate-200 bg-slate-50/95 px-6 pb-6 pt-4 backdrop-blur">
      <HealthHeader
        range={range}
        onRangeChange={onRangeChange}
        refreshMs={refreshMs}
        onRefreshChange={onRefreshChange}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onCopySummary={onCopySummary}
        onCreateIncident={onCreateIncident}
        onRefreshNow={onRefreshNow}
        onTestHealth={onTestHealth}
        onStressTest={onStressTest}
        isTestRunning={isTestRunning}
        isStressRunning={isStressRunning}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_TONES[statusTone]}`}
            >
              {statusLabel}
            </span>
            {statusTone === "down" ? (
              <TriangleAlert className="h-5 w-5 text-rose-500" />
            ) : null}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Combined Health Score
            </p>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              <CountUp end={healthScore} duration={0.6} preserveValue />
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <p>Total services: {serviceCounts.total}</p>
            <p>Degraded: {serviceCounts.degraded}</p>
            <p>Outage: {serviceCounts.outage}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <KpiTile
              icon={Gauge}
              label="Avg Availability"
              value={kpis.availability}
              suffix="%"
              threshold={{ warn: 98, danger: 95 }}
            />
            <KpiTile
              icon={Percent}
              label="Avg Error Rate"
              value={kpis.errorRate}
              suffix="%"
              threshold={{ warn: 2, danger: 5 }}
              invert
            />
            <KpiTile
              icon={Activity}
              label="Avg P95 Latency"
              value={kpis.p95Latency}
              suffix="ms"
              threshold={{ warn: 600, danger: 1200 }}
              precision={0}
            />
            <KpiTile
              icon={Database}
              label="DB Health"
              value={kpis.dbLatency}
              suffix="ms"
              subtitle={dbSubtitle}
              threshold={{ warn: 400, danger: 800 }}
              precision={0}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Tabs.Root
              value={activeTrend}
              onValueChange={(value) => onTrendChange(value as TrendMetric)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Overall Trend
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Live platform movement
                  </p>
                </div>
                <Tabs.List className="flex flex-wrap gap-2">
                  {TREND_TABS.map((tab) => (
                    <Tabs.Trigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </div>
              <div className="mt-4">
                <AnimatePresence mode="wait">
                  {TREND_TABS.map((tab) =>
                    tab.value === activeTrend ? (
                      <motion.div
                        key={tab.value}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                      >
                        <LineChartPanel
                          data={trend[tab.value]}
                          color={tab.color}
                          valueFormatter={(value) =>
                            value === null
                              ? "--"
                              : tab.value === "errorRate"
                                ? `${value.toFixed(2)}%`
                                : tab.value === "requests"
                                  ? `${value.toFixed(1)} rpm`
                                  : `${value.toFixed(0)} ms`
                          }
                        />
                      </motion.div>
                    ) : null,
                  )}
                </AnimatePresence>
              </div>
            </Tabs.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

type KpiTileProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  suffix?: string;
  subtitle?: string;
  threshold: { warn: number; danger: number };
  precision?: number;
  invert?: boolean;
};

function KpiTile({
  icon: Icon,
  label,
  value,
  suffix,
  subtitle,
  threshold,
  precision = 2,
  invert = false,
}: KpiTileProps) {
  const displayValue = value ?? null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Icon className="h-4 w-4 text-slate-400" />
          {label}
        </div>
        {subtitle ? (
          <span className="text-xs font-semibold text-slate-500">{subtitle}</span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">
        {displayValue === null ? (
          "--"
        ) : (
          <CountUp
            end={displayValue}
            duration={0.6}
            decimals={precision}
            preserveValue
          />
        )}
        {suffix ? <span className="text-sm text-slate-500"> {suffix}</span> : null}
      </div>
      <ThresholdBar
        value={displayValue}
        warn={threshold.warn}
        danger={threshold.danger}
        invert={invert}
      />
    </div>
  );
}

type ThresholdBarProps = {
  value: number | null;
  warn: number;
  danger: number;
  invert?: boolean;
};

function ThresholdBar({ value, warn, danger, invert = false }: ThresholdBarProps) {
  const percentage =
    value === null
      ? 0
      : Math.min(100, Math.max(0, (value / danger) * 100));

  const indicatorStyle = {
    left: `${percentage}%`,
  };

  return (
    <div className="mt-3">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-0 flex">
          <div className="h-full w-2/3 bg-emerald-400/70" />
          <div className="h-full w-1/6 bg-amber-400/70" />
          <div className="h-full w-1/6 bg-rose-400/70" />
        </div>
        <span
          className={`absolute top-0 h-full w-1 ${
            invert ? "bg-emerald-700" : "bg-slate-900"
          }`}
          style={indicatorStyle}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span>{warn}</span>
        <span>{danger}</span>
      </div>
    </div>
  );
}
