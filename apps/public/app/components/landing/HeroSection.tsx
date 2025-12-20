"use client";

import { CommandCenterDemo } from "./CommandCenterDemo";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import { useCtaModal } from "./LandingPageClient";

/*
 * Section: Hero + command center preview.
 * Purpose: Establish product value, highlight CTAs, and introduce the demo panel.
 * Edit: H1/subhead copy, CTA labels, trustItems array.
 * Layout: layout.section, layout.container, layout.eyebrow, layout.body, layout.bodyMax.
 */
export function HeroSection() {
  const { openDemo, openWalkthrough } = useCtaModal();

  // EDIT ME: Update hero copy, CTA labels, and micro-trust items.
  const trustItems = [
    // Safe to edit: trust item strings.
    "Early access partners across 12 markets",
    "SOC 2-ready security posture",
    "Implementation in weeks, not quarters",
  ];

  return (
    <section className={cn(layout.section, "relative overflow-hidden")}>
      <div className={cn(layout.container, "grid gap-10 lg:grid-cols-2")}>
        <div>
          <p className={layout.eyebrow}>BridgeWorks Property Ops</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            The operational command center for modern property teams.
          </h1>
          <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
            Unify leasing, maintenance, and resident communication in one
            configurable workspace that keeps every stakeholder aligned.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openDemo}
              className={cn(layout.buttonBase, layout.buttonPrimary)}
            >
              Try live demo
            </button>
            <button
              type="button"
              onClick={openWalkthrough}
              className={cn(layout.buttonBase, layout.buttonSecondary)}
            >
              Book walkthrough
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:flex-wrap">
            {trustItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <CommandCenterDemo />
      </div>
      <div className="pointer-events-none absolute -left-24 -top-32 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
    </section>
  );
}
