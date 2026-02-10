import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle, Wrench, Crown, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface AssignEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentInfo?: {
    horseName?: string;
    clientName?: string;
    date?: string;
    time?: string;
  };
}

export function AssignEmployeeModal({
  open,
  onOpenChange,
  appointmentId,
  appointmentInfo,
}: AssignEmployeeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employees, isLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");

  // Fetch active absences to filter unavailable employees
  const { data: absences } = useQuery({
    queryKey: ["employee-absences-active", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("employee_availability")
        .select("employee_id, type")
        .eq("provider_id", user.id)
        .eq("status", "approved")
        .in("type", ["vacation", "sick"])
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const absentEmployeeIds = new Set(absences?.map((a) => a.employee_id) || []);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId || !user?.id) throw new Error("Mitarbeiter auswählen");

      const { error } = await supabase.from("employee_assignments").insert({
        employee_id: selectedEmployeeId,
        appointment_id: appointmentId,
        provider_id: user.id,
        assigned_by: user.id,
        instructions: instructions || null,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["today-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: "Zugewiesen", description: "Termin wurde dem Mitarbeiter zugewiesen." });
      onOpenChange(false);
      setSelectedEmployeeId(null);
      setInstructions("");
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleIcons = { view: Eye, employee: Wrench, team_lead: Crown };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter zuweisen</DialogTitle>
          <DialogDescription>
            {appointmentInfo?.horseName && (
              <span>
                {appointmentInfo.horseName} • {appointmentInfo.clientName}
                {appointmentInfo.date && ` • ${appointmentInfo.date}`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Mitarbeiter auswählen</Label>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : activeEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Keine aktiven Mitarbeiter verfügbar
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeEmployees.map((emp) => {
                  const RoleIcon = roleIcons[emp.role] || Wrench;
                  const isSelected = selectedEmployeeId === emp.id;
                  const isAbsent = absentEmployeeIds.has(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => !isAbsent && setSelectedEmployeeId(emp.id)}
                      disabled={isAbsent}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isAbsent
                          ? "border-border opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={emp.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(emp.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RoleIcon className="h-3 w-3" />
                          <span>{emp.role === "employee" ? "Mitarbeiter" : emp.role === "team_lead" ? "Teamleiter" : "Ansicht"}</span>
                        </div>
                      </div>
                      {isAbsent && (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Abwesend
                        </Badge>
                      )}
                      {!isAbsent && isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                      {emp.can_work_alone && !isAbsent && (
                        <Badge variant="secondary" className="text-xs">Allein</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="instructions">Anweisungen (optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Besondere Hinweise für den Mitarbeiter..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedEmployeeId || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Zuweisen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
