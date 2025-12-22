type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function HealthLoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-36 animate-pulse rounded-full bg-slate-200" />
          <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="mt-6 h-4 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-20 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function HealthErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-rose-800">
            Telemetry unavailable
          </p>
          <p className="mt-1 text-sm text-rose-700">{message}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
