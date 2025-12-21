"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { forceCreateClerkUser, updatePlatformUser } from "./actions";
import {
  PERSON_STATUSES,
  PERSON_STATUS_LABELS,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
} from "../constants";

type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const initialState: ActionState = { ok: false };

export function UserActions({
  personId,
  name,
  email,
  platformRole,
  status,
  clerkUserId,
}: {
  personId: string;
  name: string | null;
  email: string;
  platformRole: string | null;
  status: string;
  clerkUserId: string | null;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const [editState, editAction] = useActionState(updatePlatformUser, initialState);
  const [forceState, forceAction] = useActionState(
    forceCreateClerkUser,
    initialState,
  );

  const orderedRoles = useMemo(() => PLATFORM_ROLES, []);
  const orderedStatuses = useMemo(() => PERSON_STATUSES, []);

  useEffect(() => {
    if (editState.ok) {
      editFormRef.current?.reset();
      setEditOpen(false);
      router.refresh();
    }
  }, [editState.ok, router]);

  useEffect(() => {
    if (forceState.ok) {
      router.refresh();
    }
  }, [forceState.ok, router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
      >
        Edit user
      </button>
      <form action={forceAction}>
        <input type="hidden" name="personId" value={personId} />
        <button
          type="submit"
          disabled={Boolean(clerkUserId)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Force Clerk user
        </button>
      </form>
      {forceState.error ? (
        <span className="text-sm text-rose-600">{forceState.error}</span>
      ) : null}
      {forceState.ok && forceState.message ? (
        <span className="text-sm text-emerald-600">{forceState.message}</span>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit user
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Update profile, role, and access status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form ref={editFormRef} action={editAction} className="mt-6 grid gap-4">
              <input type="hidden" name="personId" value={personId} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input
                  name="name"
                  defaultValue={name ?? ""}
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={email}
                  required
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Platform role
                <select
                  name="platformRole"
                  defaultValue={platformRole ?? ""}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Unassigned</option>
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
                  defaultValue={status}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {orderedStatuses.map((value) => (
                    <option key={value} value={value}>
                      {PERSON_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              {editState.error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {editState.error}
                </div>
              ) : null}

              {editState.ok && editState.message ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {editState.message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
