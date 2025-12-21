import { AuthBootstrapGate } from "./components/AuthBootstrapGate";
import { UserDashboardClient } from "./dashboard/UserDashboardClient";

export default function Page() {
  return (
    <AuthBootstrapGate required="tenant">
      <UserDashboardClient />
    </AuthBootstrapGate>
  );
}
