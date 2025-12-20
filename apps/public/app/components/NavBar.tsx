"use client";

import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";

import { layout } from "./ui/layoutTokens";

export function NavBar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  return (
    <header className="border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/70">
      <div className={layout.container}>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-lg text-sm font-semibold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-white dark:focus-visible:ring-offset-black"
            aria-label="BridgeWorks PM Home"
          >
            BridgeWorks PM
          </Link>

          {isLoaded && isSignedIn ? (
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: "/" })}
              className={`${layout.buttonBase} ${layout.buttonSecondary}`}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className={`${layout.buttonBase} ${layout.buttonSecondary}`}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
