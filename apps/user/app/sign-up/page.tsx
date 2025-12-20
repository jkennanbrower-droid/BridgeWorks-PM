"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
      <SignUp routing="path" path="/sign-up" />
    </main>
  );
}