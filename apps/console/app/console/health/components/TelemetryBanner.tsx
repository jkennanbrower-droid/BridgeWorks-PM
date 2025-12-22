type TelemetryBannerProps = {
  message: string;
  requestUrl: string;
  onRetry: () => void;
};

export function TelemetryBanner({
  message,
  requestUrl,
  onRetry,
}: TelemetryBannerProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-rose-800">
            Telemetry unavailable
          </p>
          <p className="mt-1 text-sm text-rose-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300"
        >
          Retry
        </button>
      </div>
      <details className="mt-3 text-xs text-rose-700">
        <summary className="cursor-pointer text-xs font-semibold text-rose-700">
          Diagnostic details
        </summary>
        <div className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-mono text-[11px] text-rose-700">
          {requestUrl}
        </div>
      </details>
    </div>
  );
}
