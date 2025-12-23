"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useState } from "react";
import { Headset, Mail, MessageCircle, Ticket } from "lucide-react";
import {
  bestPracticeGuides,
  contactOptions,
  featuredCollections,
  popularAccordions,
} from "../../lib/mockSupportData";
import { layout } from "../ui/layoutTokens";
import { ContactSupportModal } from "./ContactSupportModal";
import { FaqSection } from "./FaqSection";
import { SlaAndEscalation } from "./SlaAndEscalation";
import { StatusSection } from "./StatusSection";
import { TicketStatusChecker } from "./TicketStatusChecker";
import { TrainingResources } from "./TrainingResources";
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
  Sheet,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/primitives";

const tabKeys = [
  { id: "self", label: "Self-Service" },
  { id: "contact", label: "Contact" },
  { id: "status", label: "Status" },
  { id: "sla", label: "SLAs & Escalation" },
  { id: "training", label: "Training & Resources" },
  { id: "faq", label: "FAQ" },
];

export function SupportTabs({
  controlledTab,
  onTabChange,
}: {
  controlledTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const isControlled = controlledTab !== undefined;
  const [internalTab, setInternalTab] = useState<string>(controlledTab ?? "self");
  const tabValue = isControlled ? controlledTab : internalTab;
  const [ticketOpen, setTicketOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const setTab = (value: string) => {
    if (!isControlled) setInternalTab(value);
    onTabChange?.(value);
  };

  const renderCollectionCard = (collection: (typeof featuredCollections)[number]) => (
    <Card
      key={collection.id}
      className="overflow-hidden border-black/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-950/90"
    >
      <div className="h-28 bg-linear-to-r from-slate-100 via-white to-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        {collection.imageLabel}
      </div>
      <CardHeader>
        <CardTitle>{collection.title}</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">{collection.description}</p>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Placeholder thumbnail</span>
        <Button variant="secondary" size="sm">View</Button>
      </CardContent>
    </Card>
  );

  return (
    <section id="support-tabs" className={layout.section}>
      <div className={layout.container}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={layout.eyebrow}>Support library</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Self-service and live help in one place.</h2>
          </div>
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 sm:hidden"
            value={tabValue}
            onChange={(event) => setTab(event.target.value)}
            aria-label="Support tab selector"
          >
            {tabKeys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <Tabs value={tabValue} onValueChange={setTab} defaultValue="self" className="mt-6">
          <div className="sticky top-2 z-10 hidden rounded-xl border border-black/10 bg-white/80 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:block">
            <TabsList className="flex flex-wrap gap-2">
              {tabKeys.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="self">
            <div className="space-y-8">
              <div className="grid gap-4 lg:grid-cols-3">{featuredCollections.map(renderCollectionCard)}</div>

              <Card className="bg-slate-50 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>Popular articles</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Expandable list with quick steps (placeholder).</p>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={[popularAccordions[0]?.id ?? ""]}>
                    {popularAccordions.map((item) => (
                      <AccordionItem key={item.id} value={item.id}>
                        <AccordionTrigger value={item.id}>{item.title}</AccordionTrigger>
                        <AccordionContent value={item.id}>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                            {item.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {bestPracticeGuides.map((guide) => (
                  <Card key={guide.id} className="border-dashed border-teal-500/30 bg-white/90 shadow-sm dark:border-teal-500/30 dark:bg-slate-950/90">
                    <CardHeader className="flex items-start justify-between">
                      <CardTitle className="text-base">{guide.title}</CardTitle>
                      <Badge className="bg-teal-50 text-xs text-teal-900 dark:bg-teal-900 dark:text-teal-100">Guide</Badge>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-700 dark:text-slate-200">{guide.summary}</CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact">
            <div id="contact" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {contactOptions.map((option) => (
                  <Card key={option.id} className="h-full border-black/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-950/90">
                    <CardHeader className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{option.title}</CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{option.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{option.availability}</p>
                      </div>
                      <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Placeholder</Badge>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (option.id === "ticket") setTicketOpen(true);
                          if (option.id === "chat") setChatOpen(true);
                          if (option.id === "email") window.location.href = "mailto:support@example.com";
                          if (option.id === "sales") document.querySelector("#who")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {option.id === "ticket" && <Ticket className="mr-2 h-4 w-4" />} 
                        {option.id === "chat" && <MessageCircle className="mr-2 h-4 w-4" />} 
                        {option.id === "email" && <Mail className="mr-2 h-4 w-4" />} 
                        {option.id === "sales" && <Headset className="mr-2 h-4 w-4" />} 
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <ContactSupportModal open={ticketOpen} onOpenChange={setTicketOpen} />

              <Sheet open={chatOpen} onOpenChange={setChatOpen} title="Live chat (placeholder)">
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  <p>Chat widget placeholder. Use your provider embed here.</p>
                  <div className="rounded-xl border border-dashed border-black/15 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Example messages</p>
                    <p className="mt-1">Support: &quot;Hi! Tell us what&#39;s happening.&quot;</p>
                    <p className="mt-1">You: &quot;Placeholder question about payments.&quot;</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setChatOpen(false)}>
                    Close placeholder chat
                  </Button>
                </div>
              </Sheet>

              <TicketStatusChecker />
            </div>
          </TabsContent>

          <TabsContent value="status">
            <StatusSection />
          </TabsContent>

          <TabsContent value="sla">
            <SlaAndEscalation />
          </TabsContent>

          <TabsContent value="training">
            <TrainingResources />
          </TabsContent>

          <TabsContent value="faq">
            <FaqSection />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
