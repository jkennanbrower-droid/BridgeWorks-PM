"use client";

import { cn } from "../ui/cn";
import { layout } from "../ui/layout";
import { useCtaModal } from "./LandingPageClient";

/*
 * Section: Mobile sticky CTA bar.
 * Purpose: Persistent CTA access on small screens.
 * Edit: Button labels in the JSX below.
 * Layout: Uses layout.container and layout.buttonBase tokens.
 */
export function MobileCtaBar() {
  const { openDemo, openWalkthrough } = useCtaModal();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-black/90 sm:hidden">
      <div className={cn(layout.container, "flex items-center gap-3 px-0")}>
        <button
          type="button"
          onClick={openDemo}
          className={cn(layout.buttonBase, layout.buttonPrimary, "flex-1")}
        >
          Try live demo
        </button>
        <button
          type="button"
          onClick={openWalkthrough}
          className={cn(layout.buttonBase, layout.buttonSecondary, "flex-1")}
        >
          Book walkthrough
        </button>
      </div>
    </div>
  );
}
