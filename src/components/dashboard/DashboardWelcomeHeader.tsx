import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";

interface DashboardWelcomeHeaderProps {
  fullName?: string | null;
  readableId?: string | null;
  subtitle?: string;
}

/**
 * Einheitlicher Willkommens-Header für alle drei Dashboards.
 * Zeigt "Willkommen, [Vorname]" + #ID Badge darunter.
 */
export function DashboardWelcomeHeader({ fullName, readableId, subtitle }: DashboardWelcomeHeaderProps) {
  const { user } = useAuth();
  const firstName = fullName?.split(" ")[0];
  const isDemo = isDemoEmail(user?.email);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        Willkommen{firstName ? `, ${firstName}` : ""}
      </h1>
      <div className="flex items-center gap-2 mt-1">
        {readableId && (
          <Badge variant="outline" className="font-mono text-xs">
            {readableId}
          </Badge>
        )}
        {isDemo && <DemoBadge />}
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
