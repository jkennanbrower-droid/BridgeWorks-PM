import type { ReactNode } from "react";
import { MobileCtaBar } from "./MobileCtaBar";

/*
 * Section: Landing CTA + modal provider.
 * Purpose: Renders the landing content and the mobile sticky CTA bar.
 */
export function LandingPageClient({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <MobileCtaBar />
    </>
  );
}
