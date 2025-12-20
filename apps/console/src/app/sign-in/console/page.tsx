"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";

export default function ConsoleSignInPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signInLoaded || !signIn) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: identifier.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
        window.location.href = "/console";
        return;
      }

      setError("Additional verification required. Use the email code sign-in.");
    } catch (err) {
      const details =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors?: { code?: string; message?: string }[] }).errors?.[0]
          : undefined;
      const message = details?.message;
      if (
        details?.code === "session_exists" ||
        message?.includes("Session already exists")
      ) {
        setError("Session exists in another tab. Refresh this page to continue.");
        return;
      }
      setError(message ?? "Unable to sign in. Check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            BridgeWorks
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Sign in to Founder Console
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Founder access only.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isLoaded && isSignedIn ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                You are already signed in.
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/console";
                  }}
                  className="ml-2 font-semibold underline"
                >
                  Continue to console
                </button>
                <button
                  type="button"
                  onClick={() => void signOut({ redirectUrl: "/sign-in/console" })}
                  className="ml-3 font-semibold underline"
                >
                  Sign out
                </button>
                .
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={!signInLoaded || isSubmitting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
