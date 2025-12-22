import { redirect } from "next/navigation";

export default function HealthIndexPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const viewParam =
    typeof searchParams?.view === "string" ? searchParams.view : "platform";
  redirect(
    viewParam === "customer"
      ? "/console/health/customer"
      : "/console/health/platform",
  );
}
