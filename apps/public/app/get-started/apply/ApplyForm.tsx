"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";

const portfolioOptions = [
  "Residential",
  "Commercial",
  "HOA/Association",
  "Student",
  "Affordable",
  "Mixed-Use",
  "Other",
];

const softwareOptions = [
  "AppFolio",
  "Buildium",
  "Yardi",
  "RealPage",
  "Rent Manager",
  "Other",
  "None",
];

export function ApplyForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      orgName: formData.get("orgName"),
      contactName: formData.get("contactName"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      portfolioTypes: formData.getAll("portfolioTypes"),
      approxProperties: formData.get("approxProperties"),
      approxUnits: formData.get("approxUnits"),
      currentSoftware: formData.get("currentSoftware"),
      notes: formData.get("notes"),
      companyWebsite: formData.get("companyWebsite"),
    };

    try {
      const response = await fetch("/api/onboarding-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.error || "Unable to submit the application.");
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      if (data?.id) {
        router.push(
          `/get-started/submitted?ref=${encodeURIComponent(data.id)}`
        );
        return;
      }

      setErrorMessage("Unable to submit the application.");
    } catch {
      setErrorMessage("Unable to submit the application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className={layout.eyebrow}>Application</p>
        <h2 className={cn(layout.h2, "mt-3")}>
          Tell us about your organization.
        </h2>
        <p className={cn(layout.body, "mt-2")}>
          We use these details to size your rollout and configure the right
          workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Company / Organization name *
          </span>
          <input
            name="orgName"
            type="text"
            required
            autoComplete="organization"
            className={layout.inputBase}
            placeholder="BridgeWorks Property Management"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Primary contact name
          </span>
          <input
            name="contactName"
            type="text"
            autoComplete="name"
            className={layout.inputBase}
            placeholder="Jordan Taylor"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Work email *
          </span>
          <input
            name="contactEmail"
            type="email"
            required
            autoComplete="email"
            className={layout.inputBase}
            placeholder="you@company.com"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Phone
          </span>
          <input
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            className={layout.inputBase}
            placeholder="(555) 123-4567"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Portfolio type
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {portfolioOptions.map((option) => (
              <span
                key={option}
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  name="portfolioTypes"
                  value={option}
                  className={cn(
                    "h-4 w-4 rounded border-black/20 text-teal-600",
                    layout.focusRing
                  )}
                />
                <span>{option}</span>
              </span>
            ))}
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Approx # Properties
          </span>
          <input
            name="approxProperties"
            type="number"
            min={0}
            inputMode="numeric"
            className={layout.inputBase}
            placeholder="75"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Approx # Units/Doors
          </span>
          <input
            name="approxUnits"
            type="number"
            min={0}
            inputMode="numeric"
            className={layout.inputBase}
            placeholder="1800"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Current software
          </span>
          <select name="currentSoftware" className={layout.inputBase} defaultValue="">
            <option value="">Select one</option>
            {softwareOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Notes
          </span>
          <textarea
            name="notes"
            rows={4}
            className={cn(layout.inputBase, "min-h-[120px]")}
            placeholder="Share anything that would help us provision your workspace."
          />
        </label>

        <input
          type="text"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {errorMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-950 dark:text-rose-200"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          layout.buttonBase,
          layout.buttonPrimary,
          isSubmitting && "cursor-not-allowed opacity-70"
        )}
      >
        {isSubmitting ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
