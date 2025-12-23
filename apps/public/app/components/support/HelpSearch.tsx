"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useEffect, useMemo, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  FileSearch2,
  Link as LinkIcon,
  ShieldQuestion,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  popularAccordions,
  popularTopics,
  supportEntries,
  supportFilters,
  type SupportEntry,
  type SupportEntryType,
} from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "./ui/primitives";

const tabOrder: { label: string; type: SupportEntryType | "all" }[] = [
  { label: "All", type: "all" },
  { label: "Articles", type: "article" },
  { label: "Guides", type: "guide" },
  { label: "Troubleshooting", type: "troubleshooting" },
  { label: "Release Notes", type: "release" },
];

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.split(regex).map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={`${part}-${idx}`}
        className="rounded px-1 py-0.5 bg-teal-100 text-teal-900 dark:bg-teal-900/70 dark:text-teal-100"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
}

function ResultCard({ entry, query, onCopy }: { entry: SupportEntry; query: string; onCopy: () => void }) {
  return (
    <Card className="h-full border-black/10 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-950/90">
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Badge className="bg-slate-100 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">{entry.category}</Badge>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
            {highlight(entry.title, query)}
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">{highlight(entry.excerpt, query)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{entry.readTime}</span>
          <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={onCopy}>
            <LinkIcon className="h-4 w-4" /> Copy link
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          {entry.tags.map((tag) => (
            <Badge key={tag} className="bg-white text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HelpSearch({
  searchInputRef,
  presetFilters,
  presetQuery,
  onFiltersChange,
  onQueryChange,
}: {
  searchInputRef: RefObject<HTMLInputElement>;
  presetFilters?: string[];
  presetQuery?: string;
  onFiltersChange?: (filters: string[]) => void;
  onQueryChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabOrder)[number]["type"]>("all");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [query, activeFilters, activeTab]);

  useEffect(() => {
    if (presetFilters) setActiveFilters(presetFilters);
  }, [presetFilters]);

  useEffect(() => {
    if (presetQuery !== undefined) setQuery(presetQuery);
  }, [presetQuery]);

  const results = useMemo(() => {
    const text = query.toLowerCase();
    return supportEntries.filter((entry) => {
      const matchesTab = activeTab === "all" ? true : entry.type === activeTab;
      const matchesFilter =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => {
          const normalized = filter.toLowerCase();
          return (
            entry.category.toLowerCase().includes(normalized) ||
            entry.tags.some((tag) => tag.toLowerCase().includes(normalized))
          );
        });
      const matchesQuery =
        !text ||
        entry.title.toLowerCase().includes(text) ||
        entry.excerpt.toLowerCase().includes(text) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(text));
      return matchesTab && matchesFilter && matchesQuery;
    });
  }, [activeFilters, activeTab, query]);

  const suggestions = useMemo(() => {
    const topMatches = supportEntries.slice(0, 6);
    return [
      { id: "contact", label: "Contact support", hint: "Open the contact module" },
      ...topMatches.map((entry) => ({
        id: entry.id,
        label: entry.title,
        hint: entry.category,
      })),
    ];
  }, []);

  const updateQuery = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => {
      const next = prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter];
      onFiltersChange?.(next);
      return next;
    });
  };

  const handleCopy = (entry: SupportEntry) => {
    navigator.clipboard?.writeText(entry.link ?? "#");
    pushToast({ title: "Copied link", description: entry.title });
  };

  return (
    <section id="search" className={cn(layout.section, "bg-slate-50/60 dark:bg-slate-950/60")}> 
      <div className={layout.container}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={layout.eyebrow}>Global help search</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Search articles, guides, and troubleshooting.</h2>
            <p className={cn(layout.body, "mt-1 text-slate-600 dark:text-slate-300")}>
              Typeahead suggestions, filters, and quick “contact support” shortcut.
            </p>
          </div>
          <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Most important module</Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as SupportEntryType | "all")}
          defaultValue="all"
        >
          <div className="mt-6 space-y-3">
            <Command className="overflow-hidden">
              <CommandInput
                value={query}
                onChange={updateQuery}
                placeholder="Search knowledge base, guides, troubleshooting"
              />
              <CommandList>
                <CommandEmpty>No suggestions yet.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      onSelect={() => {
                        if (suggestion.id === "contact") {
                          document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
                        } else {
                          updateQuery(suggestion.label);
                        }
                        searchInputRef.current?.focus();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {suggestion.id === "contact" ? (
                          <ShieldQuestion className="h-4 w-4 text-teal-600" />
                        ) : (
                          <FileSearch2 className="h-4 w-4 text-slate-500" />
                        )}
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{suggestion.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{suggestion.hint}</div>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            <div className="flex flex-wrap items-center gap-3">
              <TabsList>
                {tabOrder.map((tab) => (
                  <TabsTrigger key={tab.type} value={tab.type}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex flex-wrap gap-2">
                {supportFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      activeFilters.includes(filter)
                        ? "border-teal-500/50 bg-teal-50 text-teal-900 dark:border-teal-500/50 dark:bg-teal-950 dark:text-teal-100"
                        : "border-black/10 bg-white text-slate-700 hover:border-teal-500/40 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <Badge className="bg-white text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                Sort: Most helpful (placeholder)
              </Badge>
            </div>
          </div>

          {tabOrder.map((tab) => (
            <TabsContent key={tab.type} value={tab.type}>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {loading
                  ? Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-32 animate-pulse rounded-2xl border border-black/10 bg-slate-100 dark:border-white/10 dark:bg-slate-900"
                      />
                    ))
                  : null}
                {!loading && results.length === 0 ? (
                  <Card className="border-dashed border-black/10 bg-white dark:border-white/10 dark:bg-slate-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-teal-600" /> No results yet
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Try a broader term or start with a popular topic.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {popularTopics.map((topic) => (
                          <Button key={topic} variant="secondary" size="sm" onClick={() => updateQuery(topic)}>
                            {topic}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {!loading && results.map((entry) => (
                  <ResultCard key={entry.id} entry={entry} query={query} onCopy={() => handleCopy(entry)} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-8 grid gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Wand2 className="h-4 w-4 text-teal-600" /> Popular troubleshooting flows (placeholder)
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {popularAccordions.map((item) => (
              <div key={item.id} className="rounded-xl border border-black/10 bg-slate-50 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                  {item.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
