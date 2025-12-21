"use client";

export function SignOutButton() {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className="cursor-not-allowed rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-400 shadow-sm"
    >
      Auth disabled
    </button>
  );
}
