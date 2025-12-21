"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createManualOrg } from "./actions";
import {
  HEALTH_STATUSES,
  HEALTH_STATUS_LABELS,
  ORG_STATUSES,
  ORG_STATUS_LABELS,
} from "./constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  orgId?: string;
};

const initialState: ActionState = { ok: false };

export function CreateOrgDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [state, action] = useActionState(createManualOrg, initialState);

  const orderedStatuses = useMemo(() => ORG_STATUSES, []);
  const orderedHealth = useMemo(() => HEALTH_STATUSES, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSendInvite(false);
      setOpen(false);
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
      >
        Create org
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Create organization
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Manually create an org and optionally request missing details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form ref={formRef} action={action} className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Organization name
                  <input
                    name="name"
                    required
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="BridgeWorks HQ"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Slug (optional)
                  <input
                    name="slug"
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="bridgeworks-hq"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Status
                  <select
                    name="status"
                    required
                    defaultValue="active"
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {orderedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {ORG_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Health status (optional)
                  <select
                    name="healthStatus"
                    defaultValue=""
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Unknown</option>
                    {orderedHealth.map((status) => (
                      <option key={status} value={status}>
                        {HEALTH_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Primary contact email (optional)
                <input
                  type="email"
                  name="primaryContactEmail"
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="ops@bridgeworks.com"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Request remaining details
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Track missing items you want the org team to provide later.
                </p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requestField" value="contact_email" />
                    Primary contact email
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requestField" value="health_status" />
                    Health status
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requestField" value="billing_contact" />
                    Billing contact
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requestField" value="org_admin" />
                    Org admin contact
                  </label>
                </div>

                <label className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="sendAdminInvite"
                    checked={sendInvite}
                    onChange={(event) => setSendInvite(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    Send org admin invite
                    <span className="mt-1 block text-xs text-slate-500">
                      This creates a Clerk invitation to collect remaining info.
                    </span>
                  </span>
                </label>

                {sendInvite ? (
                  <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                    Admin email
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="admin@org.com"
                    />
                  </label>
                ) : null}
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Notes (optional)
                <textarea
                  name="notes"
                  className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Capture remaining details or next steps."
                />
              </label>

              {state.error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {state.error}
                </div>
              ) : null}

              {state.ok && state.message ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {state.message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
                >
                  Create organization
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
