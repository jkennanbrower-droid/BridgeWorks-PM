"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { MobileCtaBar } from "./MobileCtaBar";
import { Modal } from "../ui/Modal";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";

type ActiveModal = "demo" | "walkthrough" | null;
type CtaModalContextValue = {
  openDemo: () => void;
  openWalkthrough: () => void;
};

const CtaModalContext = createContext<CtaModalContextValue | null>(null);

export function useCtaModal() {
  const context = useContext(CtaModalContext);
  if (!context) {
    throw new Error("useCtaModal must be used within LandingPageClient.");
  }
  return context;
}

/*
 * Section: Landing CTA + modal provider.
 * Purpose: Coordinates CTA-triggered modals and the mobile sticky CTA bar.
 * Edit: Demo modal copy, walkthrough form labels, success message.
 * Layout: Uses layout.buttonBase, layout.inputBase, layout.focusRing, layout.panel.
 */
export function LandingPageClient({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [walkthroughSubmitted, setWalkthroughSubmitted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const openDemo = useCallback(() => {
    setActiveModal("demo");
  }, []);
  const openWalkthrough = useCallback(() => {
    setWalkthroughSubmitted(false);
    setActiveModal("walkthrough");
  }, []);

  const contextValue = useMemo(
    () => ({ openDemo, openWalkthrough }),
    [openDemo, openWalkthrough]
  );

  return (
    <>
      <CtaModalContext.Provider value={contextValue}>
        {children}
        <MobileCtaBar onOpenDemo={openDemo} onOpenWalkthrough={openWalkthrough} />
      </CtaModalContext.Provider>

      <Modal
        isOpen={activeModal === "demo"}
        title="Try Live Demo"
        onClose={() => setActiveModal(null)}
      >
        {/* EDIT ME: Update demo modal copy and CTA labels. */}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Experience a guided walkthrough of the BridgeWorks command center with
          sample data and live workflows.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={cn(layout.buttonBase, layout.buttonPrimary)}
          >
            Launch demo
          </button>
          <button
            type="button"
            className={cn(layout.buttonBase, layout.buttonSecondary)}
            onClick={() => setActiveModal(null)}
          >
            Close
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === "walkthrough"}
        title="Book Walkthrough"
        onClose={() => setActiveModal(null)}
        initialFocusRef={firstFieldRef}
      >
        {/* EDIT ME: Update walkthrough form labels and success message. */}
        {walkthroughSubmitted ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200">
            Thanks! A product specialist will follow up shortly with next steps.
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setWalkthroughSubmitted(true);
            }}
          >
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              Name
              <input
                ref={firstFieldRef}
                required
                name="name"
                className={cn(layout.inputBase, layout.focusRing)}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              Email
              <input
                required
                type="email"
                name="email"
                className={cn(layout.inputBase, layout.focusRing)}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              Portfolio size
              <input
                name="portfolio"
                placeholder="e.g. 4,500 units"
                className={cn(layout.inputBase, layout.focusRing)}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              Message
              <textarea
                name="message"
                rows={3}
                className={cn(layout.inputBase, layout.focusRing)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={cn(layout.buttonBase, layout.buttonPrimary)}
              >
                Submit request
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className={cn(layout.buttonBase, layout.buttonSecondary)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
