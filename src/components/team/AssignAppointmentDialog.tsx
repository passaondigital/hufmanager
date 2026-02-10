import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCreateAssignment, useUnassignedAppointments } from "@/hooks/useAssignments";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface AssignAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignAppointmentDialog({
  open,
  onOpenChange,
}: AssignAppointmentDialogProps) {
  const [appointmentId, setAppointmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: appointments = [], isLoading: loadingAppointments } =
    useUnassignedAppointments();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const createAssignment = useCreateAssignment();

  const activeEmployees = employees.filter((e) => e.status === "active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId || !employeeId) return;

    createAssignment.mutate(
      {
        appointment_id: appointmentId,
        employee_id: employeeId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAppointmentId("");
          setEmployeeId("");
          setNotes("");
          onOpenChange(false);
        },
      }
    );
  };

  const isLoading = loadingAppointments || loadingEmployees;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Termin zuweisen</DialogTitle>
          <DialogDescription>
            W\u00e4hle einen offenen Termin und einen Mitarbeiter.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Termin</Label>
              <Select value={appointmentId} onValueChange={setAppointmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Termin w\u00e4hlen" />
                </SelectTrigger>
                <SelectContent>
                  {appointments.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Keine offenen Termine
                    </SelectItem>
                  ) : (
                    appointments.map((apt: any) => (
                      <SelectItem key={apt.id} value={apt.id}>
                        {format(new Date(apt.date), "dd.MM.yyyy", {
                          locale: de,
                        })}
                        {apt.time ? ` ${apt.time}` : ""}
                        {apt.notes ? ` \u2013 ${apt.notes.slice(0, 30)}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter w\u00e4hlen" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Keine aktiven Mitarbeiter
                    </SelectItem>
                  ) : (
                    activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Werkzeug mitnehmen"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={
                  !appointmentId || !employeeId || createAssignment.isPending
                }
              >
                {createAssignment.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Zuweisen
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
