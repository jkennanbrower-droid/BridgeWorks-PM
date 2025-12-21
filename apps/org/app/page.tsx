import { AuthBootstrapGate } from "./components/AuthBootstrapGate";
import { OrgDashboardClient } from "./dashboard/OrgDashboardClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthBootstrapGate required="staff">
      <OrgDashboardClient />
    </AuthBootstrapGate>
  );
}
