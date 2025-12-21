import { AuthBootstrapGate } from "./components/AuthBootstrapGate";

export default function Page() {
  return (
    <AuthBootstrapGate required="tenant">
      <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">User Portal</h1>
          <p className="text-sm text-slate-500">Auth is currently disabled.</p>
        </div>
      </main>
    </AuthBootstrapGate>
  );
}
