import { redirect } from "next/navigation";
import { ensureConsolePerson } from "./_server/people";
import { logAudit } from "./_server/audit";
import { hasPlatformAccess } from "./_server/rbac";
import { ConsoleShell } from "./_components/ConsoleShell";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const person = await ensureConsolePerson();

  if (!person) {
    redirect("/sign-in/console");
  }

  if (!hasPlatformAccess(person)) {
    try {
      await logAudit({
        actorPersonId: person.id,
        action: "console_access_denied",
        targetType: "person",
        targetId: person.id,
        payload: {
          email: person.email,
          platformRole: person.platformRole ?? null,
        },
      });
    } catch {
      // Access denial should not block the response.
    }

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-900">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-sm text-slate-600">
            Your account is not authorized for the Founder Console.
          </p>
          <a
            href="/sign-in/console"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <ConsoleShell person={person}>
      {children}
    </ConsoleShell>
  );
}
