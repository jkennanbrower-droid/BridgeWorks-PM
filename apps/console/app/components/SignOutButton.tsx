"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutButton({
  redirectUrl = "/sign-in/console",
}: {
  redirectUrl?: string;
}) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl })}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition hover:border-slate-300"
    >
      Sign Out
    </button>
  );
}

