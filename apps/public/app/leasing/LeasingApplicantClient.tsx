"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

declare const process: {
  env: Record<string, string | undefined>;
};

const apiBaseRaw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
const apiBase = apiBaseRaw.replace(/\/+$/, "");

const DOCUMENT_TYPES = [
  "GOVERNMENT_ID",
  "PROOF_OF_INCOME",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "EMPLOYMENT_LETTER",
  "REFERENCE_LETTER",
  "PET_DOCUMENTATION",
  "VEHICLE_REGISTRATION",
  "INSURANCE_CERTIFICATE",
  "OTHER",
] as const;

const APPLICATION_STEPS = [
  { id: "draft", label: "Draft" },
  { id: "requirements", label: "Requirements" },
  { id: "submit", label: "Submit" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
] as const;

type RequirementItem = {
  id: string;
  name: string;
  status: string;
  requirementType: string;
  description?: string | null;
  dueDate?: string | null;
  partyId?: string | null;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string;
    verificationStatus: string;
    rejectedReason?: string | null;
    publicUrl?: string | null;
  }>;
};

type ApplicationDetail = {
  application: {
    id: string;
    status: string;
    applicationType: string;
    applicationFeeStatus?: string | null;
    submittedAt?: string | null;
    expiresAt?: string | null;
  };
  parties: Array<{
    id: string;
    role: string;
    status: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }>;
  requirements: RequirementItem[];
  infoRequests: Array<{ id: string; status: string; message?: string | null }>;
  payments: Array<{
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    attempts: Array<{ id: string; status: string; attemptNumber: number; failureCode?: string | null }>;
  }>;
};

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

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

