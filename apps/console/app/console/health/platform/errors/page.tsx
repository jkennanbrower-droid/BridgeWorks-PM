import { ErrorsPageClient } from "./ErrorsPageClient";

export default function ErrorsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const service =
    typeof searchParams?.service === "string" ? searchParams.service : "API";
  return <ErrorsPageClient initialService={service} />;
}
