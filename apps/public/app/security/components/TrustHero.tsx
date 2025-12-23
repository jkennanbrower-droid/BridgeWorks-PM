"use client";

/*
 * Public-facing Trust Center page; replace placeholder content before launch.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Fingerprint,
  Lock,
  ShieldCheck,
  Signal,
} from "lucide-react";

import { cn } from "../../components/ui/cn";
import { layout } from "../../components/ui/layoutTokens";
import { mockTrustData } from "../lib/mockTrustData";

type Props = {
  onRequestPacket: () => void;
  onViewControls: () => void;
};

type ChipIconKey =
  | "mfa"
  | "sso"
  | "audit"
  | "encryption"
  | "vdp"
  | "status";

const chipIconMap: Record<ChipIconKey, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  mfa: Fingerprint,
  sso: ShieldCheck,
  audit: CheckCircle2,
  encryption: Lock,
  vdp: ShieldCheck,
  status: Signal,
};

function TrustChip({
  id,
  label,
  description,
}: {
  id: string;
  label: string;
  description: string;
}) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const Icon = chipIconMap[(id as ChipIconKey) ?? "audit"] ?? ShieldCheck;

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950",
          layout.focusRing
        )}
        aria-describedby={tooltipId}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>

      {isOpen ? (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-3 text-xs text-slate-700 shadow-lg dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
        >
          {description}
        </div>
      ) : (
        <span id={tooltipId} className="sr-only">
          {description}
        </span>
      )}
    </div>
  );
}

export function TrustHero({ onRequestPacket, onViewControls }: Props) {
  const chips = mockTrustData.hero.trustChips;

  const illustration = useMemo(() => {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-sm dark:border-white/10 dark:from-teal-950/30 dark:via-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 opacity-70 [background:radial-gradient(900px_circle_at_15%_0%,rgba(20,184,166,0.22),transparent_60%),radial-gradient(700px_circle_at_85%_70%,rgba(56,189,248,0.14),transparent_55%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Illustration / screenshot placeholder
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              Replace before launch
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Use a sanitized UI screenshot or abstract diagram that matches the
            home page style.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
              <div className="font-semibold text-slate-900 dark:text-white">
                Access controls
              </div>
              <div className="mt-2 text-slate-600 dark:text-slate-300">
                MFA, SSO-ready patterns, least privilege (placeholder).
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200">
              <div className="font-semibold text-slate-900 dark:text-white">
                Data protection
              </div>
              <div className="mt-2 text-slate-600 dark:text-slate-300">
                Encryption, backups, retention & exports (placeholder).
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-black/10 bg-white py-16 dark:border-white/10 dark:bg-black sm:py-20">
      <div className="absolute inset-0 [background:radial-gradient(900px_circle_at_12%_10%,rgba(20,184,166,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_35%,rgba(56,189,248,0.10),transparent_55%)]" />
      <div className={cn(layout.container, "relative")}
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={layout.eyebrow}>Trust center</p>
            <motion.h1
              className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              {mockTrustData.hero.title}
            </motion.h1>
            <motion.p
              className={cn(layout.body, "mt-4 max-w-xl")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
            >
              {mockTrustData.hero.subtitle}
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-2" aria-label="Trust highlights">
              {chips.map((chip) => (
                <TrustChip
                  key={chip.id}
                  id={chip.id}
                  label={chip.label}
                  description={chip.description}
                />
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onRequestPacket}
                className={cn(layout.buttonBase, layout.buttonPrimary)}
              >
                Request Security Packet
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onViewControls}
                className={cn(layout.buttonBase, layout.buttonSecondary)}
              >
                View Controls by Area
              </button>
              <Link
                href="#tab-faq"
                className={cn(layout.buttonBase, layout.buttonGhost)}
              >
                Browse FAQs
              </Link>
            </div>

            <div className="mt-8 text-xs text-slate-500 dark:text-slate-400">
              Note: All content on this page is placeholder until validated.
            </div>
          </div>

          {illustration}
        </div>
      </div>
    </section>
  );
}
