"use client";

import { cn } from "../ui/cn";
import { layout } from "../ui/layout";
import { useCtaModal } from "./LandingPageClient";

/*
 * Section: Final CTA.
 * Purpose: Closing prompt to drive demo or walkthrough requests.
 * Edit: Headline, supporting copy, CTA labels.
 * Layout: layout.sectionTight, layout.card, layout.bodyMax.
 */
export function FinalCtaSection() {
  const { openDemo, openWalkthrough } = useCtaModal();

  // EDIT ME: Update final CTA copy and labels.
  return (
    <section className={layout.sectionTight}>
      <div className={layout.container}>
        <div className={cn(layout.card, "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between")}>
          <div>
            <p className={layout.eyebrow}>Get started</p>
            <h2 className={cn(layout.h2, "mt-3")}>Ready to modernize property operations?</h2>
            <p className={cn(layout.body, layout.bodyMax, "mt-3")}>
              See how BridgeWorks helps teams deliver faster service, tighter
              compliance, and happier residents.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
        </div>
      </div>
    </section>
  );
}
