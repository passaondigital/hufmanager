import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";
import { DemoBadge } from "./DemoBadge";

/**
 * Zeigt "Demo-Modus" Label in der Topbar – nur für Demo-Accounts.
 */
export function DemoModeIndicator() {
  const { user } = useAuth();

  if (!isDemoEmail(user?.email)) return null;

  return <DemoBadge size="md" className="hidden sm:inline-flex" />;
}
