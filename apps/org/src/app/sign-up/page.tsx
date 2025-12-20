"use client";

import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
      <Suspense fallback={<div />}>
        <SignUp routing="path" path="/sign-up" />
      </Suspense>
    </main>
  );
}
