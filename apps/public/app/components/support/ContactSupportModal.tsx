"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useMemo, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { personaConfigs, supportFilters } from "../../lib/mockSupportData";
import { cn } from "../ui/cn";
import { layout } from "../ui/layoutTokens";
import {
  Badge,
  Button,
  Dialog,
  Input,
  Select,
  useToast,
} from "./ui/primitives";

export function ContactSupportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { pushToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [severity, setSeverity] = useState("Medium");

  const personaOptions = useMemo(() => personaConfigs.map((p) => p.label), []);

  const toggleArea = (tag: string) => {
    setAreas((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    pushToast({ title: "Ticket created (placeholder)", description: "Routing to the right queue." });
  };

  const resetForm = () => {
    setSubmitted(false);
    setAreas([]);
    setSeverity("Medium");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Open a support ticket">
      {submitted ? (
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
          <div className="rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-3 text-teal-900 dark:border-teal-500/30 dark:bg-teal-950 dark:text-teal-100">
            Ticket created (placeholder). We will email a reference ID.
          </div>
          <div className="rounded-xl border border-black/10 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Check ticket status</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Use the status checker below to view updates. Placeholder only.
            </p>
          </div>
          <Button variant="primary" onClick={resetForm} className="w-full">Close</Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">I am a …</label>
              <Select required defaultValue={personaOptions[0]}>
                {personaOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Issue type</label>
              <Select required defaultValue="Billing">
                {["Billing", "Maintenance", "Access", "Bug", "Feature Request", "Other"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Severity</label>
              <Select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                {["Low", "Medium", "High", "Critical"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Placeholder descriptions only; align with your policy.
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Preferred contact method</label>
              <Select defaultValue="Email">
                {["Email", "Phone", "Chat"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Product area</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportFilters.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleArea(tag)}
                  className={
                    areas.includes(tag)
                      ? "rounded-full border border-teal-500/50 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 dark:border-teal-400/60 dark:bg-teal-950 dark:text-teal-100"
                      : "rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-teal-500/40 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Description</label>
            <textarea
              required
              className={cn(
                "min-h-[120px] w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200",
                layout.focusRing
              )}
              placeholder="Share what happened, recent changes, and expected behavior (placeholder)."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-dashed border-black/15 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments (placeholder)
            </div>
            <Badge className="bg-white text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-200">No upload wired</Badge>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Send className="h-4 w-4" />
              Submit placeholder
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
