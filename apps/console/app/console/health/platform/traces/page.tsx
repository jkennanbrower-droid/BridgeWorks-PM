import { TracesPageClient } from "./TracesPageClient";

export default function TracesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const service =
    typeof searchParams?.service === "string" ? searchParams.service : "API";
  return <TracesPageClient initialService={service} />;
}
