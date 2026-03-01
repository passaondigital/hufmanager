import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface EmployeeRoleGateProps {
  /** Minimum required roles. If current role is NOT in this list, show restriction message. */
  allowed: ("view" | "employee" | "team_lead")[];
  children: React.ReactNode;
  /** Optional custom message */
  message?: string;
}

export function EmployeeRoleGate({ allowed, children, message }: EmployeeRoleGateProps) {
  const { data: profile } = useEmployeeProfile();
  const role = profile?.role || "view";

  if (!allowed.includes(role as any)) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">
              {message || "Diese Funktion ist für Assistenten nicht verfügbar."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Bitte wende dich an deinen Chef.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
