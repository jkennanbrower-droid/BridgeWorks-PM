"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { CreditCard, FileSpreadsheet, KeyRound, PlugZap, ShieldCheck, Wrench } from "lucide-react";
import { quickActionSeed, type QuickAction } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import { Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/primitives";

const icons = [KeyRound, CreditCard, Wrench, FileSpreadsheet, ShieldCheck, PlugZap];

export function QuickActions({
  onSelect,
}: {
  onSelect: (filters?: string[]) => void;
}) {
  const actions: QuickAction[] = quickActionSeed.map((item, index) => ({
    ...item,
    icon: icons[index % icons.length],
  }));

  const handleClick = (action: QuickAction) => {
    if (action.anchor) {
      const el = document.querySelector(action.anchor);
      el?.scrollIntoView({ behavior: "smooth" });
    }
    onSelect(action.filters);
  };

  return (
    <section id="quick-actions" className={cn(layout.section, "bg-linear-to-b from-white to-slate-50 dark:from-black dark:to-slate-950")}> 
      <div className={layout.container}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={layout.eyebrow}>Top actions</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Handle common requests fast.</h2>
            <p className={cn(layout.body, "mt-2 text-slate-600 dark:text-slate-300")}>Shortcuts that open the right flows or pre-filter search results.</p>
          </div>
          <Badge className="bg-teal-50 text-teal-900 dark:bg-teal-900 dark:text-teal-100">Scannable grid</Badge>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.id}
                className="group flex flex-col justify-between border-black/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-950/90"
              >
                <CardHeader className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle>{action.title}</CardTitle>
                      <CardContent className="px-0 pb-0 text-sm text-slate-600 dark:text-slate-300">
                        {action.description}
                      </CardContent>
                    </div>
                  </div>
                  <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Shortcut</Badge>
                </CardHeader>
                <CardFooter className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => handleClick(action)}
                    aria-label={`Open ${action.title}`}
                  >
                    Go
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
