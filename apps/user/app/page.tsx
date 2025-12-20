import { UserButton } from "@clerk/nextjs";

import { AuthBootstrapGate } from "./components/AuthBootstrapGate";

export default function Page() {
  return (
    <AuthBootstrapGate required="tenant">
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <UserButton />
          <h1 className="text-4xl font-semibold tracking-tight">User Portal</h1>
        </div>
      </main>
    </AuthBootstrapGate>
  );
}
