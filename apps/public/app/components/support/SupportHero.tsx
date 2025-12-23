"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { motion } from "framer-motion";
import { Headset, LifeBuoy, Search, Shield, Sparkles } from "lucide-react";
import { heroTrustChips } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "./ui/primitives";

export function SupportHero({
  onSearchFocus,
  onContactScroll,
}: {
  onSearchFocus: () => void;
  onContactScroll: () => void;
}) {
  return (
    <section className={cn(layout.section, "relative overflow-hidden")}> 
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(45,212,191,0.12),transparent_35%),radial-gradient(circle_at_80%_0,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),rgba(14,116,144,0.08))]" />
      <div className={cn(layout.container, "grid gap-10 lg:grid-cols-[1.15fr_1fr]")}> 
        <div className="space-y-6">
          <p className={layout.eyebrow}>Support Center</p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-5xl"
          >
            Find answers fast or contact BridgeWorks support.
          </motion.h1>
          <p className={cn(layout.body, layout.bodyMax)}>
            Built for operators, residents, and ownership teams who need reliable help. Start with search, or jump straight to the contact options that fit your situation.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onSearchFocus} className="gap-2" variant="primary" size="lg">
              <Search className="h-4 w-4" />
              Search help articles
            </Button>
            <Button onClick={onContactScroll} variant="secondary" size="lg" className="gap-2">
              <Headset className="h-4 w-4" />
              Contact support
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {heroTrustChips.map((chip) => (
              <Badge
                key={chip}
                className="cursor-default border-teal-600/30 bg-white/80 text-teal-900 backdrop-blur hover:border-teal-600 dark:bg-slate-950"
              >
                <Sparkles className="h-3 w-3" />
                {chip}
              </Badge>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Card className="relative overflow-hidden border-teal-500/20 bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
            <div className="absolute left-0 top-0 h-24 w-24 -translate-x-8 -translate-y-8 rounded-full bg-teal-400/20 blur-3xl" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Insert support dashboard screenshot</CardTitle>
                <Badge className="border-teal-600/40 bg-white/70 text-xs text-teal-900 dark:bg-slate-900">
                  Placeholder visual
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Showcase how teams triage requests, surface status, and route by severity.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 rounded-xl border border-dashed border-teal-500/30 bg-white/60 p-4 text-sm text-slate-700 shadow-inner dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-200">
                <div className="flex items-center gap-3 rounded-lg border border-black/5 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950">
                  <LifeBuoy className="h-4 w-4 text-teal-600" />
                  Support router placeholder (severity, persona)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {["Tickets", "Chat", "Email", "Status", "Training", "Docs"].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-black/5 bg-white px-3 py-2 text-center font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-teal-500/40 bg-linear-to-r from-teal-50 via-white to-white px-4 py-3 text-xs text-slate-700 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
                  <span className="font-semibold text-teal-800 dark:text-teal-200">Status widget placeholder</span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Operational transparency and subscriptions showcased here.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-black/5 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" />
                  <div className="font-semibold">Security packet placeholder</div>
                </div>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-900 dark:bg-teal-900 dark:text-teal-100">
                  Preview only
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
