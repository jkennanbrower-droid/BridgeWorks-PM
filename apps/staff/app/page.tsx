import { AuthBootstrapGate } from "./components/AuthBootstrapGate";
import { StaffDashboardClient } from "./dashboard/StaffDashboardClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AuthBootstrapGate required="staff">
      <StaffDashboardClient />
    </AuthBootstrapGate>
  );
}
