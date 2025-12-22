import { LogsPageClient } from "./LogsPageClient";

export default function LogsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const service =
    typeof searchParams?.service === "string" ? searchParams.service : "API";
  return <LogsPageClient initialService={service} />;
}
