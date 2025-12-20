"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  approveAndProvision,
  rejectApplication,
  retrySendInvite,
} from "../actions";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  orgId?: string;
};

const initialState: ActionState = { ok: false };

function SubmitButton({
  children,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-500",
    secondary: "border border-slate-200 bg-white text-slate-900 hover:border-slate-300",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300",
  };

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${base} ${variants[variant]} ${pending ? "opacity-70" : ""}`}
    >
      {pending ? "Working..." : children}
    </button>
  );
}

function Toast({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-xs font-semibold uppercase tracking-wide"
        type="button"
      >
        Close
      </button>
    </div>
  );
}

export function ApplicationActions({
  applicationId,
  status,
  provisionedOrgId,
  inviteStatus,
}: {
  applicationId: string;
  status: string;
  provisionedOrgId: string | null;
  inviteStatus: string | null;
}) {
  const router = useRouter();
  const [approveState, approveAction] = useActionState(
    approveAndProvision,
    initialState,
  );
  const [rejectState, rejectAction] = useActionState(
    rejectApplication,
    initialState,
  );
  const [retryState, retryAction] = useActionState(
    retrySendInvite,
    initialState,
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const canApprove = useMemo(() => {
    return (
      !provisionedOrgId &&
      (status === "submitted" ||
        (status === "provisioning_failed" && inviteStatus !== "send_failed"))
    );
  }, [inviteStatus, provisionedOrgId, status]);

  const canRetry = useMemo(() => {
    return (
      !provisionedOrgId &&
      status === "provisioning_failed" &&
      inviteStatus === "send_failed"
    );
  }, [inviteStatus, provisionedOrgId, status]);

  const canReject = useMemo(() => {
    return !provisionedOrgId && status === "submitted";
  }, [provisionedOrgId, status]);

  useEffect(() => {
    if (approveState.ok) {
      setToast({ message: approveState.message ?? "Provisioned.", tone: "success" });
      router.refresh();
    } else if (approveState.error) {
      setToast({ message: approveState.error, tone: "error" });
    }
  }, [approveState, router]);

  useEffect(() => {
    if (rejectState.ok) {
      setToast({ message: rejectState.message ?? "Rejected.", tone: "success" });
      router.refresh();
    } else if (rejectState.error) {
      setToast({ message: rejectState.error, tone: "error" });
    }
  }, [rejectState, router]);

  useEffect(() => {
    if (retryState.ok) {
      setToast({ message: retryState.message ?? "Invite sent.", tone: "success" });
      router.refresh();
    } else if (retryState.error) {
      setToast({ message: retryState.error, tone: "error" });
    }
  }, [retryState, router]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <form action={approveAction}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <SubmitButton variant="primary" disabled={!canApprove}>
          Approve &amp; Provision
        </SubmitButton>
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <SubmitButton variant="danger" disabled={!canReject}>
          Reject
        </SubmitButton>
      </form>
      {canRetry ? (
        <form action={retryAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <SubmitButton variant="secondary">Retry send invite</SubmitButton>
        </form>
      ) : null}
      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
