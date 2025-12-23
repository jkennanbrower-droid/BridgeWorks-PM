"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, MoveUpRight } from "lucide-react";
import { escalationTimeline, severityWizard, supportPlans } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Input,
  useToast,
} from "./ui/primitives";

function TimelineDot({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "h-3 w-3 rounded-full border border-teal-500/40",
        active ? "bg-teal-500" : "bg-white dark:bg-slate-900"
      )}
      aria-hidden
    />
  );
}

export function SlaAndEscalation() {
  const [wizardIndex, setWizardIndex] = useState(0);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const { pushToast } = useToast();

  const step = severityWizard[wizardIndex] ?? severityWizard[0];

  const handleEscalation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEscalationOpen(false);
    pushToast({ title: "Escalation requested (placeholder)", description: "We will review and respond." });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {supportPlans.map((plan) => (
          <Card key={plan.id} className="border-black/10 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/90">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Badge className="bg-white text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">Placeholder</Badge>
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">{plan.notes}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Clock className="h-4 w-4 text-teal-600" /> {plan.response}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coverage</p>
                <p>{plan.coverage}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Channels</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {plan.channels.map((channel) => (
                    <Badge key={channel} className="bg-slate-100 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-teal-500/20 bg-gradient-to-r from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Severity guide (placeholder)</CardTitle>
          <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Issue wizard</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.prompt}</p>
              <p className="text-sm text-teal-800 dark:text-teal-100">{step.recommendation}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setWizardIndex((prev) => (prev === 0 ? severityWizard.length - 1 : prev - 1))}
                aria-label="Previous prompt"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2" aria-label="Wizard steps">
                {severityWizard.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setWizardIndex(idx)}
                    className={cn(
                      "h-2.5 w-6 rounded-full transition",
                      idx === wizardIndex ? "bg-teal-600" : "bg-slate-200 dark:bg-slate-700"
                    )}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setWizardIndex((prev) => (prev + 1) % severityWizard.length)}
                aria-label="Next prompt"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-950">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Escalation path (placeholder)
          </CardTitle>
          <Button variant="primary" size="sm" className="gap-2" onClick={() => setEscalationOpen(true)}>
            Request escalation
            <MoveUpRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {escalationTimeline.map((item, idx) => (
            <div key={item} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <TimelineDot active />
                {idx < escalationTimeline.length - 1 ? (
                  <span className="my-1 h-full w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                ) : null}
              </div>
              <div className="rounded-lg border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                {item}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={escalationOpen} onOpenChange={setEscalationOpen} title="Request escalation">
        <form className="space-y-3" onSubmit={handleEscalation}>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Ticket ID (placeholder)
            <Input required className="mt-1" placeholder="TCK-1234" />
          </label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Why escalation is needed
            <textarea
              required
              className={cn(
                "mt-1 min-h-[100px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200",
                layout.focusRing
              )}
              placeholder="Impact, timeline, stakeholders (placeholder)."
            />
          </label>
          <Button type="submit" className="w-full">Submit placeholder</Button>
        </form>
      </Dialog>
    </div>
  );
}
