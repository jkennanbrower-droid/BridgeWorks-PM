"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

type BootstrapResponse = {
  ok: boolean;
  user: { id: string; email: string };
  access: { isStaff: boolean; isTenant: boolean };
};

type AuthBootstrapGateProps = {
  children: React.ReactNode;
  required: "staff" | "tenant";
};

type GateState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "blocked"; message: string }
  | { status: "ready"; data: BootstrapResponse };

export function AuthBootstrapGate({ children, required }: AuthBootstrapGateProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const hasRun = useRef(false);
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBase) {
        setState({ status: "error", message: "Missing NEXT_PUBLIC_API_BASE_URL." });
        return;
      }

      const token = await getToken();
      if (!token) {
        setState({ status: "error", message: "Missing session token." });
        return;
      }

      try {
        const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/auth/bootstrap`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setState({ status: "error", message: "Bootstrap request failed." });
          return;
        }

        const data = (await res.json()) as BootstrapResponse;
        if (!data?.ok) {
          setState({ status: "error", message: "Bootstrap response invalid." });
          return;
        }

        const allowed = required === "staff" ? data.access?.isStaff : data.access?.isTenant;
        if (!allowed) {
          setState({
            status: "blocked",
            message:
              required === "staff"
                ? "Not authorized for staff portal."
                : "No tenancy yet.",
          });
          return;
        }

        setState({ status: "ready", data });
      } catch (e) {
        setState({ status: "error", message: "Bootstrap request failed." });
      }
    };

    void run();
  }, [getToken, isLoaded, isSignedIn, required]);

  if (!isLoaded || state.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Authenticating
          </p>
          <p className="mt-3 text-lg font-semibold">Loading...</p>
        </div>
      </main>
    );
  }

  if (state.status === "error" || state.status === "blocked") {
    const loginBase = process.env.NEXT_PUBLIC_PUBLIC_APP_URL?.replace(/\/+$/, "");
    const loginUrl = loginBase ? `${loginBase}/login` : "http://localhost:3100/login";

    return (
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">
            {state.status === "blocked" ? "Access denied" : "Unable to sign in"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{state.message}</p>
          <Link
            href={loginUrl}
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-black"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}