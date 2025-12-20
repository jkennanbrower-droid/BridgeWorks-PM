"use client";

import { SignIn } from "@clerk/nextjs";

export default function ConsoleSignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
      <SignIn routing="path" path="/sign-in/console" />
    </main>
  );
}