"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            BridgeWorks
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Sign in to User Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your workspace with your account.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignIn.Root path="/sign-in">
            <Clerk.GlobalError className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" />
            <SignIn.Step name="start" className="space-y-4">
              <Clerk.Field name="identifier" className="grid gap-2">
                <Clerk.Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </Clerk.Label>
                <Clerk.Input className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <Clerk.FieldError className="text-xs text-rose-600" />
              </Clerk.Field>
              <Clerk.Field name="password" className="grid gap-2">
                <Clerk.Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </Clerk.Label>
                <Clerk.Input
                  type="password"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <Clerk.FieldError className="text-xs text-rose-600" />
              </Clerk.Field>
              <SignIn.Action
                submit
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-500"
              >
                <Clerk.Loading>
                  {(isLoading) => (isLoading ? "Signing in..." : "Sign in")}
                </Clerk.Loading>
              </SignIn.Action>
            </SignIn.Step>
            <SignIn.Step name="verifications" className="space-y-4">
              <SignIn.Strategy name="email_code">
                <p className="text-sm text-slate-600">
                  Enter the code sent to <SignIn.SafeIdentifier />.
                </p>
                <Clerk.Field name="code" className="grid gap-2">
                  <Clerk.Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Verification code
                  </Clerk.Label>
                  <Clerk.Input className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <Clerk.FieldError className="text-xs text-rose-600" />
                </Clerk.Field>
                <SignIn.Action
                  submit
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  <Clerk.Loading>
                    {(isLoading) => (isLoading ? "Verifying..." : "Verify")}
                  </Clerk.Loading>
                </SignIn.Action>
              </SignIn.Strategy>
              <SignIn.Strategy name="password">
                <Clerk.Field name="password" className="grid gap-2">
                  <Clerk.Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </Clerk.Label>
                  <Clerk.Input
                    type="password"
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <Clerk.FieldError className="text-xs text-rose-600" />
                </Clerk.Field>
                <SignIn.Action
                  submit
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-500"
                >
                  <Clerk.Loading>
                    {(isLoading) => (isLoading ? "Signing in..." : "Continue")}
                  </Clerk.Loading>
                </SignIn.Action>
              </SignIn.Strategy>
            </SignIn.Step>
          </SignIn.Root>
        </div>
      </div>
    </main>
  );
}
