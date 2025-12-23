"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { personaConfigs } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "./ui/primitives";

export function SupportRouter({ onContactClick }: { onContactClick: () => void }) {
  const [personaId, setPersonaId] = useState<string>(personaConfigs[0]?.id ?? "prospect");
  const persona = useMemo(
    () => personaConfigs.find((p) => p.id === personaId) ?? personaConfigs[0],
    [personaId]
  );

  return (
    <section id="who" className={layout.section}>
      <div className={layout.container}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={layout.eyebrow}>Who are you?</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Tailor support to your role.
            </h2>
            <p className={cn(layout.body, "mt-2 text-slate-600 dark:text-slate-300")}>
              Pick the path that matches you to see the best starting points and contact channels.
            </p>
          </div>
          <Badge className="bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
            Persona router
          </Badge>
        </div>

        <div className="mt-6 grid gap-2 overflow-auto rounded-xl border border-black/10 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950 sm:grid-cols-5">
          {personaConfigs.map((item) => (
            <button
              key={item.id}
              onClick={() => setPersonaId(item.id)}
              className={cn(
                "flex h-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                layout.focusRing,
                personaId === item.id
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-teal-500/60 dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900"
              )}
              aria-pressed={personaId === item.id}
            >
              {item.label}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {item.description}
              </span>
            </button>
          ))}
        </div>

        {persona ? (
          <Card className="mt-6 border-teal-500/20 bg-white/90 shadow-sm dark:bg-slate-950/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Recommended for {persona.label}
                <Badge className="bg-teal-50 text-teal-900 dark:bg-teal-900 dark:text-teal-100">
                  Placeholder guidance
                </Badge>
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-300">{persona.contactHint}</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Recommended topics
                </p>
                <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                  {persona.recommendedTopics.map((topic) => (
                    <li key={topic}>• {topic}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-black/10 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Best channel
                </p>
                <p className="mt-2 text-slate-800 dark:text-white">{persona.bestChannel}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{persona.troubleshooting}</p>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Next step
                </p>
                <Button variant="primary" size="sm" className="gap-2" onClick={onContactClick}>
                  <MessageCircle className="h-4 w-4" />
                  {persona.contactCta}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-teal-700 hover:text-teal-800 dark:text-teal-200"
                  onClick={onContactClick}
                >
                  View all options
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
