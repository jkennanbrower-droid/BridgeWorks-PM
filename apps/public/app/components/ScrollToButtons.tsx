"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "./ui/cn";
import { layout } from "./ui/layoutTokens";

type Props = {
  className?: string;
  showAfterPx?: number;
};

export function ScrollToButtons({ className, showAfterPx = 240 }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY || 0;
      const doc = document.documentElement;
      const max = Math.max(0, (doc?.scrollHeight ?? 0) - window.innerHeight);
      setScrollY(y);
      setMaxScrollY(max);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const show = scrollY > showAfterPx;
  const isNearTop = scrollY <= 4;
  const isNearBottom = maxScrollY > 0 ? scrollY >= maxScrollY - 4 : true;

  const baseButton = useMemo(
    () =>
      cn(
        layout.buttonBase,
        layout.buttonSecondary,
        "h-11 w-11 rounded-full px-0",
        "shadow-sm"
      ),
    []
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const doc = document.documentElement;
    const max = Math.max(0, (doc?.scrollHeight ?? 0) - window.innerHeight);
    window.scrollTo({ top: max, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2",
        className
      )}
      aria-label="Scroll controls"
    >
      <button
        type="button"
        className={cn(baseButton, "pointer-events-auto")}
        onClick={scrollToTop}
        disabled={isNearTop}
        aria-disabled={isNearTop}
        aria-label="Scroll to top"
        title="Top"
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(baseButton, "pointer-events-auto")}
        onClick={scrollToBottom}
        disabled={isNearBottom}
        aria-disabled={isNearBottom}
        aria-label="Scroll to bottom"
        title="Bottom"
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
