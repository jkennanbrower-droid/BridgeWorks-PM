"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../ui/cn";
import { layout } from "../../ui/layoutTokens";

type Variant = "primary" | "secondary" | "ghost" | "soft";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

const buttonVariants: Record<Variant, string> = {
  primary: layout.buttonPrimary,
  secondary: layout.buttonSecondary,
  ghost: layout.buttonGhost,
  soft: "bg-teal-50 text-teal-900 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-100 dark:hover:bg-teal-900",
};

const buttonSizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(layout.buttonBase, buttonVariants[variant], buttonSizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(layout.inputBase, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200",
        layout.focusRing,
        props.className
      )}
    />
  );
}

// Card
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function CardTitle({ className, children }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-slate-900 dark:text-white", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-600 dark:text-slate-300", className)}>{children}</p>;
}

export function CardContent({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

// Tabs
const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleSet = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue: handleSet }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-${value}`}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-semibold transition",
        isActive
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
        className,
        layout.focusRing
      )}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  return (
    <div id={`tab-${value}`} role="tabpanel" hidden={ctx.value !== value} className="mt-6">
      {ctx.value === value ? children : null}
    </div>
  );
}

// Accordion
const AccordionContext = createContext<{
  open: string[];
  toggle: (id: string) => void;
} | null>(null);

export function Accordion({
  type = "multiple",
  defaultValue = [],
  className,
  children,
}: {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  className?: string;
  children: ReactNode;
}) {
  const initial = useMemo(() => {
    if (type === "single") {
      return typeof defaultValue === "string" ? [defaultValue] : [];
    }
    return Array.isArray(defaultValue) ? defaultValue : [];
  }, [defaultValue, type]);
  const [open, setOpen] = useState<string[]>(initial);

  const toggle = (id: string) => {
    setOpen((prev) => {
      if (type === "single") {
        return prev.includes(id) ? [] : [id];
      }
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  return (
    <AccordionContext.Provider value={{ open, toggle }}>
      <div className={cn("divide-y divide-black/5 dark:divide-white/10", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children }: { value: string; children: ReactNode }) {
  return <div data-value={value}>{children}</div>;
}

export function AccordionTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(AccordionContext);
  if (!ctx) return null;
  const isOpen = ctx.open.includes(value);
  const buttonId = `${value}-trigger`;
  const panelId = `${value}-panel`;
  return (
    <button
      id={buttonId}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className={cn(
        "flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white",
        layout.focusRing
      )}
      onClick={() => ctx.toggle(value)}
    >
      {children}
      <span className="text-xs text-teal-700 dark:text-teal-300">{isOpen ? "Hide" : "Show"}</span>
    </button>
  );
}

export function AccordionContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(AccordionContext);
  if (!ctx) return null;
  const isOpen = ctx.open.includes(value);
  const panelId = `${value}-panel`;
  return (
    <div id={panelId} role="region" hidden={!isOpen} className="pb-4 text-sm text-slate-600 dark:text-slate-300">
      {isOpen ? children : null}
    </div>
  );
}

// Dialog & Sheet
function useDisableScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  useDisableScroll(open);
  const labelId = useId();
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <h2 id={labelId} className="text-xl font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "rounded-full border border-black/10 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10",
              layout.focusRing
            )}
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  useDisableScroll(open);
  const labelId = useId();
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full max-w-md overflow-y-auto border-l border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={labelId} className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "rounded-full border border-black/10 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10",
                  layout.focusRing
                )}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

// Command
export function Command({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CommandList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-h-72 overflow-auto", className)}>{children}</div>;
}

export function CommandEmpty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{children}</div>;
}

export function CommandGroup({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-black/5 first:border-none dark:border-white/10">
      {heading ? (
        <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {heading}
        </div>
      ) : null}
      <div className="py-1">{children}</div>
    </div>
  );
}

export function CommandItem({
  children,
  onSelect,
  className,
}: {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10",
        className,
        layout.focusRing
      )}
    >
      {children}
    </button>
  );
}

export function CommandInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
      <label className="sr-only" htmlFor={id}>
        Search
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(layout.inputBase, "bg-slate-50 dark:bg-slate-900")}
      />
    </div>
  );
}

// Toasts
export type Toast = { id: number; title: string; description?: string };

const ToastContext = createContext<{
  pushToast: (toast: Omit<Toast, "id">) => void;
}>({ pushToast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (toast: Omit<Toast, "id">) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2600);
  };

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-auto w-80 rounded-xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-900"
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</div>
              {toast.description ? (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{toast.description}</p>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
