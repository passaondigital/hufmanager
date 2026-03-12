import { useNavigate } from "react-router-dom";
import { Zap, UserPlus, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsPanelProps {
  variant?: "provider" | "partner" | "employee";
}

export function QuickActionsPanel({ variant = "provider" }: QuickActionsPanelProps) {
  const navigate = useNavigate();

  const providerActions = [
    { label: "Kunde", icon: UserPlus, path: "/kunden?new=true" },
    { label: "Pferd", icon: UserPlus, path: "/pferde?new=true" },
    { label: "Termin", icon: Calendar, path: "/calendar" },
    { label: "Rechnung", icon: FileText, path: "/rechnungen" },
  ];

  const partnerActions = [
    { label: "Termin", icon: Calendar, path: "/partner-calendar" },
    { label: "Pferd", icon: UserPlus, path: "/partner-horses" },
  ];

  const employeeActions = [
    { label: "Tour", icon: Calendar, path: "/employee/tour" },
    { label: "HufCam", icon: Calendar, path: "/employee/hufcam" },
  ];

  const actions = variant === "partner" ? partnerActions
    : variant === "employee" ? employeeActions
    : providerActions;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        Schnellaktionen
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 justify-start"
            onClick={() => navigate(a.path)}
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
