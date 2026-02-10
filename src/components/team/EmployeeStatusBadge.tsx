import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmployeeStatus } from "@/types/team";
import { EMPLOYEE_STATUS_LABELS } from "@/types/team";

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  sick: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  vacation: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  suspended: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
  className?: string;
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {EMPLOYEE_STATUS_LABELS[status]}
    </Badge>
  );
}
