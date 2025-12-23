"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useMemo, useRef, useState } from "react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import { Modal } from "../../components/ui/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type IntendedUse = "Vendor risk review" | "Procurement" | "Customer audit" | "Other";

export function RequestPacketModal({ isOpen, onClose, onSuccess }: Props) {
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "success">("idle");

  const intendedUseOptions = useMemo(() => {
    return [
      "Vendor risk review",
      "Procurement",
      "Customer audit",
      "Other",
    ] satisfies IntendedUse[];
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      title="Request Security Packet"
      onClose={() => {
        onClose();
        setState("idle");
      }}
      initialFocusRef={firstFieldRef}
    >
      {state === "success" ? (
        <div>
          <p className={cn(layout.body)}>
            Thanks — your request was received.
          </p>
          <div className="mt-4 rounded-xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
            We’ll respond within a few business days (placeholder).
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className={cn(layout.buttonBase, layout.buttonPrimary)}
              onClick={() => {
                onSuccess();
                setState("idle");
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (state === "submitting") return;
            setState("submitting");

            // Placeholder handler: simulate a request.
            await new Promise((r) => window.setTimeout(r, 650));
            setState("success");
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This is a placeholder workflow for gating assurance artifacts.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="req-name">
                Name
              </label>
              <input
                ref={firstFieldRef}
                id="req-name"
                className={cn(layout.inputBase, layout.focusRing, "mt-2")}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="req-company">
                Company
              </label>
              <input
                id="req-company"
                className={cn(layout.inputBase, layout.focusRing, "mt-2")}
                required
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="req-email">
                Email
              </label>
              <input
                id="req-email"
                type="email"
                className={cn(layout.inputBase, layout.focusRing, "mt-2")}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="req-role">
                Role
              </label>
              <input
                id="req-role"
                className={cn(layout.inputBase, layout.focusRing, "mt-2")}
                placeholder="Security, IT, Procurement…"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor="req-intended">
              Intended use
            </label>
            <select
              id="req-intended"
              className={cn(layout.inputBase, layout.focusRing, "mt-2")}
              defaultValue={"Vendor risk review"}
            >
              {intendedUseOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={cn("rounded-xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200")}
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className={cn("mt-1 h-4 w-4 rounded border-black/20", layout.focusRing)}
                required
                aria-describedby="nda-help"
              />
              <span>
                I agree to an NDA (placeholder).
                <span id="nda-help" className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Replace this with your actual NDA flow.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className={cn(layout.buttonBase, layout.buttonSecondary)}
              onClick={onClose}
              disabled={state === "submitting"}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(layout.buttonBase, layout.buttonPrimary)}
              disabled={state === "submitting"}
            >
              {state === "submitting" ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
