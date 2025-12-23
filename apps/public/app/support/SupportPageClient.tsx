"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useRef, useState } from "react";
import { ScrollToButtons } from "../components/ScrollToButtons";
import { HelpSearch } from "../components/support/HelpSearch";
import { QuickActions } from "../components/support/QuickActions";
import { SupportHero } from "../components/support/SupportHero";
import { SupportRouter } from "../components/support/SupportRouter";
import { SupportTabs } from "../components/support/SupportTabs";
import { ToastProvider } from "../components/support/ui/primitives";

export function SupportPageClient() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFilters, setSearchFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("self");

  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToContact = () => {
    setActiveTab("contact");
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased dark:bg-black dark:text-white">
      <ToastProvider>
        <ScrollToButtons />
        <SupportHero onSearchFocus={focusSearch} onContactScroll={scrollToContact} />
        <HelpSearch
          searchInputRef={searchRef}
          presetFilters={searchFilters}
          presetQuery={searchQuery}
          onFiltersChange={setSearchFilters}
          onQueryChange={setSearchQuery}
        />
        <QuickActions
          onSelect={(filters) => {
            if (filters?.length) {
              setSearchFilters(filters);
              setSearchQuery(filters[0]);
            }
            focusSearch();
            setActiveTab("self");
          }}
        />
        <SupportRouter onContactClick={scrollToContact} />
        <SupportTabs controlledTab={activeTab} onTabChange={setActiveTab} />
      </ToastProvider>
    </main>
  );
}
