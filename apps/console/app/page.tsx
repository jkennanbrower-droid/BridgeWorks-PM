export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center bg-white text-black dark:bg-black dark:text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          BridgeWorks Internal Console
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          BridgeWorks platform access only.
        </p>
      </div>
    </main>
  );
}
