"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Clipboard,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { cn } from "../components/ui/cn";
import { layout } from "../components/ui/layoutTokens";

import { TrustHero } from "./components/TrustHero";
import { TrustTabs, type TrustTabId } from "./components/TrustTabs";
import { ControlsCatalog } from "./components/ControlsCatalog";
import { RequestPacketModal } from "./components/RequestPacketModal";
import { ComplianceBadges } from "./components/ComplianceBadges";
import { SubprocessorsList } from "./components/SubprocessorsList";
import { VulnerabilityDisclosure } from "./components/VulnerabilityDisclosure";
import { FaqSearch } from "./components/FaqSearch";
import { StatusEmbedCard } from "./components/StatusEmbedCard";
import { mockTrustData } from "./lib/mockTrustData";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
};

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto rounded-2xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {toast.title}
                </div>
                {toast.description ? (
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {toast.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={cn(
                  "rounded-full border border-black/10 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10",
                  layout.focusRing
                )}
                onClick={() => onDismiss(toast.id)}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function SecurityTrustPage() {
  const { toasts, push, dismiss } = useToasts();
  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TrustTabId>("overview");
  const tabs = mockTrustData.tabs;

  const overviewRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const complianceRef = useRef<HTMLElement | null>(null);
  const privacyRef = useRef<HTMLElement | null>(null);
  const vulnerabilityRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const tabToRef = useMemo(() => {
    return {
      overview: overviewRef,
      controls: controlsRef,
      compliance: complianceRef,
      privacy: privacyRef,
      vulnerability: vulnerabilityRef,
      faq: faqRef,
    } satisfies Record<TrustTabId, typeof overviewRef>;
  }, []);

  const scrollToTab = useCallback((tab: TrustTabId) => {
    const el = tabToRef[tab]?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tabToRef]);

  // Keep tabs in sync with URL hash (#tab-xyz)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash || "";
      const match = hash.match(/^#tab-(overview|controls|compliance|privacy|vulnerability|faq)$/);
      if (match) {
        const tab = match[1] as TrustTabId;
        setActiveTab(tab);
        window.setTimeout(() => scrollToTab(tab), 0);
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [scrollToTab]);

  const setTab = useCallback((tab: TrustTabId) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#tab-${tab}`);
    }
    scrollToTab(tab);
  }, [scrollToTab]);

  const onCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      push({ title: "Copied", description: "Link copied to clipboard." });
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      push({ title: "Copied", description: "Link copied to clipboard." });
    }
  }, [push]);

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white">
      <TrustHero
        onRequestPacket={() => setIsPacketModalOpen(true)}
        onViewControls={() => setTab("controls")}
      />

      <section className={cn(layout.sectionTight, "pt-6")}
        aria-labelledby="at-a-glance"
        id="at-a-glance"
      >
        <div className={layout.container}>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className={layout.eyebrow}>At a glance</p>
              <h2 id="at-a-glance" className={cn(layout.h2, "mt-3 text-2xl sm:text-3xl")}
              >
                Practical controls, built in.
              </h2>
            </div>
            <div className="hidden items-center gap-2 text-xs text-slate-600 dark:text-slate-300 sm:flex">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Placeholder overview (marketing-safe)
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockTrustData.atAGlance.map((metric) => {
              const inner = (
                <div className={cn(layout.panel, "h-full")}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {metric.title}
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                    {metric.value}
                  </div>
                  {metric.description ? (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {metric.description}
                    </p>
                  ) : null}
                  {metric.href ? (
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                      <span>Open</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </div>
                  ) : null}
                </div>
              );

              if (!metric.href) return <div key={metric.id}>{inner}</div>;

              return (
                <a
                  key={metric.id}
                  href={metric.href}
                  target={metric.href.startsWith("http") ? "_blank" : undefined}
                  rel={metric.href.startsWith("http") ? "noreferrer" : undefined}
                  className={cn("block", layout.focusRing, "rounded-xl")}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <TrustTabs tabs={tabs} activeTab={activeTab} onChange={setTab} />

      <div className="pb-24">
        <section
          ref={(node) => {
            overviewRef.current = node;
          }}
          id="tab-overview"
          aria-labelledby="overview-title"
          className={layout.section}
        >
          <div className={layout.container}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={layout.eyebrow}>Overview</p>
                <h2 id="overview-title" className={cn(layout.h2, "mt-3")}
                >
                  Security program summary
                </h2>
              </div>
              <div className="hidden items-center gap-2 text-xs text-slate-600 dark:text-slate-300 sm:flex">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Scannable modules
              </div>
            </div>

            <div
              id="module-security-program"
              className={cn("mt-10", layout.card)}
            >
              <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
                <div>
                  <div className={layout.label}>Security Program</div>
                  <p className={cn(layout.body, "mt-3")}
                  >
                    Our security program is structured across People, Process, and
                    Technology. This content is placeholder for a public Trust
                    Center page.
                  </p>
                  <div className="mt-6 grid gap-4">
                    {mockTrustData.overview.securityProgram.pillars.map((pillar) => (
                      <div
                        key={pillar.id}
                        className={cn(layout.panelMuted)}
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {pillar.title}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {pillar.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className={layout.label}>Program Timeline</div>
                  <ol className="mt-5 space-y-4">
                    {mockTrustData.overview.securityProgram.timeline.map((step, idx) => (
                      <li key={step.id} className="relative pl-8">
                        <div className="absolute left-0 top-1.5 h-5 w-5 rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-slate-950" />
                        {idx !== mockTrustData.overview.securityProgram.timeline.length - 1 ? (
                          <div className="absolute left-2.5 top-7 h-[calc(100%-0.5rem)] w-px bg-black/10 dark:bg-white/10" />
                        ) : null}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {step.title}
                            </div>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {step.description}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                            {step.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div id="module-protects-data" className="mt-10">
              <div className={layout.label}>How BridgeWorks PM protects PM data</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mockTrustData.overview.protectionTiles.map((tile) => (
                  <div key={tile.id} className={cn(layout.panel)}>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {tile.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {tile.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div id="module-architecture" className="mt-10">
              <div className={cn(layout.card)}>
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className={layout.label}>
                      {mockTrustData.overview.architecture.title}
                    </div>
                    <p className={cn(layout.body, "mt-3")}
                    >
                      {mockTrustData.overview.architecture.description}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {mockTrustData.overview.architecture.callouts.map((callout) => (
                        <button
                          key={callout.id}
                          type="button"
                          className={cn(
                            "rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
                            layout.focusRing
                          )}
                          onClick={() => {
                            push({
                              title: callout.label,
                              description: callout.description,
                            });
                          }}
                        >
                          {callout.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full max-w-xl">
                    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 dark:border-white/10 dark:from-teal-950/30 dark:via-slate-950 dark:to-slate-900">
                      <div className="absolute inset-0 opacity-60 [background:radial-gradient(800px_circle_at_20%_10%,rgba(20,184,166,0.22),transparent_60%),radial-gradient(700px_circle_at_80%_60%,rgba(56,189,248,0.14),transparent_55%)]" />
                      <div className="relative">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          Diagram placeholder
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Insert a sanitized architecture snapshot image before launch.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {mockTrustData.overview.architecture.callouts.map((callout) => (
                            <div
                              key={callout.id}
                              className="rounded-xl border border-black/10 bg-white/70 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
                            >
                              <div className="font-semibold">{callout.label}</div>
                              <div className="mt-1 text-slate-600 dark:text-slate-300">
                                {callout.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={(node) => {
            controlsRef.current = node;
          }}
          id="tab-controls"
          aria-labelledby="controls-title"
          className={layout.sectionMuted}
        >
          <div className={layout.container}>
            <p className={layout.eyebrow}>Controls</p>
            <h2 id="controls-title" className={cn(layout.h2, "mt-3")}
            >
              Controls by area
            </h2>
            <p className={cn(layout.body, layout.bodyMax, "mt-3")}
            >
              Search and filter our control catalog. Everything here is placeholder
              and intended to be replaced with your validated controls and artifacts.
            </p>

            <div id="module-controls-catalog" className="mt-10">
              <ControlsCatalog
                controls={mockTrustData.controls.items}
                areas={mockTrustData.controls.areas}
                onCopy={onCopy}
              />
            </div>

            <div id="module-customer-features" className="mt-10">
              <div className={layout.label}>Customer Security Features</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mockTrustData.controls.customerFeatures.map((feature) => (
                  <div key={feature.id} className={cn(layout.panel)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {feature.title}
                      </div>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-white/5",
                          layout.focusRing
                        )}
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname}#feature-${feature.id}`;
                          void onCopy(url);
                        }}
                        aria-label={`Copy link to ${feature.title}`}
                      >
                        <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy link
                      </button>
                    </div>
                    <p
                      className="mt-2 text-sm text-slate-600 dark:text-slate-300"
                      id={`feature-${feature.id}`}
                    >
                      {feature.description}
                    </p>
                    {feature.note ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {feature.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div id="module-operational-transparency" className="mt-10">
              <div className={layout.label}>Operational Transparency</div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <StatusEmbedCard
                  statusHref="https://status.bridgeworkspm.example"
                  title="Service status"
                  description="A placeholder embed slot for your status provider."
                />
                <div className={cn(layout.panel)}>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Incident communications
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    During incidents or maintenance, we provide updates via a status
                    page and direct customer communications when appropriate. We avoid
                    promising specific timelines here; the goal is timely, transparent
                    updates (placeholder).
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5",
                        layout.focusRing
                      )}
                      href="https://status.bridgeworkspm.example"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Status Page
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsPacketModalOpen(true)}
                      className={cn(layout.buttonBase, layout.buttonPrimary)}
                    >
                      Request Security Packet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={(node) => {
            complianceRef.current = node;
          }}
          id="tab-compliance"
          aria-labelledby="compliance-title"
          className={layout.section}
        >
          <div className={layout.container}>
            <p className={layout.eyebrow}>Compliance</p>
            <h2 id="compliance-title" className={cn(layout.h2, "mt-3")}
            >
              Assurance artifacts (gated)
            </h2>
            <p className={cn(layout.body, layout.bodyMax, "mt-3")}
            >
              We don’t claim specific certifications as achieved on this page. Badges
              are clearly labeled as Planned / In progress / Info placeholders.
            </p>

            <div id="module-compliance-badges" className="mt-10">
              <ComplianceBadges
                frameworks={mockTrustData.compliance.frameworks}
                onRequestAccess={() => setIsPacketModalOpen(true)}
              />
            </div>

            <div id="module-security-packet" className="mt-10">
              <div className={cn(layout.card)}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <div className={layout.label}>Security Packet</div>
                    <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                      {mockTrustData.compliance.securityPacket.title}
                    </div>
                    <p className={cn(layout.body, "mt-2")}
                    >
                      {mockTrustData.compliance.securityPacket.description}
                    </p>
                    <ul className="mt-5 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                      {mockTrustData.compliance.securityPacket.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-teal-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      className={cn(layout.buttonBase, layout.buttonPrimary)}
                      onClick={() => setIsPacketModalOpen(true)}
                    >
                      Request Security Packet
                    </button>
                    <button
                      type="button"
                      className={cn(layout.buttonBase, layout.buttonSecondary, "mt-3 w-full")}
                      onClick={() => push({ title: "Placeholder", description: "Wire this to your CRM/form endpoint." })}
                    >
                      Learn what’s included
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="module-third-party-testing" className="mt-10">
              <div className={layout.label}>Third-Party Testing</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mockTrustData.compliance.thirdPartyTesting.map((item) => (
                  <div key={item.id} className={cn(layout.panel)}>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          ref={(node) => {
            privacyRef.current = node;
          }}
          id="tab-privacy"
          aria-labelledby="privacy-title"
          className={layout.sectionMuted}
        >
          <div className={layout.container}>
            <p className={layout.eyebrow}>Privacy</p>
            <h2 id="privacy-title" className={cn(layout.h2, "mt-3")}
            >
              Privacy & data handling
            </h2>

            <div id="module-data-handling" className="mt-10">
              <div className={layout.label}>Data Handling Overview</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mockTrustData.privacy.dataCategories.map((cat) => (
                  <div key={cat.id} className={cn(layout.panel)}>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cat.name}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Purpose:
                        </span>{" "}
                        {cat.purpose}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Retention:
                        </span>{" "}
                        {cat.retention}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Export/delete:
                        </span>{" "}
                        {cat.exportDelete}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="module-subprocessors" className="mt-10">
              <div className={layout.label}>Subprocessors (placeholder)</div>
              <div className="mt-5">
                <SubprocessorsList subprocessors={mockTrustData.privacy.subprocessors} />
              </div>
            </div>

            <div id="module-data-residency" className="mt-10">
              <div className={layout.label}>Data Residency (placeholder)</div>
              <div className="mt-5">
                <div className={cn(layout.card)}>
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Select a region
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Region options are placeholders; replace with your verified
                        deployment/residency commitments before launch.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-[320px]">
                      <select
                        className={cn(layout.inputBase, layout.focusRing, "appearance-none pr-10")}
                        aria-label="Select data residency region"
                        onChange={(e) => {
                          const selected = mockTrustData.privacy.residencyRegions.find(
                            (r) => r.id === e.target.value
                          );
                          if (selected) {
                            push({ title: selected.label, description: selected.description });
                          }
                        }}
                        defaultValue={mockTrustData.privacy.residencyRegions[0]?.id}
                      >
                        {mockTrustData.privacy.residencyRegions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="module-privacy-center" className="mt-10">
              <div className={layout.label}>Privacy Center</div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={mockTrustData.privacy.privacyLinks.privacyPolicyHref}
                  className={cn(layout.buttonBase, layout.buttonSecondary)}
                >
                  Privacy Policy
                </Link>
                <Link
                  href={mockTrustData.privacy.privacyLinks.dpaHref}
                  className={cn(layout.buttonBase, layout.buttonSecondary)}
                >
                  DPA
                </Link>
                <Link
                  href={mockTrustData.privacy.privacyLinks.cookiePolicyHref}
                  className={cn(layout.buttonBase, layout.buttonSecondary)}
                >
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={(node) => {
            vulnerabilityRef.current = node;
          }}
          id="tab-vulnerability"
          aria-labelledby="vulnerability-title"
          className={layout.section}
        >
          <div className={layout.container}>
            <p className={layout.eyebrow}>Vulnerability disclosure</p>
            <h2 id="vulnerability-title" className={cn(layout.h2, "mt-3")}
            >
              Responsible disclosure
            </h2>

            <div id="module-vdp" className="mt-10">
              <VulnerabilityDisclosure data={mockTrustData.vulnerability} onToast={push} />
            </div>
          </div>
        </section>

        <section
          ref={(node) => {
            faqRef.current = node;
          }}
          id="tab-faq"
          aria-labelledby="faq-title"
          className={layout.sectionMuted}
        >
          <div className={layout.container}>
            <p className={layout.eyebrow}>FAQ</p>
            <h2 id="faq-title" className={cn(layout.h2, "mt-3")}
            >
              Common due diligence questions
            </h2>

            <div id="module-faq" className="mt-10">
              <FaqSearch
                items={mockTrustData.faq.items}
                onToast={push}
                onRequestPacket={() => setIsPacketModalOpen(true)}
              />
            </div>

            <div id="module-still-have-questions" className="mt-10">
              <div className={cn(layout.card)}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      Still have questions?
                    </div>
                    <p className={cn(layout.body, "mt-2")}
                    >
                      Contact sales for procurement questions, or security for technical diligence.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        className={cn(layout.buttonBase, layout.buttonSecondary)}
                        href="mailto:sales@bridgeworkspm.com"
                      >
                        sales@bridgeworkspm.com
                      </a>
                      <a
                        className={cn(layout.buttonBase, layout.buttonSecondary)}
                        href="mailto:security@bridgeworkspm.com"
                      >
                        security@bridgeworkspm.com
                      </a>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      className={cn(layout.buttonBase, layout.buttonPrimary)}
                      onClick={() => setIsPacketModalOpen(true)}
                    >
                      Request Security Packet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <RequestPacketModal
        isOpen={isPacketModalOpen}
        onClose={() => setIsPacketModalOpen(false)}
        onSuccess={() => {
          push({
            title: "Request received",
            description: "We’ll follow up within a few business days (placeholder).",
          });
          setIsPacketModalOpen(false);
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="sr-only" aria-hidden="true">
        <Clipboard />
      </div>
    </main>
  );
}
