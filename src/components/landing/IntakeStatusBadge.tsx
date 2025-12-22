import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

type IntakeStatus = 'open' | 'waitlist' | 'closed';

interface IntakeStatusBadgeProps {
  status: IntakeStatus;
  className?: string;
}

const statusConfig: Record<IntakeStatus, { label: string; icon: React.ComponentType<any>; className: string }> = {
  open: {
    label: "Neukunden willkommen",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
  },
  waitlist: {
    label: "Warteliste",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20"
  },
  closed: {
    label: "Keine Neukunden",
    icon: XCircle,
    className: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
  }
};

export const IntakeStatusBadge = ({ status, className = "" }: IntakeStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`gap-1.5 px-3 py-1.5 text-sm font-medium ${config.className} ${className}`}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
};
