import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useCancelAssignment } from "@/hooks/useAssignments";
import type { Assignment } from "@/types/team";
import { ASSIGNMENT_STATUS_LABELS } from "@/types/team";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  en_route: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  checked_in: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  checked_out: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  completed: "bg-muted text-foreground",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

interface AssignmentTableProps {
  assignments: Assignment[];
}

export function AssignmentTable({ assignments }: AssignmentTableProps) {
  const cancelAssignment = useCancelAssignment();

  if (assignments.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
        Keine Zuweisungen vorhanden.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Termin
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
              Mitarbeiter
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
              Notizen
            </th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground w-[50px]">
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                {assignment.appointment ? (
                  <div>
                    <span className="font-medium text-foreground">
                      {format(
                        new Date(assignment.appointment.date),
                        "dd.MM.yyyy",
                        { locale: de }
                      )}
                    </span>
                    {assignment.appointment.time && (
                      <span className="text-muted-foreground ml-1">
                        {assignment.appointment.time}
                      </span>
                    )}
                    <span className="block md:hidden text-xs text-muted-foreground mt-0.5">
                      {assignment.employee?.full_name ?? "\u2013"}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">\u2013</span>
                )}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-foreground">
                  {assignment.employee?.full_name ?? "\u2013"}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={STATUS_STYLES[assignment.status] ?? ""}
                >
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                {assignment.notes ?? "\u2013"}
              </td>
              <td className="px-4 py-3 text-right">
                {assignment.status !== "cancelled" &&
                  assignment.status !== "completed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cancelAssignment.mutate(assignment.id)}
                      title="Zuweisung aufheben"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
