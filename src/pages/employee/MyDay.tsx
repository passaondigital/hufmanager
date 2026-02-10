import { useState } from "react";
import { Loader2, MapPin, LogOut, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateWorkEvent, useCreateDocumentationItem } from "@/hooks/useDocumentation";
import type { Assignment, AssignmentStatus } from "@/types/team";
import { ASSIGNMENT_STATUS_LABELS } from "@/types/team";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  en_route: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  checked_in: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  checked_out: "bg-muted text-foreground",
  completed: "bg-muted text-foreground",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

function useMyAssignments() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["my-assignments", user?.id, today],
    queryFn: async (): Promise<Assignment[]> => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          appointment:appointments(id, date, time, status, notes)
        `)
        .eq("employee_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Assignment[];
    },
    enabled: !!user,
  });
}

const MyDay = () => {
  const { user } = useAuth();
  const { data: assignments = [], isLoading } = useMyAssignments();
  const createWorkEvent = useCreateWorkEvent();
  const createDoc = useCreateDocumentationItem();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [noteText, setNoteText] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAssignments = assignments.filter(
    (a) => a.appointment?.date === todayStr
  );

  const getLocation = async (): Promise<{ lat: number; lng: number } | undefined> => {
    if (!navigator.geolocation) return undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        });
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return undefined;
    }
  };

  const handleCheckIn = async (assignment: Assignment) => {
    const location = await getLocation();
    createWorkEvent.mutate({
      assignmentId: assignment.id,
      employeeId: user!.id,
      providerId: assignment.provider_id,
      eventType: "check_in",
      location,
    });
  };

  const handleCheckOut = async (assignment: Assignment) => {
    const location = await getLocation();
    createWorkEvent.mutate({
      assignmentId: assignment.id,
      employeeId: user!.id,
      providerId: assignment.provider_id,
      eventType: "check_out",
      location,
    });
  };

  const handleAddNote = (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setNoteText("");
    setNoteDialogOpen(true);
  };

  const submitNote = () => {
    if (!activeAssignment || !noteText.trim()) return;
    createDoc.mutate(
      {
        assignmentId: activeAssignment.id,
        employeeId: user!.id,
        providerId: activeAssignment.provider_id,
        appointmentId: activeAssignment.appointment_id,
        itemType: "note",
        content: noteText.trim(),
      },
      {
        onSuccess: () => {
          setNoteDialogOpen(false);
          setNoteText("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meine Termine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : todayAssignments.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
          Keine Termine f\u00fcr heute.
        </div>
      ) : (
        <div className="space-y-4">
          {todayAssignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {assignment.appointment?.time && (
                        <span className="text-sm font-semibold text-foreground">
                          {assignment.appointment.time}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[assignment.status] ?? ""}
                      >
                        {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                      </Badge>
                    </div>
                    {assignment.appointment?.notes && (
                      <p className="text-sm text-muted-foreground">
                        {assignment.appointment.notes}
                      </p>
                    )}
                    {assignment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Hinweis: {assignment.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions based on status */}
                <div className="flex flex-wrap gap-2">
                  {(assignment.status === "pending" ||
                    assignment.status === "accepted" ||
                    assignment.status === "en_route") && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(assignment)}
                      disabled={createWorkEvent.isPending}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Check-in
                    </Button>
                  )}

                  {assignment.status === "checked_in" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleCheckOut(assignment)}
                        disabled={createWorkEvent.isPending}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Check-out
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddNote(assignment)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Notiz
                      </Button>
                    </>
                  )}

                  {assignment.status === "checked_out" && (
                    <span className="text-sm text-muted-foreground">
                      Abgeschlossen
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notiz hinzuf\u00fcgen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Arbeitsnotiz eingeben..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setNoteDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={submitNote}
                disabled={!noteText.trim() || createDoc.isPending}
              >
                {createDoc.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyDay;
