import { useCallback, useEffect, useRef, useState } from "react";

type PollingOptions<T> = {
  enabled?: boolean;
  refreshMs?: number;
  onSuccess?: (value: T) => void;
};

export function usePolling<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: PollingOptions<T> = {},
) {
  const { enabled = true, refreshMs = 0, onSuccess } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (!enabled) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const response = await fetcher(controller.signal);
        setData(response);
        setLastUpdated(new Date());
        onSuccess?.(response);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [enabled, fetcher, onSuccess],
  );

  useEffect(() => {
    void load(false);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (enabled && refreshMs > 0) {
      timerRef.current = setInterval(() => {
        void load(true);
      }, refreshMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, load, refreshMs]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    lastUpdated,
    refresh: useCallback(() => load(false), [load]),
  };
}
