"use client";

// Public-facing Support page; placeholder content must be replaced before launch.
import { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "./ui/primitives";

export function TicketStatusChecker() {
  const [ticketId, setTicketId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "found" | "not-found">("idle");

  const handleCheck = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(ticketId && email ? "found" : "not-found");
  };

  return (
    <Card className="border-dashed border-teal-500/30 bg-white/90 shadow-sm dark:border-teal-500/30 dark:bg-slate-950/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Check ticket status</CardTitle>
          <Badge className="bg-teal-50 text-teal-900 dark:bg-teal-900 dark:text-teal-100">Placeholder</Badge>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Track a request with your ticket ID and email.</p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-3 sm:items-end" onSubmit={handleCheck}>
          <label className="sm:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ticket ID</span>
            <Input
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
              placeholder="e.g., TCK-1234 (placeholder)"
            />
          </label>
          <label className="sm:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <Button type="submit" className="sm:col-span-1">Check status</Button>
        </form>

        {status === "found" ? (
          <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-500/30 dark:bg-teal-950 dark:text-teal-100">
            Placeholder: Ticket found. Expect follow-up shortly.
          </div>
        ) : null}
        {status === "not-found" ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-100">
            Placeholder: We could not find that ID. Double-check spelling or open a new request.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
