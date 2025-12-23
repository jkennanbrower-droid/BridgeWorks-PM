"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useMemo, useState } from "react";
import { CalendarClock, ScrollText } from "lucide-react";
import { releaseNotes, trainingResources, webinarSchedule } from "../../lib/mockSupportData";
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "./ui/primitives";

const modules = ["All", ...new Set(releaseNotes.map((item) => item.module))];

export function TrainingResources() {
  const [moduleFilter, setModuleFilter] = useState<string>("All");

  const filteredReleaseNotes = useMemo(() => {
    if (moduleFilter === "All") return releaseNotes;
    return releaseNotes.filter((item) => item.module === moduleFilter);
  }, [moduleFilter]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {trainingResources.map((resource) => (
          <Card key={resource.id} className="border-black/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-950/90">
            <CardHeader className="flex items-center justify-between gap-2">
              <CardTitle>{resource.title}</CardTitle>
              <Badge className="bg-teal-50 text-xs text-teal-900 dark:bg-teal-900 dark:text-teal-100">Placeholder</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <p>{resource.description}</p>
              <Button variant="secondary" size="sm" className="w-full">
                {resource.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-teal-500/20 bg-gradient-to-r from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-teal-600" /> Webinars / office hours (placeholder)
          </CardTitle>
          <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Live training</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {webinarSchedule.map((webinar) => (
            <div
              key={webinar.id}
              className="flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {webinar.audience}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{webinar.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{webinar.date}</p>
              </div>
              <Button variant="secondary" size="sm" className="mt-3">
                Register placeholder
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-950">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-teal-600" /> Release notes & product updates (placeholder)
          </CardTitle>
          <Tabs value={moduleFilter} onValueChange={setModuleFilter} defaultValue="All">
            <TabsList>
              {modules.map((module) => (
                <TabsTrigger key={module} value={module}>
                  {module}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredReleaseNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              No release notes in this filter (placeholder).
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={[filteredReleaseNotes[0]?.id ?? ""]}>
              {filteredReleaseNotes.map((note) => (
                <AccordionItem key={note.id} value={note.id}>
                  <AccordionTrigger value={note.id}>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 dark:bg-teal-900 dark:text-teal-100">
                        {note.module}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{note.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{note.date}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent value={note.id}>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                      {note.changes.map((change) => (
                        <li key={change}>{change}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
