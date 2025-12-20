import { FaqSection } from "./components/landing/FaqSection";
import { FinalCtaSection } from "./components/landing/FinalCtaSection";
import { HeroSection } from "./components/landing/HeroSection";
import { ImplementationSection } from "./components/landing/ImplementationSection";
import { IntegrationsSection } from "./components/landing/IntegrationsSection";
import { LandingPageClient } from "./components/landing/LandingPageClient";
import { PillarsSection } from "./components/landing/PillarsSection";
import { PortalsSection } from "./components/landing/PortalsSection";
import { PricingSection } from "./components/landing/PricingSection";
import { ProofStrip } from "./components/landing/ProofStrip";
import { RolePathsSection } from "./components/landing/RolePathsSection";
import { SecuritySection } from "./components/landing/SecuritySection";
import { TestimonialsSection } from "./components/landing/TestimonialsSection";
import { WorkflowSection } from "./components/landing/WorkflowSection";
import { layout } from "./components/ui/layout";

export default function Page() {
  return (
    <LandingPageClient>
      <main className="bg-white text-slate-900 dark:bg-black dark:text-white">
        <div className="pb-24 sm:pb-0">
          <HeroSection />
          <ProofStrip />
          <RolePathsSection />
          <WorkflowSection />
          <PillarsSection />
          <PortalsSection />
          <IntegrationsSection />
          <SecuritySection />
          <PricingSection />
          <ImplementationSection />
          <TestimonialsSection />
          <FaqSection />
          <FinalCtaSection />
        </div>

        <footer className="border-t border-black/10 bg-white py-10 dark:border-white/10 dark:bg-black">
          <div className={layout.container}>
            {/* EDIT ME: Update footer links and legal copy. */}
            <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-semibold text-slate-900 dark:text-white">
                BridgeWorks Property Ops
              </div>
              <div className="flex flex-wrap gap-4">
                <span>Privacy</span>
                <span>Security</span>
                <span>Support</span>
              </div>
            </div>
            <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
              (c) 2025 BridgeWorks. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </LandingPageClient>
  );
}
