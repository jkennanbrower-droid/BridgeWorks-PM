"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { faqItems } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Input } from "./ui/primitives";

export function FaqSection() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return faqItems;
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950">
        <Search className="h-4 w-4 text-slate-500" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search FAQs (placeholder)"
          className="border-none bg-transparent px-0 focus-visible:ring-0"
          aria-label="Search FAQs"
        />
        <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Live filter</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
          No FAQs found. Try a different term or open contact options.
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={[filtered[0]?.question ?? ""]} className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-950">
          {filtered.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger value={item.question}>{item.question}</AccordionTrigger>
              <AccordionContent value={item.question}>
                <p className={cn(layout.body, "text-sm text-slate-700 dark:text-slate-200")}>{item.answer}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} className="bg-slate-100 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      <div className="rounded-xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
        Still need help? Use the contact options to reach us (placeholder).
      </div>
    </div>
  );
}
