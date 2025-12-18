import { useCallback, useMemo, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, { ttlMs = 4500 } = {}) => {
      const id = randomId();
      setToasts((t) => [...t, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), ttlMs);
    },
    [dismiss]
  );

  return useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
}

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 50
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            minWidth: 320,
            maxWidth: 520,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background:
              t.kind === "success"
                ? "rgba(22, 163, 74, 0.10)"
                : t.kind === "error"
                  ? "rgba(220, 38, 38, 0.10)"
                  : "rgba(37, 99, 235, 0.10)",
            color: "var(--text)",
            boxShadow: "var(--shadow)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: 13 }}>{t.message}</div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted2)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: "16px",
                padding: 2
              }}
              aria-label="Dismiss toast"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

