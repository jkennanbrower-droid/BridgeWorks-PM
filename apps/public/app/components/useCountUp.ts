"use client";

import { useEffect, useMemo, useState } from "react";

type CountUpOptions = {
  durationMs?: number;
  decimals?: number;
  animateKey?: string | number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? true;
}

export function useCountUp(
  target: number,
  { durationMs = 900, decimals = 0, animateKey }: CountUpOptions = {}
) {
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const [value, setValue] = useState(() => (reduceMotion ? target : 0));

  useEffect(() => {
    if (reduceMotion) return;

    let raf = 0;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, target, durationMs, animateKey]);

  return useMemo(() => {
    const pow = Math.pow(10, decimals);
    const resolved = reduceMotion ? target : value;
    return Math.round(resolved * pow) / pow;
  }, [value, decimals, reduceMotion, target]);
}