function formatCurrency(amountCents?: number, currency?: string) {
  if (!Number.isFinite(amountCents)) return "N/A";
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

function loadStoredContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("bw.leasing.applicant.v1");
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function LeasingApplicantClient() {
  const stored = useMemo(() => loadStoredContext(), []);
  const [orgId, setOrgId] = useState(stored?.orgId ?? "");
  const [propertyId, setPropertyId] = useState(stored?.propertyId ?? "");
  const [unitId, setUnitId] = useState(stored?.unitId ?? "");
  const [email, setEmail] = useState(stored?.email ?? "");
  const [firstName, setFirstName] = useState(stored?.firstName ?? "");
  const [lastName, setLastName] = useState(stored?.lastName ?? "");
  const [phone, setPhone] = useState(stored?.phone ?? "");

  const [applicationId, setApplicationId] = useState<string | null>(stored?.applicationId ?? null);
  const [partyId, setPartyId] = useState<string | null>(stored?.partyId ?? null);
  const [sessionToken, setSessionToken] = useState<string | null>(stored?.sessionToken ?? null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState("profile");
  const [draftForm, setDraftForm] = useState({
    desiredMoveInDate: "",
    leaseTermMonths: "",
    relocationStatus: "LOCAL",
    monthlyIncomeCents: "",
    employer: "",
    occupation: "",
    notes: "",
  });

  const [consentName, setConsentName] = useState("");
  const [consentAgreed, setConsentAgreed] = useState(false);

  const [paymentAmountCents, setPaymentAmountCents] = useState("4500");
  const [paymentOutcome, setPaymentOutcome] = useState("succeed");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CO_APPLICANT");

  const [uploadDocType, setUploadDocType] = useState<Record<string, string>>({});
  const [uploadPartyId, setUploadPartyId] = useState<Record<string, string>>({});

  const [demoScenario, setDemoScenario] = useState("draft");
  const [withdrawReason, setWithdrawReason] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      orgId,
      propertyId,
      unitId,
      email,
      firstName,
      lastName,
      phone,
      applicationId: applicationId ?? "",
      partyId: partyId ?? "",
      sessionToken: sessionToken ?? "",
    });
    try {
      window.localStorage.setItem("bw.leasing.applicant.v1", payload);
    } catch {
      // ignore storage
    }
  }, [orgId, propertyId, unitId, email, firstName, lastName, phone, applicationId, partyId, sessionToken]);

  useEffect(() => {
    if (orgId && applicationId) {
      void refreshDetail(applicationId);
    }
  }, [orgId, applicationId, refreshDetail]);

  const hasDraft = useMemo(() => Boolean(applicationId && sessionToken), [applicationId, sessionToken]);

  const stepStatus = useMemo(() => {
    const status = detail?.application.status ?? "DRAFT";
    const feeStatus = detail?.application.applicationFeeStatus ?? "PENDING";
    return APPLICATION_STEPS.map((step) => {
      if (status === "DRAFT") {
        return { ...step, state: step.id === "draft" ? "active" : "pending" };
      }
      if (status === "SUBMITTED") {
        if (step.id === "draft") return { ...step, state: "done" };
        if (step.id === "submit") return { ...step, state: "done" };
        if (step.id === "payment") {
          return { ...step, state: feeStatus === "SUCCEEDED" ? "done" : "active" };
        }
        return { ...step, state: step.id === "requirements" ? "done" : "pending" };
      }
      if (status === "NEEDS_INFO") {
        if (step.id === "requirements") return { ...step, state: "active" };
        if (step.id === "review") return { ...step, state: "pending" };
        return { ...step, state: "done" };
      }
      if (status === "IN_REVIEW") {
        return { ...step, state: step.id === "review" ? "active" : "done" };
      }
      if (status === "DECISIONED" || status === "CLOSED") {
        return { ...step, state: "done" };
      }
      return { ...step, state: "pending" };
    });
  }, [detail]);

  const refreshDetail = useCallback(
    async (nextApplicationId?: string | null) => {
      const resolvedId = nextApplicationId ?? applicationId;
      if (!orgId || !resolvedId) return;
      const result = await apiJson<ApplicationDetail>(
        `/lease-applications/${resolvedId}?orgId=${encodeURIComponent(orgId)}`,
      );
      setDetail(result);
    },
    [orgId, applicationId],
  );

  async function startDraft() {
    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await apiJson<any>("/lease-applications/start", {
        method: "POST",
        body: JSON.stringify({
          orgId,
          propertyId,
          unitId: unitId || null,
          applicationType: "INDIVIDUAL",
          primary: { email, firstName, lastName, phone },
          currentStep,
          formData: draftForm,
        }),
      });

      setApplicationId(result.application?.id ?? null);
      setPartyId(result.party?.id ?? null);
      setSessionToken(result.draftSession?.sessionToken ?? null);
      setStatusMessage(result.deduped ? "Resumed existing draft." : "Draft started.");
      await refreshDetail(result.application?.id ?? null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to start draft.");
    } finally {
      setLoading(false);
    }
  }

  async function resumeDraft() {
    setStatusMessage(null);
    if (!sessionToken) {
      setStatusMessage("Missing session token.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiJson<any>("/lease-applications/resume", {
        method: "POST",
        body: JSON.stringify({ orgId, sessionToken }),
      });
      setApplicationId(result.application?.id ?? null);
      setPartyId(result.party?.id ?? null);
      setCurrentStep(result.draftSession?.currentStep ?? currentStep);
      setStatusMessage("Draft resumed.");
      await refreshDetail(result.application?.id ?? null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to resume draft.");
    } finally {
      setLoading(false);
    }
  }

  async function autosave() {
    setStatusMessage(null);
    if (!applicationId || !sessionToken) return;
    setLoading(true);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/draft-sessions/${sessionToken}`, {
        method: "PATCH",
        body: JSON.stringify({
          orgId,
          currentStep,
          formDataPatch: draftForm,
          progressMapPatch: { [currentStep]: "in_progress" },
        }),
      });
      setStatusMessage("Autosaved.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to autosave.");
    } finally {
      setLoading(false);
    }
  }

  async function submitDraft() {
    setStatusMessage(null);
    if (!applicationId || !partyId) return;
    if (!consentAgreed || !consentName.trim()) {
      setStatusMessage("Consent name and acceptance required.");
      return;
    }
    setLoading(true);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          consent: {
            partyId,
            signature: {
              agreed: true,
              name: consentName.trim(),
              timestamp: new Date().toISOString(),
            },
          },
        }),
      });
      setStatusMessage("Submitted. Proceed to payment.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to submit application.");
    } finally {
      setLoading(false);
    }
  }

  async function generateRequirements() {
    setStatusMessage(null);
    if (!applicationId) return;
    setLoading(true);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/requirements/generate`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
        }),
      });
      setStatusMessage("Requirements generated.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to generate requirements.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocument(requirementId: string, file: File) {
    if (!applicationId || !orgId) return;
    const party = uploadPartyId[requirementId] || partyId;
    if (!party) {
      setStatusMessage("Select a party before uploading.");
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/parties/${party}/documents`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          requirementItemId: requirementId,
          documentType: uploadDocType[requirementId] ?? "GOVERNMENT_ID",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          storageKey: `mock/${applicationId}/${file.name}`,
        }),
      });
      setStatusMessage("Document attached.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to upload document.");
    } finally {
      setLoading(false);
    }
  }

  async function createPaymentIntent() {
    setStatusMessage(null);
    if (!applicationId) return;
    setLoading(true);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/payments/application-fee`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          amountCents: Number(paymentAmountCents),
          currency: "USD",
        }),
      });
      setStatusMessage("Payment intent created.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to create payment intent.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPayment() {
    setStatusMessage(null);
    if (!applicationId) return;
    setLoading(true);
    try {
      const result = await apiJson<any>(
        `/lease-applications/${applicationId}/payments/application-fee/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            orgId,
            confirmation: { outcome: paymentOutcome },
          }),
        },
      );
      setStatusMessage(result.ok ? "Payment succeeded." : "Payment failed; retry available.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to confirm payment.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshInfoRequests() {
    setStatusMessage(null);
    await refreshDetail(applicationId);
  }

  async function respondInfoRequest(id: string) {
    setStatusMessage(null);
    if (!applicationId) return;
    setLoading(true);
    try {
      await apiJson<any>(
        `/lease-applications/${applicationId}/info-requests/${id}/respond`,
        {
          method: "POST",
          body: JSON.stringify({ orgId }),
        },
      );
      setStatusMessage("Info request responded.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to respond.");
    } finally {
      setLoading(false);
    }
  }

  async function inviteParty() {
    if (!applicationId || !inviteEmail) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/parties/invite`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          role: inviteRole,
          email: inviteEmail,
        }),
      });
      setInviteEmail("");
      setStatusMessage("Invite sent.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to invite party.");
    } finally {
      setLoading(false);
    }
  }

  async function seedDemo() {
    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await apiJson<any>("/lease-applications/mock", {
        method: "POST",
        body: JSON.stringify({
          orgId: orgId || undefined,
          propertyId: propertyId || undefined,
          unitId: unitId || undefined,
          scenario: demoScenario,
          paymentOutcome: demoScenario === "draft" ? undefined : "succeed",
        }),
      });
      setOrgId(result.orgId ?? orgId);
      setPropertyId(result.propertyId ?? propertyId);
      setUnitId(result.unitId ?? unitId);
      setApplicationId(result.application?.id ?? applicationId);
      setPartyId(result.party?.id ?? partyId);
      setSessionToken(result.draftSession?.sessionToken ?? sessionToken);
      setStatusMessage("Demo application ready.");
      await refreshDetail(result.application?.id ?? applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to seed demo.");
    } finally {
      setLoading(false);
    }
  }

  async function withdrawApplication() {
    if (!applicationId) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      await apiJson<any>(`/lease-applications/${applicationId}/withdraw`, {
        method: "POST",
        body: JSON.stringify({
          orgId,
          reasonCode: "APPLICANT_WITHDRAWAL",
          reason: withdrawReason || undefined,
        }),
      });
      setStatusMessage("Application withdrawn.");
      await refreshDetail(applicationId);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Unable to withdraw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className={layout.card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={layout.eyebrow}>Applicant workspace</p>
              <h2 className={cn(layout.h2, "mt-2 text-2xl")}>Start or resume your application</h2>
              <p className={cn(layout.body, "mt-2")}>Enter your details, autosave progress, and finish when ready.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className={layout.inputBase}
                value={demoScenario}
                onChange={(event) => setDemoScenario(event.target.value)}
              >
                <option value="draft">Demo draft</option>
                <option value="submitted">Demo submitted</option>
                <option value="needs_info">Demo needs info</option>
              </select>
              <button
                type="button"
                className={cn(layout.buttonBase, layout.buttonSecondary)}
                onClick={() => void seedDemo()}
                disabled={loading}
              >
                Create demo
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={layout.label}>Organization ID</span>
              <input className={layout.inputBase} value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="Org UUID" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Property ID</span>
              <input className={layout.inputBase} value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Property UUID" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Unit ID</span>
              <input className={layout.inputBase} value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="Unit UUID (optional)" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Email</span>
              <input className={layout.inputBase} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>First name</span>
              <input className={layout.inputBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Last name</span>
              <input className={layout.inputBase} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Phone</span>
              <input className={layout.inputBase} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-1234" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className={layout.label}>Resume token</span>
              <input
                className={layout.inputBase}
                value={sessionToken ?? ""}
                onChange={(e) => setSessionToken(e.target.value)}
                placeholder="Paste resume token if you have one"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className={cn(layout.buttonBase, layout.buttonPrimary)}
              onClick={() => void startDraft()}
              disabled={loading}
            >
              Start draft
            </button>
            <button
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={() => void resumeDraft()}
              disabled={loading}
            >
              Resume with token
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Draft ID: {applicationId ?? "N/A"} - Session token: {sessionToken ?? "N/A"}
          </p>
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Draft details</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Application profile</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={layout.label}>Desired move-in date</span>
              <input
                type="date"
                className={layout.inputBase}
                value={draftForm.desiredMoveInDate}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, desiredMoveInDate: e.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Lease term (months)</span>
              <input
                className={layout.inputBase}
                value={draftForm.leaseTermMonths}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, leaseTermMonths: e.target.value }))}
                placeholder="12"
              />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Relocation status</span>
              <select
                className={layout.inputBase}
                value={draftForm.relocationStatus}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, relocationStatus: e.target.value }))}
              >
                <option value="LOCAL">Local</option>
                <option value="OUT_OF_STATE_EMPLOYED">Out of state - employed</option>
                <option value="OUT_OF_STATE_JOB_OFFER">Out of state - job offer</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Monthly income (cents)</span>
              <input
                className={layout.inputBase}
                value={draftForm.monthlyIncomeCents}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, monthlyIncomeCents: e.target.value }))}
                placeholder="450000"
              />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Employer</span>
              <input
                className={layout.inputBase}
                value={draftForm.employer}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, employer: e.target.value }))}
                placeholder="Employer name"
              />
            </label>
            <label className="space-y-2">
              <span className={layout.label}>Occupation</span>
              <input
                className={layout.inputBase}
                value={draftForm.occupation}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, occupation: e.target.value }))}
                placeholder="Role"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className={layout.label}>Additional notes</span>
            <textarea
              className={cn(layout.inputBase, "min-h-[100px]")}
              value={draftForm.notes}
              onChange={(e) => setDraftForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className={cn(layout.buttonBase, layout.buttonPrimary)}
              onClick={() => void autosave()}
              disabled={!hasDraft || loading}
            >
              Save progress
            </button>
            <input
              className={cn(layout.inputBase, "max-w-[200px]")}
              value={currentStep}
              onChange={(e) => setCurrentStep(e.target.value)}
              placeholder="Current step"
            />
          </div>
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Co-applicants</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Invite additional parties</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto]">
            <input
              className={layout.inputBase}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
            />
            <select className={layout.inputBase} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="CO_APPLICANT">Co-applicant</option>
              <option value="OCCUPANT">Occupant</option>
              <option value="GUARANTOR">Guarantor</option>
            </select>
            <button
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={() => void inviteParty()}
              disabled={!applicationId || loading}
            >
              Send invite
            </button>
          </div>
          {detail?.parties?.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {detail.parties.map((party) => (
                <div key={party.id} className={layout.panelMuted}>
                  <p className="text-sm font-semibold text-slate-900">{party.role}</p>
                  <p className="text-sm text-slate-600">{party.firstName || party.lastName ? `${party.firstName ?? ""} ${party.lastName ?? ""}`.trim() : party.email}</p>
                  <p className="text-xs text-slate-400">{party.status}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Requirements</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Documents and tasks</h3>
            <button
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={() => void generateRequirements()}
              disabled={!applicationId || loading}
            >
              Generate requirements
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {detail?.requirements?.length ? (
              detail.requirements.map((req) => (
                <div key={req.id} className={layout.panel}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{req.name}</p>
                      <p className="text-xs text-slate-500">{req.requirementType} - {req.status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                        value={uploadDocType[req.id] ?? "GOVERNMENT_ID"}
                        onChange={(e) => setUploadDocType((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
                        value={uploadPartyId[req.id] ?? partyId ?? ""}
                        onChange={(e) => setUploadPartyId((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      >
                        <option value="">Select party</option>
                        {detail.parties.map((party) => (
                          <option key={party.id} value={party.id}>{party.role} - {party.email}</option>
                        ))}
                      </select>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-slate-700">
                        Upload
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void uploadDocument(req.id, file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {req.description ? <p className="mt-2 text-xs text-slate-500">{req.description}</p> : null}
                  {req.documents.length ? (
                    <div className="mt-3 space-y-2">
                      {req.documents.map((doc) => (
                        <div key={doc.id} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">{doc.fileName}</p>
                          <p className="text-[11px] text-slate-400">{doc.documentType} - {doc.verificationStatus}</p>
                          {doc.rejectedReason ? <p className="text-[11px] text-rose-500">{doc.rejectedReason}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No requirements yet.</p>
            )}
          </div>
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Consent</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Submit your application</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className={layout.inputBase}
              value={consentName}
              onChange={(e) => setConsentName(e.target.value)}
              placeholder="Full legal name"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={consentAgreed} onChange={(e) => setConsentAgreed(e.target.checked)} />
              I agree to screening consent terms
            </label>
          </div>
          <button
            className={cn(layout.buttonBase, layout.buttonPrimary, "mt-4")}
            onClick={() => void submitDraft()}
            disabled={!hasDraft || loading}
          >
            Submit application
          </button>
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Payment</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Application fee</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              className={layout.inputBase}
              value={paymentAmountCents}
              onChange={(e) => setPaymentAmountCents(e.target.value)}
              placeholder="Amount cents"
            />
            <select
              className={layout.inputBase}
              value={paymentOutcome}
              onChange={(e) => setPaymentOutcome(e.target.value)}
            >
              <option value="succeed">Succeed</option>
              <option value="decline">Decline</option>
            </select>
            <div className="flex gap-2">
              <button
                className={cn(layout.buttonBase, layout.buttonSecondary)}
                onClick={() => void createPaymentIntent()}
                disabled={!applicationId || loading}
              >
                Create intent
              </button>
              <button
                className={cn(layout.buttonBase, layout.buttonPrimary)}
                onClick={() => void confirmPayment()}
                disabled={!applicationId || loading}
              >
                Confirm
              </button>
            </div>
          </div>
          {detail?.payments?.length ? (
            <div className="mt-4 space-y-2">
              {detail.payments.map((payment) => (
                <div key={payment.id} className={layout.panelMuted}>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.amountCents, payment.currency)}</p>
                  <p className="text-xs text-slate-500">Status: {payment.status}</p>
                  {payment.attempts.length ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Attempts: {payment.attempts.map((attempt) => `#${attempt.attemptNumber} ${attempt.status}`).join(", ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Info requests</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Resolve requested info</h3>
            <button
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={() => void refreshInfoRequests()}
              disabled={!applicationId || loading}
            >
              Refresh
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {detail?.infoRequests?.length ? (
              detail.infoRequests.map((request) => (
                <div key={request.id} className={layout.panelMuted}>
                  <p className="text-sm font-semibold text-slate-900">{request.status}</p>
                  <p className="text-sm text-slate-600">{request.message ?? "Additional information required."}</p>
                  {request.status === "OPEN" ? (
                    <button
                      className={cn(layout.buttonBase, layout.buttonPrimary, "mt-2")}
                      onClick={() => void respondInfoRequest(request.id)}
                      disabled={loading}
                    >
                      Respond
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No info requests.</p>
            )}
          </div>
        </section>

        <section className={layout.card}>
          <p className={layout.eyebrow}>Withdrawal</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Withdraw your application</h3>
          <p className="mt-2 text-sm text-slate-600">
            Use this if you no longer wish to continue. Refund eligibility is determined automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              className={cn(layout.inputBase, "flex-1")}
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Reason (optional)"
            />
            <button
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={() => void withdrawApplication()}
              disabled={!applicationId || loading}
            >
              Withdraw
            </button>
          </div>
        </section>

        {statusMessage ? (
          <div className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {statusMessage}
          </div>
        ) : null}
      </div>

      <aside className="space-y-6">
        <div className={layout.card}>
          <p className={layout.eyebrow}>Progress</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Application status</h3>
          <div className="mt-4 space-y-3">
            {stepStatus.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    step.state === "done"
                      ? "bg-emerald-500"
                      : step.state === "active"
                        ? "bg-amber-500"
                        : "bg-slate-300",
                  )}
                />
                <span className="text-sm text-slate-700">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={layout.card}>
          <p className={layout.eyebrow}>Summary</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Application overview</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="font-semibold text-slate-900">{detail?.application.status ?? "Draft"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Application ID</span>
              <span className="font-semibold text-slate-900">{applicationId ?? "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Submitted</span>
              <span className="font-semibold text-slate-900">{formatDate(detail?.application.submittedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expires</span>
              <span className="font-semibold text-slate-900">{formatDate(detail?.application.expiresAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fee status</span>
              <span className="font-semibold text-slate-900">{detail?.application.applicationFeeStatus ?? "N/A"}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
