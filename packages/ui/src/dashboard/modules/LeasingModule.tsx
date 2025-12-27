"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDemoActorId, getDemoOrgId } from "../demoSession";

declare const process: {
  env: Record<string, string | undefined>;
};

const apiBaseRaw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
const apiBase = apiBaseRaw.replace(/\/+$/, "");

function normalizeApiPath(path: string) {
  if (apiBase.endsWith("/api")) return path.startsWith("/") ? path : `/${path}`;
  if (path.startsWith("/api/")) return path;
  if (path === "/api") return path;
  return path.startsWith("/") ? `/api${path}` : `/api/${path}`;
}

async function apiJson<T>(path: string, init: RequestInit = {}) {
  if (!apiBase) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set.");
  const res = await fetch(`${apiBase}${normalizeApiPath(path)}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await res.json();
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? "Request failed.");
  }
  return payload as T;
}

const STAGE_TABS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "NEEDS_INFO", label: "Needs Info" },
  { key: "DECISIONED", label: "Decisioned" },
  { key: "CLOSED", label: "Closed" },
] as const;

const UNIT_TYPES = [
  { value: "STUDIO", label: "Studio" },
  { value: "ONE_BED", label: "1BR" },
  { value: "TWO_BED", label: "2BR" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "PRIORITY", label: "Priority" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

const SORT_OPTIONS = [
  { value: "activity_desc", label: "Recent activity" },
  { value: "activity_asc", label: "Oldest activity" },
  { value: "submitted_desc", label: "Newest submitted" },
  { value: "submitted_asc", label: "Oldest submitted" },
  { value: "sla_asc", label: "SLA priority" },
  { value: "risk_desc", label: "Highest risk" },
] as const;

const INFO_TEMPLATES = [
  { value: "CUSTOM", label: "Custom note", message: "" },
  { value: "MISSING_DOCS", label: "Missing documents", message: "Please upload the missing documents listed in your application." },
  { value: "PAYMENT", label: "Payment issue", message: "We need help resolving your application fee payment. Please retry the payment." },
  { value: "SCREENING", label: "Screening follow-up", message: "Please confirm your screening consent and required details." },
] as const;

type QueueItem = {
  applicationId: string;
  status: string;
  priority: string;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
  property: { id: string; name?: string | null; siteCode?: string | null };
  unit: { id: string; unitCode?: string | null; type?: string | null } | null;
  primaryApplicant: { partyId?: string | null; name?: string | null; email?: string | null; phone?: string | null };
  gates: {
    parties: string;
    docs: string;
    payment: string;
    screening: string;
    reservation: string;
    unitAvailability: string;
  };
  nextAction: { key: string; label: string; blockingReasonCodes: string[] };
  risk: { riskLevel?: string | null; riskScore?: number | null } | null;
  sla: { deadlineAt: string; breached: boolean; warning: boolean } | null;
  assignee: { userId: string; name: string } | null;
};

type QueueResponse = {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  facets: {
    byStatus: Record<string, number>;
    byUnitType: Record<string, number>;
    byPriority: Record<string, number>;
    byProperty: Array<{ propertyId: string; name?: string | null; count: number; siteCode?: string | null }>;
  };
  items: QueueItem[];
};

type FilterOptionsResponse = {
  ok: true;
  properties: Array<{ propertyId: string; name?: string | null; siteCode?: string | null }>;
  unitTypes: string[];
};

type ApplicationDetail = {
  application: {
    id: string;
    orgId: string;
    propertyId: string;
    unitId?: string | null;
    status: string;
    priority: string;
    applicationType: string;
    applicationFeeStatus?: string | null;
    submittedAt?: string | null;
    expiresAt?: string | null;
    withdrawnAt?: string | null;
    decisionedAt?: string | null;
    closedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  parties: Array<{
    id: string;
    role: string;
    status: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  }>;
  requirements: Array<{
    id: string;
    name: string;
    status: string;
    requirementType: string;
    description?: string | null;
    partyId?: string | null;
    infoRequestId?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    waivedAt?: string | null;
    metadata?: Record<string, any> | null;
    documents?: Array<{
      id: string;
      documentType: string;
      fileName: string;
      verificationStatus: string;
      rejectedReason?: string | null;
      publicUrl?: string | null;
    }>;
  }>;
  reservations: Array<{
    id: string;
    kind: string;
    status: string;
    expiresAt?: string | null;
    releaseReasonCode?: string | null;
    releasedAt?: string | null;
    createdAt?: string | null;
  }>;
  payments: Array<{
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    createdAt?: string | null;
    attempts: Array<{
      id: string;
      status: string;
      attemptNumber: number;
      failureCode?: string | null;
      failureMessage?: string | null;
      createdAt?: string | null;
    }>;
    refundRequests: Array<{ id: string; status: string; requestedAmountCents: number; reason: string }>;
  }>;
  infoRequests: Array<{
    id: string;
    status: string;
    message?: string | null;
    requestedItems?: Array<{ name: string; requirementType?: string; documentType?: string }>;
    respondedAt?: string | null;
    createdAt?: string | null;
  }>;
  decisions?: Array<{
    id: string;
    outcome: string;
    decisionDate?: string | null;
    decidedById?: string | null;
    notes?: string | null;
  }>;
  auditEvents?: Array<{ id: string; eventType: string; createdAt?: string | null; actorId: string }>;
};

type Note = {
  id: string;
  content: string;
  visibility: string;
  isPinned: boolean;
  createdAt: string | null;
};

type Flags = {
  missingDocs: boolean;
  paymentIssue: boolean;
  duplicate: boolean;
  stale: boolean;
  highRisk: boolean;
  hasReservation: boolean;
};

type QueueFilters = {
  propertyIds: string[];
  unitTypes: string[];
  status: string | null;
  priorities: string[];
  q: string;
  sort: string;
  flags: Flags;
};

type SavedView = {
  id: string;
  name: string;
  filters: QueueFilters;
};

const DEFAULT_FLAGS: Flags = {
  missingDocs: false,
  paymentIssue: false,
  duplicate: false,
  stale: false,
  highRisk: false,
  hasReservation: false,
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parseCsv(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function formatCurrency(amountCents?: number, currency?: string) {
  if (!Number.isFinite(amountCents)) return "-";
  const amount = Number(amountCents) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatTimeDistance(value?: string | null) {
  if (!value) return "-";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "-";
  const diffMs = target.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours <= -48) return `${Math.abs(diffHours)}h ago`;
  if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
  if (diffHours < 24) return `in ${diffHours}h`;
  const diffDays = Math.ceil(diffHours / 24);
  return `in ${diffDays}d`;
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {children}
    </span>
  );
}

function GateChip({ label, blocked }: { label: string; blocked: boolean }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
        blocked
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-white text-slate-500",
      )}
    >
      {label}
    </span>
  );
}

function SlaChip({ sla }: { sla: QueueItem["sla"] }) {
  if (!sla) return <span className="text-xs text-slate-400">-</span>;
  if (sla.breached) return <Pill tone="border-rose-200 bg-rose-50 text-rose-700">Breached</Pill>;
  if (sla.warning) return <Pill tone="border-amber-200 bg-amber-50 text-amber-700">At risk</Pill>;
  return <Pill tone="border-emerald-200 bg-emerald-50 text-emerald-700">On track</Pill>;
}

function RiskBadge({ risk }: { risk: QueueItem["risk"] }) {
  if (!risk) return <span className="text-xs text-slate-400">-</span>;
  const level = String(risk.riskLevel ?? "").toUpperCase();
  const tone = level === "HIGH" || level === "SEVERE"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : level === "MEDIUM"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <Pill tone={tone}>{level || "RISK"}</Pill>;
}

function NextActionChip({ action }: { action: QueueItem["nextAction"] }) {
  const tone = action.key === "WAITING_ON_APPLICANT"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : action.key === "NO_ACTION"
      ? "border-slate-200 bg-slate-50 text-slate-500"
      : action.key === "REVIEW"
        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  return <Pill tone={tone}>{action.label}</Pill>;
}

type TimelineEvent = {
  id: string;
  label: string;
  createdAt?: string | null;
  meta?: string | null;
};

function buildTimeline(detail: ApplicationDetail | null, notes: Note[]) {
  if (!detail) return [];
  const events: TimelineEvent[] = [];

  for (const event of detail.auditEvents ?? []) {
    events.push({
      id: `audit-${event.id}`,
      label: event.eventType.replace(/_/g, " "),
      createdAt: event.createdAt ?? null,
      meta: event.actorId ? `Actor ${event.actorId.slice(0, 6)}` : null,
    });
  }

  for (const info of detail.infoRequests ?? []) {
    if (info.createdAt) {
      events.push({
        id: `info-${info.id}`,
        label: "Info request sent",
        createdAt: info.createdAt,
        meta: info.message ?? null,
      });
    }
    if (info.respondedAt) {
      events.push({
        id: `info-response-${info.id}`,
        label: "Info request responded",
        createdAt: info.respondedAt,
        meta: info.message ?? null,
      });
    }
  }

  for (const payment of detail.payments ?? []) {
    if (payment.createdAt) {
      events.push({
        id: `payment-${payment.id}`,
        label: "Payment intent created",
        createdAt: payment.createdAt,
        meta: payment.status,
      });
    }
    for (const attempt of payment.attempts ?? []) {
      events.push({
        id: `attempt-${attempt.id}`,
        label: `Payment attempt ${attempt.attemptNumber}`,
        createdAt: attempt.createdAt ?? null,
        meta: attempt.status,
      });
    }
  }

  for (const decision of detail.decisions ?? []) {
    if (!decision.decisionDate) continue;
    events.push({
      id: `decision-${decision.id}`,
      label: `Decision ${decision.outcome.replace(/_/g, " ")}`,
      createdAt: decision.decisionDate,
      meta: decision.decidedById ? `By ${decision.decidedById.slice(0, 6)}` : null,
    });
  }

  for (const reservation of detail.reservations ?? []) {
    if (reservation.createdAt) {
      events.push({
        id: `reservation-${reservation.id}`,
        label: `${reservation.kind.replace(/_/g, " ")} created`,
        createdAt: reservation.createdAt,
        meta: reservation.status,
      });
    }
    if (reservation.releasedAt) {
      events.push({
        id: `reservation-release-${reservation.id}`,
        label: "Reservation released",
        createdAt: reservation.releasedAt,
        meta: reservation.releaseReasonCode ?? null,
      });
    }
  }

  for (const note of notes ?? []) {
    events.push({
      id: `note-${note.id}`,
      label: "Note added",
      createdAt: note.createdAt ?? null,
      meta: note.content?.slice(0, 80) ?? null,
    });
  }

  return events
    .filter((event) => event.createdAt)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}

function buildQuery(filters: QueueFilters, page: number, pageSize: number, selectedId: string | null) {
  const params = new URLSearchParams();
  if (filters.propertyIds.length) params.set("propertyId", filters.propertyIds.join(","));
  if (filters.unitTypes.length) params.set("unitType", filters.unitTypes.join(","));
  if (filters.status) params.set("status", filters.status);
  if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 25) params.set("pageSize", String(pageSize));
  if (filters.flags.missingDocs) params.set("missingDocs", "1");
  if (filters.flags.paymentIssue) params.set("paymentIssue", "1");
  if (filters.flags.duplicate) params.set("duplicate", "1");
  if (filters.flags.stale) params.set("stale", "1");
  if (filters.flags.highRisk) params.set("highRisk", "1");
  if (filters.flags.hasReservation) params.set("hasReservation", "1");
  if (selectedId) params.set("applicationId", selectedId);
  return params;
}

function parseQueryState(search: string) {
  const params = new URLSearchParams(search);
  const propertyIds = parseCsv(params.get("propertyId"));
  const unitTypes = parseCsv(params.get("unitType"));
  const status = parseCsv(params.get("status"))[0] ?? null;
  const priorities = parseCsv(params.get("priority"));
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "activity_desc";
  const page = Number(params.get("page")) || 1;
  const pageSize = Number(params.get("pageSize")) || 25;
  const selectedId = params.get("applicationId");
  const flags: Flags = {
    missingDocs: params.get("missingDocs") === "1",
    paymentIssue: params.get("paymentIssue") === "1",
    duplicate: params.get("duplicate") === "1",
    stale: params.get("stale") === "1",
    highRisk: params.get("highRisk") === "1",
    hasReservation: params.get("hasReservation") === "1",
  };

  return {
    filters: {
      propertyIds,
      unitTypes,
      status,
      priorities,
      q,
      sort,
      flags,
    } as QueueFilters,
    page,
    pageSize,
    selectedId: selectedId || null,
  };
}

function readContextPropertyId() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("bw.leasing.context.v1");
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.propertyId && typeof parsed.propertyId === "string") return parsed.propertyId;
  } catch {
    return null;
  }
  return null;
}

function ViewLabel({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

export function LeasingModule({ appId }: { appId: string }) {
  const orgId = useMemo(() => getDemoOrgId(appId), [appId]);
  const actorId = useMemo(() => getDemoActorId(appId), [appId]);

  const [filters, setFilters] = useState<QueueFilters>({
    propertyIds: [],
    unitTypes: [],
    status: "SUBMITTED",
    priorities: [],
    q: "",
    sort: "activity_desc",
    flags: DEFAULT_FLAGS,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [facets, setFacets] = useState<QueueResponse["facets"] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [unitTypeOpen, setUnitTypeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState("APPROVED");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestDeadline, setRequestDeadline] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [infoTemplate, setInfoTemplate] = useState("CUSTOM");
  const [reasonModal, setReasonModal] = useState<{
    open: boolean;
    title: string;
    confirmLabel: string;
    action: ((input: { reasonCode: string; reason: string }) => Promise<void>) | null;
  }>({ open: false, title: "", confirmLabel: "", action: null });
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const hydratedRef = useRef(false);

  const propertyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of facets?.byProperty ?? []) {
      map.set(entry.propertyId, entry.count);
    }
    return map;
  }, [facets]);

  const unitTypeCounts = useMemo(() => facets?.byUnitType ?? {}, [facets]);
  const priorityCounts = useMemo(() => facets?.byPriority ?? {}, [facets]);

  useEffect(() => {
    if (typeof window === "undefined" || hydratedRef.current) return;
    const parsed = parseQueryState(window.location.search);
    const contextPropertyId = readContextPropertyId();
    const nextFilters = { ...parsed.filters };
    if (parsed.filters.propertyIds.length === 0 && contextPropertyId) {
      nextFilters.propertyIds = [contextPropertyId];
    }
    setFilters(nextFilters);
    setSearchDraft(parsed.filters.q || "");
    setPage(parsed.page);
    setPageSize(parsed.pageSize);
    setSelectedId(parsed.selectedId);
    hydratedRef.current = true;

    const handlePopState = () => {
      const update = parseQueryState(window.location.search);
      setFilters(update.filters);
      setSearchDraft(update.filters.q || "");
      setPage(update.page);
      setPageSize(update.pageSize);
      setSelectedId(update.selectedId);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) return;
    const params = buildQuery(filters, page, pageSize, selectedId);
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [filters, page, pageSize, selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("bw.leasing.savedViews.v1");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSavedViews(parsed);
    } catch {
      // ignore invalid views
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("bw.leasing.savedViews.v1", JSON.stringify(savedViews));
  }, [savedViews]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        q: searchDraft.trim(),
      }));
      setPage(1);
      setSelectedId(null);
      setSelectedIds(new Set());
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    const template = INFO_TEMPLATES.find((item) => item.value === infoTemplate);
    if (!template) return;
    setRequestMessage(template.message);
  }, [infoTemplate]);

  const loadFilterOptions = useCallback(async () => {
    if (!orgId) return;
    try {
      const response = await apiJson<FilterOptionsResponse>(
        `/lease-applications/filter-options?orgId=${encodeURIComponent(orgId)}`,
      );
      setFilterOptions(response);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : "Unable to load filter options.");
    }
  }, [orgId]);

  const loadQueue = useCallback(async () => {
    if (!orgId) return;
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const params = new URLSearchParams();
      params.set("orgId", orgId);
      if (filters.propertyIds.length) params.set("propertyId", filters.propertyIds.join(","));
      if (filters.unitTypes.length) params.set("unitType", filters.unitTypes.join(","));
      if (filters.status) params.set("status", filters.status);
      if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
      if (filters.q) params.set("q", filters.q);
      if (filters.sort) params.set("sort", filters.sort);
      if (page) params.set("page", String(page));
      if (pageSize !== 25) params.set("pageSize", String(pageSize));
      if (filters.flags.missingDocs) params.set("missingDocs", "1");
      if (filters.flags.paymentIssue) params.set("paymentIssue", "1");
      if (filters.flags.duplicate) params.set("duplicate", "1");
      if (filters.flags.stale) params.set("stale", "1");
      if (filters.flags.highRisk) params.set("highRisk", "1");
      if (filters.flags.hasReservation) params.set("hasReservation", "1");

      const result = await apiJson<QueueResponse>(
        `/lease-applications/queue?${params.toString()}`,
      );
      setQueue(result.items ?? []);
      setFacets(result.facets ?? null);
      setTotal(result.total ?? 0);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : "Unable to load applications.");
      setQueue([]);
    } finally {
      setLoadingQueue(false);
    }
  }, [orgId, filters, page, pageSize, selectedId]);

  const loadDetail = useCallback(
    async (applicationId: string) => {
      if (!orgId || !applicationId) return;
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const result = await apiJson<ApplicationDetail>(
          `/lease-applications/${applicationId}/detail?orgId=${encodeURIComponent(orgId)}&actorId=${encodeURIComponent(actorId)}&source=staff_ui`,
        );
        setDetail(result);
      } catch (err) {
        setDetail(null);
        setDetailError(err instanceof Error ? err.message : "Unable to load detail.");
      } finally {
        setLoadingDetail(false);
      }
    },
    [orgId, actorId],
  );

  const loadNotes = useCallback(
    async (applicationId: string) => {
      if (!orgId || !applicationId) return;
      try {
        const result = await apiJson<{ notes: Note[] }>(
          `/lease-applications/${applicationId}/notes?orgId=${encodeURIComponent(orgId)}&viewerType=staff`,
        );
        setNotes(result.notes ?? []);
      } catch (err) {
        setNotes([]);
        setActionError(err instanceof Error ? err.message : "Unable to load notes.");
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setNotes([]);
      return;
    }
    setActionError(null);
    void loadDetail(selectedId);
    void loadNotes(selectedId);
  }, [selectedId, loadDetail, loadNotes]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (queue.length === 0) return new Set();
      const next = new Set<string>();
      for (const id of prev) {
        if (queue.some((item) => item.applicationId === id)) next.add(id);
      }
      return next;
    });
  }, [queue]);

  const selectedItem = useMemo(
    () => queue.find((item) => item.applicationId === selectedId) ?? null,
    [queue, selectedId],
  );

  const timeline = useMemo(() => buildTimeline(detail, notes), [detail, notes]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateFilters = (patch: Partial<QueueFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setSelectedId(null);
    setSelectedIds(new Set());
  };

  const refreshAfterAction = useCallback(async () => {
    if (selectedId) {
      await loadDetail(selectedId);
      await loadNotes(selectedId);
    }
    await loadQueue();
  }, [selectedId, loadDetail, loadNotes, loadQueue]);

  const openReasonModal = (
    title: string,
    confirmLabel: string,
    action: (input: { reasonCode: string; reason: string }) => Promise<void>,
  ) => {
    setReasonCode("");
    setReasonDetail("");
    setReasonModal({ open: true, title, confirmLabel, action });
  };

  const handleReasonConfirm = async () => {
    if (!reasonModal.action) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await reasonModal.action({ reasonCode: reasonCode.trim(), reason: reasonDetail.trim() });
      setReasonModal({ open: false, title: "", confirmLabel: "", action: null });
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const createNote = async (content: string) => {
    if (!orgId || !selectedId || !content.trim()) return;
    await apiJson(`/lease-applications/${selectedId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        orgId,
        authorId: actorId || orgId,
        actorType: "staff",
        visibility: "INTERNAL_STAFF_ONLY",
        content: content.trim(),
        isPinned: false,
      }),
    });
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await createNote(noteDraft);
      setNoteDraft("");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add note.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendReminder = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      await createNote("Reminder sent to applicant.");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to send reminder.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestMissingDocs = async () => {
    if (!selectedId || !orgId) return;
    const missing = (detail?.requirements ?? []).filter((req) =>
      ["PENDING", "IN_PROGRESS", "SUBMITTED", "REJECTED", "EXPIRED"].includes(req.status),
    );
    if (missing.length === 0) {
      setNotice("No missing requirements to request.");
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      const itemsToRequest = missing.map((req) => ({
        name: req.name,
        description: req.description ?? undefined,
        requirementType: req.requirementType,
        documentType: req.metadata?.documentType,
        partyId: req.partyId ?? undefined,
        isRequired: true,
        metadata: requestDeadline ? { dueDate: requestDeadline } : undefined,
      }));

      await apiJson(`/lease-applications/${selectedId}/info-requests`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          message: requestMessage || "Please provide the missing items.",
          itemsToRequest,
        }),
      });

      setRequestMessage("");
      setRequestDeadline("");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to request documents.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateInfoRequest = async () => {
    if (!selectedId || !orgId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const deadlineNote = requestDeadline ? ` Deadline: ${requestDeadline}` : "";
      await apiJson(`/lease-applications/${selectedId}/info-requests`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          message: `${requestMessage || "Please respond with the requested information."}${deadlineNote}`,
          itemsToRequest: [],
        }),
      });
      setRequestMessage("");
      setRequestDeadline("");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to create info request.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleVerifyDocument = async (documentId: string, action: "VERIFY" | "REJECT") => {
    if (!selectedId || !orgId) return;
    if (action === "REJECT") {
      openReasonModal("Reject document", "Reject", async ({ reasonCode, reason }) => {
        await apiJson(`/lease-applications/${selectedId}/documents/${documentId}/verify`, {
          method: "POST",
          body: JSON.stringify({
            orgId,
            action,
            reviewerId: actorId || orgId,
            rejectedReason: reasonCode || reason || "REJECTED",
          }),
        });
      });
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      await apiJson(`/lease-applications/${selectedId}/documents/${documentId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          action,
          reviewerId: actorId || orgId,
        }),
      });
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to verify document.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!selectedId || !orgId) return;
    const amountCents = detail?.payments?.[0]?.amountCents ?? 5000;
    const currency = detail?.payments?.[0]?.currency ?? "USD";
    setActionBusy(true);
    setActionError(null);
    try {
      await apiJson(`/lease-applications/${selectedId}/payments/application-fee`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          amountCents,
          currency,
        }),
      });
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to retry payment.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDecision = async () => {
    if (!selectedId || !orgId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await apiJson(`/lease-applications/${selectedId}/decisions`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          decidedById: actorId || orgId,
          outcome: decisionOutcome,
          notes: decisionNote || undefined,
        }),
      });
      setDecisionNote("");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to record decision.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReleaseReservation = (reservationId: string) => {
    if (!selectedId || !orgId) return;
    openReasonModal("Release reservation", "Release", async ({ reasonCode, reason }) => {
      await apiJson(`/lease-applications/${selectedId}/reservations/${reservationId}/release`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          releasedById: actorId || orgId,
          reasonCode: reasonCode || "STAFF_RELEASED",
          reason: reason || undefined,
        }),
      });
    });
  };

  const handleCloseApplication = () => {
    if (!selectedId || !orgId) return;
    openReasonModal("Close application", "Close", async ({ reasonCode, reason }) => {
      await apiJson(`/lease-applications/${selectedId}/withdraw`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          withdrawnById: actorId || orgId,
          reasonCode: reasonCode || "STAFF_CLOSED",
          reason: reason || undefined,
        }),
      });
    });
  };

  const handleMarkInReview = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      await createNote("Marked in review by staff.");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to mark in review.");
    } finally {
      setActionBusy(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    updateFilters({
      propertyIds: filters.propertyIds.includes(propertyId)
        ? filters.propertyIds.filter((value) => value !== propertyId)
        : [...filters.propertyIds, propertyId],
    });
  };

  const toggleUnitType = (unitType: string) => {
    updateFilters({
      unitTypes: filters.unitTypes.includes(unitType)
        ? filters.unitTypes.filter((value) => value !== unitType)
        : [...filters.unitTypes, unitType],
    });
  };

  const togglePriority = (priority: string) => {
    updateFilters({
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((value) => value !== priority)
        : [...filters.priorities, priority],
    });
  };

  const toggleFlag = (flag: keyof Flags) => {
    updateFilters({
      flags: {
        ...filters.flags,
        [flag]: !filters.flags[flag],
      },
    });
  };

  const handleSaveView = () => {
    const name = typeof window !== "undefined" ? window.prompt("Save view as") : null;
    if (!name) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
    setSavedViews((prev) => [
      ...prev,
      {
        id,
        name,
        filters: { ...filters, q: filters.q.trim() },
      },
    ]);
    setViewsOpen(false);
  };

  const applyView = (view: SavedView) => {
    setFilters(view.filters);
    setSearchDraft(view.filters.q || "");
    setPage(1);
    setSelectedId(null);
    setViewsOpen(false);
  };

  const handleBulkAction = (label: string) => {
    const count = selectedIds.size;
    if (!count) return;
    setNotice(`${label} queued for ${count} applications. (Placeholder)`);
    setSelectedIds(new Set());
    window.setTimeout(() => setNotice(null), 2400);
  };

  const toggleAllRows = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(queue.map((item) => item.applicationId)));
  };

  const selectedCount = selectedIds.size;
  const gateSteps = selectedItem ? [
    { key: "Parties", blocked: selectedItem.gates.parties !== "PASS" },
    { key: "Docs", blocked: selectedItem.gates.docs !== "PASS" },
    { key: "Payment", blocked: selectedItem.gates.payment !== "PASS" },
    { key: "Screening", blocked: selectedItem.gates.screening !== "PASS" },
    { key: "Reservation", blocked: selectedItem.gates.reservation !== "PASS" },
  ] : [];
  const missingRequirements = detail
    ? detail.requirements.filter((req) =>
        ["PENDING", "IN_PROGRESS", "SUBMITTED", "REJECTED", "EXPIRED"].includes(req.status),
      )
    : [];
  const completedRequirements = detail
    ? detail.requirements.filter((req) => ["APPROVED", "WAIVED", "COMPLETED"].includes(req.status))
    : [];

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_#e2e8f0,_#f8fafc_45%,_#f1f5f9_100%)]"
      style={
        {
          "--inbox-accent": "#0f172a",
          "--inbox-mute": "#64748b",
          "--inbox-surface": "#ffffff",
        } as CSSProperties
      }
    >
      <style>{`
        @keyframes inbox-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .inbox-rise { animation: inbox-rise 0.35s ease-out; }
      `}</style>

      <div className="border-b border-slate-200/70 bg-white/80 px-6 pb-4 pt-5 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Leasing Inbox
            </p>
            <h2 className="text-2xl font-semibold text-[var(--inbox-accent)]">Applications</h2>
            <p className="mt-1 text-sm text-slate-600">
              Triage, assign, and clear applications with a real-time queue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-slate-600">
              {total} total
            </div>
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-slate-600 transition hover:border-slate-300"
            >
              Refresh
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setViewsOpen((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-slate-600"
              >
                Saved views
              </button>
              {viewsOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="text-xs font-semibold uppercase text-slate-400">Views</p>
                  <div className="mt-2 space-y-1">
                    {savedViews.length === 0 ? (
                      <p className="text-xs text-slate-500">No saved views yet.</p>
                    ) : (
                      savedViews.map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => applyView(view)}
                          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                        >
                          <span>{view.name}</span>
                          <span className="text-[10px] uppercase text-slate-400">Apply</span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveView}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase text-white"
                  >
                    Save current view
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPropertyOpen((prev) => !prev)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {filters.propertyIds.length
                ? `${filters.propertyIds.length} properties`
                : "All properties"}
            </button>
            {propertyOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Properties</p>
                  <button
                    type="button"
                    onClick={() => updateFilters({ propertyIds: [] })}
                    className="text-xs font-semibold uppercase text-slate-500"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {(filterOptions?.properties ?? []).map((property) => (
                    <label key={property.propertyId} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={filters.propertyIds.includes(property.propertyId)}
                        onChange={() => toggleProperty(property.propertyId)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <ViewLabel
                        title={property.name || property.propertyId.slice(0, 8)}
                        subtitle={`${property.siteCode ?? ""}${propertyCounts.has(property.propertyId) ? ` | ${propertyCounts.get(property.propertyId)}` : ""}`.trim()}
                      />
                    </label>
                  ))}
                  {filterOptions?.properties?.length === 0 ? (
                    <p className="text-xs text-slate-500">No properties loaded.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUnitTypeOpen((prev) => !prev)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {filters.unitTypes.length ? `${filters.unitTypes.length} unit types` : "All unit types"}
            </button>
            {unitTypeOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Unit types</p>
                  <button
                    type="button"
                    onClick={() => updateFilters({ unitTypes: [] })}
                    className="text-xs font-semibold uppercase text-slate-500"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {UNIT_TYPES.map((type) => (
                    <label key={type.value} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.unitTypes.includes(type.value)}
                          onChange={() => toggleUnitType(type.value)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{type.label}</span>
                      </div>
                      <span className="text-xs text-slate-400">{unitTypeCounts[type.value] ?? 0}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Search</span>
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Applicant, email, phone, application ID, unit"
              className="w-56 bg-transparent text-sm text-slate-700 focus:outline-none"
            />
          </div>

          <select
            value={filters.sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreFiltersOpen((prev) => !prev)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              More filters
            </button>
            {moreFiltersOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="text-xs font-semibold uppercase text-slate-400">Priority</p>
                <div className="mt-2 space-y-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.priorities.includes(option.value)}
                          onChange={() => togglePriority(option.value)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{option.label}</span>
                      </div>
                      <span className="text-xs text-slate-400">{priorityCounts[option.value] ?? 0}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Flags</p>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {(
                      [
                        ["missingDocs", "Missing docs"],
                        ["paymentIssue", "Payment issue"],
                        ["duplicate", "Possible duplicate"],
                        ["stale", "Stale"],
                        ["highRisk", "High risk"],
                        ["hasReservation", "Has reservation"],
                      ] as Array<[keyof Flags, string]>
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.flags[key]}
                          onChange={() => toggleFlag(key)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STAGE_TABS.map((tab) => {
            const active = filters.status === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateFilters({ status: tab.key })}
                className={classNames(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500",
                )}
              >
                <span>{tab.label}</span>
                <span className={classNames(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                )}>
                  {facets?.byStatus?.[tab.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {queueError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {queueError} Please confirm your organization access and try again.
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-r border-slate-200/70 bg-white/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={selectedCount > 0 && selectedCount === queue.length}
                onChange={(event) => toggleAllRows(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>{selectedCount} selected</span>
            </div>
            {selectedCount ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase">
                <button
                  type="button"
                  onClick={() => handleBulkAction("Assign to me")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600"
                >
                  Assign to me
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Send reminder")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600"
                >
                  Send reminder
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Move stage")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600"
                >
                  Move stage
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("Export bundle")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600"
                >
                  Export bundle
                </button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Property / Unit</th>
                  <th className="px-4 py-3">Next action</th>
                  <th className="px-4 py-3">Gates</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {loadingQueue ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-slate-100">
                      <td className="px-4 py-4" colSpan={7}>
                        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      No applications match these filters. Try clearing filters or adjusting your search.
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => {
                    const gateList = [
                      { key: "Parties", value: item.gates.parties !== "PASS" },
                      { key: "Docs", value: item.gates.docs !== "PASS" },
                      { key: "Payment", value: item.gates.payment !== "PASS" },
                      { key: "Screen", value: item.gates.screening !== "PASS" },
                      { key: "Reserve", value: item.gates.reservation !== "PASS" },
                      { key: "Unit", value: item.gates.unitAvailability !== "PASS" },
                    ];

                    return (
                      <tr
                        key={item.applicationId}
                        className={classNames(
                          "border-b border-slate-100 transition hover:bg-slate-50",
                          selectedId === item.applicationId ? "bg-slate-100" : "bg-transparent",
                        )}
                        onClick={() => setSelectedId(item.applicationId)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.applicationId)}
                              onChange={(event) => {
                                event.stopPropagation();
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.applicationId)) {
                                    next.delete(item.applicationId);
                                  } else {
                                    next.add(item.applicationId);
                                  }
                                  return next;
                                });
                              }}
                              className="mt-1 h-4 w-4 rounded border-slate-300"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.primaryApplicant.name || "Unknown applicant"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.primaryApplicant.email || item.primaryApplicant.phone || "No contact"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Pill tone="border-slate-200 bg-white text-slate-600">{item.status}</Pill>
                                <Pill tone="border-slate-200 bg-white text-slate-600">{item.priority}</Pill>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.property?.name || item.property?.id?.slice(0, 8) || "Property"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.unit?.unitCode ? `Unit ${item.unit.unitCode}` : "No unit assigned"}
                            {item.unit?.type ? ` | ${item.unit.type}` : ""}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">Submitted {formatShortDate(item.submittedAt)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <NextActionChip action={item.nextAction} />
                          {item.nextAction.blockingReasonCodes?.length ? (
                            <p className="text-xs text-slate-500">
                              {item.nextAction.blockingReasonCodes.join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {gateList.map((gate) => (
                              <GateChip key={gate.key} label={gate.key} blocked={gate.value} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <SlaChip sla={item.sla} />
                          <p className="mt-1 text-xs text-slate-400">
                            {item.sla?.deadlineAt ? formatTimeDistance(item.sla.deadlineAt) : "No SLA"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <RiskBadge risk={item.risk} />
                          {item.risk?.riskScore ? (
                            <p className="mt-1 text-xs text-slate-500">Score {item.risk.riskScore}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.assignee?.name || "Unassigned"}
                          </p>
                          <p className="text-xs text-slate-500">Updated {formatShortDate(item.updatedAt)}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-3 text-sm text-slate-600">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600"
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}/page</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 w-full flex-col bg-white/80 p-5 lg:w-[420px]">
          {!selectedId ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              <p className="text-base font-semibold text-slate-700">Select an application</p>
              <p className="mt-2">Choose a row to open the review drawer.</p>
            </div>
          ) : loadingDetail ? (
            <div className="space-y-4">
              <div className="h-6 w-1/2 animate-pulse rounded-full bg-slate-100" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : detailError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {detailError} Please retry or choose another application.
            </div>
          ) : detail ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto inbox-rise">
              {actionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {actionError} Please review the action inputs and try again.
                </div>
              ) : null}

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Overview</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedItem?.primaryApplicant?.name || "Application"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedItem?.primaryApplicant?.email || selectedItem?.primaryApplicant?.phone || "No contact"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{detail.application.id}</p>
                  </div>
                  <div className="text-right">
                    <Pill tone="border-slate-200 bg-white text-slate-600">{detail.application.status}</Pill>
                    <div className="mt-2">
                      <Pill tone="border-slate-200 bg-white text-slate-600">{detail.application.priority}</Pill>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-400">Next step</p>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600">
                      {gateSteps.map((step) => (
                        <div key={step.key} className="flex items-center justify-between">
                          <span>{step.key}</span>
                          <span className={classNames(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            step.blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                          )}>
                            {step.blocked ? "Blocked" : "Pass"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedItem?.nextAction ? (
                      <div className="mt-3">
                        <NextActionChip action={selectedItem.nextAction} />
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSendReminder}
                        disabled={actionBusy}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600 disabled:opacity-50"
                      >
                        Send reminder
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestMissingDocs}
                        disabled={actionBusy}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600 disabled:opacity-50"
                      >
                        Request docs
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkInReview}
                        disabled={actionBusy}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-600 disabled:opacity-50"
                      >
                        Mark in review
                      </button>
                      <button
                        type="button"
                        onClick={handleDecision}
                        disabled={actionBusy}
                        className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase text-white disabled:opacity-50"
                      >
                        Decisioned
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseApplication}
                        disabled={actionBusy}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase text-rose-700 disabled:opacity-50"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedItem ? (
                        <>
                          <GateChip label="Parties" blocked={selectedItem.gates.parties !== "PASS"} />
                          <GateChip label="Docs" blocked={selectedItem.gates.docs !== "PASS"} />
                          <GateChip label="Payment" blocked={selectedItem.gates.payment !== "PASS"} />
                          <GateChip label="Screening" blocked={selectedItem.gates.screening !== "PASS"} />
                          <GateChip label="Reservation" blocked={selectedItem.gates.reservation !== "PASS"} />
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Property</span>
                      <span className="font-semibold text-slate-800">
                        {selectedItem?.property?.name || detail.application.propertyId}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Unit</span>
                      <span className="font-semibold text-slate-800">
                        {selectedItem?.unit?.unitCode || detail.application.unitId || "Unassigned"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Submitted</span>
                      <span className="font-semibold text-slate-800">{formatDate(detail.application.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">Household</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      {detail.parties.map((party) => (
                        <div key={party.id} className="flex items-center justify-between">
                          <span>
                            {party.firstName || party.lastName
                              ? `${party.firstName ?? ""} ${party.lastName ?? ""}`.trim()
                              : party.email}
                          </span>
                          <span className="text-xs text-slate-400">{party.role}</span>
                        </div>
                      ))}
                      {detail.parties.length === 0 ? (
                        <p className="text-xs text-slate-500">No household members yet.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Timeline</p>
                <div className="mt-3 space-y-3">
                  {timeline.slice(0, 10).map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-100 px-3 py-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{event.label}</span>
                        <span>{formatShortDate(event.createdAt)}</span>
                      </div>
                      {event.meta ? <p className="mt-1 text-slate-500">{event.meta}</p> : null}
                    </div>
                  ))}
                  {timeline.length === 0 ? (
                    <p className="text-xs text-slate-500">No timeline events yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Requirements</p>
                  <button
                    type="button"
                    onClick={handleRequestMissingDocs}
                    disabled={actionBusy || missingRequirements.length === 0}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-50"
                  >
                    Request missing docs
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {missingRequirements.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-slate-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{req.name}</span>
                        <span className="text-xs font-semibold uppercase text-rose-600">{req.status}</span>
                      </div>
                      {req.description ? <p className="mt-1 text-xs text-slate-500">{req.description}</p> : null}
                      {req.documents?.length ? (
                        <div className="mt-2 space-y-2">
                          {req.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-2 py-1 text-xs">
                              <div>
                                <p className="font-semibold text-slate-700">{doc.fileName}</p>
                                <p className="text-[10px] uppercase text-slate-400">{doc.verificationStatus}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleVerifyDocument(doc.id, "VERIFY")}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyDocument(doc.id, "REJECT")}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase text-rose-700"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {missingRequirements.length === 0 ? (
                    <p className="text-xs text-slate-500">No missing requirements.</p>
                  ) : null}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Completed</p>
                  <div className="mt-2 space-y-2">
                    {completedRequirements.map((req) => (
                      <div key={req.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-xs">
                        <span>{req.name}</span>
                        <span className="text-[10px] font-semibold uppercase text-emerald-600">{req.status}</span>
                      </div>
                    ))}
                    {completedRequirements.length === 0 ? (
                      <p className="text-xs text-slate-500">No completed requirements yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Request details</p>
                  <div className="mt-2 grid gap-2 text-xs text-slate-600">
                    <label className="flex flex-col gap-1">
                      Deadline
                      <input
                        type="date"
                        value={requestDeadline}
                        onChange={(event) => setRequestDeadline(event.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      Message
                      <textarea
                        value={requestMessage}
                        onChange={(event) => setRequestMessage(event.target.value)}
                        rows={2}
                        className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Payments</p>
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={actionBusy}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-50"
                  >
                    Retry fee
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  {detail.payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{formatCurrency(payment.amountCents, payment.currency)}</span>
                        <span className="text-xs font-semibold uppercase text-slate-500">{payment.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Created {formatShortDate(payment.createdAt)}</p>
                      <div className="mt-2 space-y-1">
                        {payment.attempts.map((attempt) => (
                          <div key={attempt.id} className="flex items-center justify-between text-xs text-slate-500">
                            <span>Attempt {attempt.attemptNumber}</span>
                            <span>{attempt.status}</span>
                          </div>
                        ))}
                        {payment.attempts.length === 0 ? (
                          <p className="text-xs text-slate-400">No attempts yet.</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {detail.payments.length === 0 ? (
                    <p className="text-xs text-slate-500">No payment activity yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Info Requests</p>
                  <button
                    type="button"
                    onClick={handleCreateInfoRequest}
                    disabled={actionBusy}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-50"
                  >
                    Send request
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Template
                    <select
                      value={infoTemplate}
                      onChange={(event) => setInfoTemplate(event.target.value)}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    >
                      {INFO_TEMPLATES.map((template) => (
                        <option key={template.value} value={template.value}>{template.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Message
                    <textarea
                      value={requestMessage}
                      onChange={(event) => setRequestMessage(event.target.value)}
                      rows={3}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Deadline
                    <input
                      type="date"
                      value={requestDeadline}
                      onChange={(event) => setRequestDeadline(event.target.value)}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                  </label>
                  <div className="space-y-2">
                    {detail.infoRequests.map((info) => (
                      <div key={info.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{info.message || "Info request"}</span>
                          <span className="text-xs font-semibold uppercase text-slate-500">{info.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {info.createdAt ? `Sent ${formatShortDate(info.createdAt)}` : "Sent"}
                          {info.respondedAt ? ` | Responded ${formatShortDate(info.respondedAt)}` : ""}
                        </p>
                      </div>
                    ))}
                    {detail.infoRequests.length === 0 ? (
                      <p className="text-xs text-slate-500">No info requests yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Notes</p>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={actionBusy || !noteDraft.trim()}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-50"
                  >
                    Add note
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Staff-only notes (internal).</p>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                />
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                      <p>{note.content}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatShortDate(note.createdAt)}</p>
                    </div>
                  ))}
                  {notes.length === 0 ? (
                    <p className="text-xs text-slate-500">No staff notes yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-slate-400">Decisions</p>
                  <button
                    type="button"
                    onClick={handleDecision}
                    disabled={actionBusy}
                    className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase text-white disabled:opacity-50"
                  >
                    Record decision
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Outcome
                    <select
                      value={decisionOutcome}
                      onChange={(event) => setDecisionOutcome(event.target.value)}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    >
                      {["APPROVED", "APPROVED_WITH_CONDITIONS", "DENIED", "PENDING_REVIEW"].map((outcome) => (
                        <option key={outcome} value={outcome}>{outcome.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-500">
                    Decision notes
                    <textarea
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                      rows={2}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                  </label>
                  <div className="space-y-2">
                    {(detail.decisions ?? []).map((decision) => (
                      <div key={decision.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{decision.outcome}</span>
                          <span className="text-xs text-slate-400">{formatShortDate(decision.decisionDate)}</span>
                        </div>
                        {decision.notes ? <p className="mt-1 text-xs text-slate-500">{decision.notes}</p> : null}
                      </div>
                    ))}
                    {(detail.decisions?.length ?? 0) === 0 ? (
                      <p className="text-xs text-slate-500">No decisions recorded yet.</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Adverse action workflow and override approvals will surface here.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Reservations</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {detail.reservations.map((reservation) => (
                    <div key={reservation.id} className="rounded-2xl border border-slate-100 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{reservation.kind}</span>
                        <span className="text-xs font-semibold uppercase text-slate-500">{reservation.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Expires {formatShortDate(reservation.expiresAt)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReleaseReservation(reservation.id)}
                        disabled={actionBusy}
                        className="mt-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase text-rose-700 disabled:opacity-50"
                      >
                        Release
                      </button>
                    </div>
                  ))}
                  {detail.reservations.length === 0 ? (
                    <p className="text-xs text-slate-500">No reservations yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {reasonModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{reasonModal.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide a reason code for audit logs. This action will be recorded.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Reason code
                <input
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  placeholder="e.g. STAFF_RELEASED"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Details
                <textarea
                  value={reasonDetail}
                  onChange={(event) => setReasonDetail(event.target.value)}
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReasonModal({ open: false, title: "", confirmLabel: "", action: null })}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReasonConfirm}
                disabled={actionBusy || !reasonModal.action}
                className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
              >
                {reasonModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
