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

  const push = useCallback((kind: ToastKind, message: string, { ttlMs = 5000 } = {}) => {
    const id = randomId();
    setToasts((t) => [...t, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), ttlMs);
  }, [dismiss]);

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
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            background:
              t.kind === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : t.kind === "error"
                  ? "rgba(239, 68, 68, 0.12)"
                  : "rgba(59, 130, 246, 0.12)",
            color: "rgba(255,255,255,0.92)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: 13 }}>{t.message}</div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: "16px"
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

