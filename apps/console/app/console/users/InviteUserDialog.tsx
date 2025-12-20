"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createPlatformUser } from "./actions";
import {
  PERSON_STATUSES,
  PERSON_STATUS_LABELS,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
} from "./constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const initialState: ActionState = { ok: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Sending..." : label}
    </button>
  );
}

export function InviteUserDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createPlatformUser, initialState);

  const orderedRoles = useMemo(() => PLATFORM_ROLES, []);
  const orderedStatuses = useMemo(() => PERSON_STATUSES, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
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
        Invite user
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invite platform user
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Create the user record and optionally send a Clerk invite.
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
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input
                  name="name"
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Jamie Founder"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Work email
                <input
                  type="email"
                  name="email"
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="jamie@company.com"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Platform role
                <select
                  name="platformRole"
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a role
                  </option>
                  {orderedRoles.map((role) => (
                    <option key={role} value={role}>
                      {PLATFORM_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Status
                <select
                  name="status"
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  defaultValue="active"
                >
                  {orderedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {PERSON_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="skipInvite"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  Bypass Clerk invite
                  <span className="mt-1 block text-xs text-slate-500">
                    Use this for manual onboarding when you do not want an invite sent.
                  </span>
                </span>
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
                <SubmitButton label="Send invite" />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
