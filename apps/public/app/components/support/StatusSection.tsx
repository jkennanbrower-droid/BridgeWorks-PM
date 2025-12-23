"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useState } from "react";
import { Activity, Bell, ExternalLink, ShieldAlert } from "lucide-react";
import { statusSubscriptions } from "../../lib/mockSupportData";
import { layout } from "../ui/layoutTokens";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
} from "./ui/primitives";

export function StatusSection() {
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="border-teal-500/20 bg-linear-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" /> Status embed placeholder
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300">Live status widget area. Swap with your provider embed.</p>
          </div>
          <Button variant="secondary" className="gap-2" size="sm">
            View status page
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 rounded-xl border border-dashed border-teal-500/30 bg-white/70 p-4 text-sm text-slate-700 shadow-inner dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-200">
            <div className="flex items-center gap-3 rounded-lg border border-black/5 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Placeholder: All systems operational
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Embed your provider iframe or API-driven component. Keep this container responsive.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-teal-600" /> Subscribe to updates
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300">Choose channels; modal captures details (placeholder).</p>
          </div>
          <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">No backend wired</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {statusSubscriptions.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubscribeOpen(true)}
              className="inline-flex items-start gap-3 rounded-xl border border-black/10 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            >
              <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-teal-600" aria-hidden />
              <div>
                {sub.label}
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{sub.description}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Incident communication policy (placeholder)
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">How updates and notifications are handled.</p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" defaultValue="policy">
            {["policy", "cadence", "postmortem"].map((id) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger value={id}>
                  {id === "policy"
                    ? "Notification channels"
                    : id === "cadence"
                    ? "Update cadence"
                    : "After-action reviews"}
                </AccordionTrigger>
                <AccordionContent value={id}>
                  <p className={layout.body}>
                    Placeholder copy for how incidents are communicated, what channels are used, and how follow-ups are shared.
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen} title="Subscribe to updates">
        <form className="space-y-3">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Email (placeholder)
            <Input type="email" required className="mt-1" placeholder="you@example.com" />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Delivery preference
            <Input className="mt-1" placeholder="e.g., incidents only (placeholder)" />
          </label>
          <Button type="submit" className="w-full">Subscribe placeholder</Button>
        </form>
      </Dialog>
    </div>
  );
}
