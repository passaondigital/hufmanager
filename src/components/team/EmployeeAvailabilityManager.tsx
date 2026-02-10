import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Loader2, Trash2, Palmtree, Stethoscope, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface EmployeeAvailabilityManagerProps {
  employeeId: string;
  providerId: string;
  isEmployeeView?: boolean;
}

const typeConfig: Record<string, { label: string; icon: typeof Palmtree; color: string }> = {
  vacation: { label: "Urlaub", icon: Palmtree, color: "text-blue-500" },
  sick: { label: "Krankmeldung", icon: Stethoscope, color: "text-orange-500" },
  shift: { label: "Arbeitszeitfenster", icon: Clock, color: "text-green-500" },
};

export function EmployeeAvailabilityManager({
  employeeId,
  providerId,
  isEmployeeView = false,
}: EmployeeAvailabilityManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: "vacation",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["employee-availability", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_availability")
        .select("*")
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employee_availability").insert({
        employee_id: employeeId,
        provider_id: providerId,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.type === "shift" ? formData.start_time || null : null,
        end_time: formData.type === "shift" ? formData.end_time || null : null,
        notes: formData.notes || null,
        status: isEmployeeView ? "pending" : "approved",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-availability"] });
      toast({
        title: isEmployeeView ? "Antrag eingereicht" : "Eintrag erstellt",
        description: isEmployeeView
          ? "Dein Antrag wird geprüft."
          : "Verfügbarkeit wurde eingetragen.",
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-availability"] });
      toast({ title: "Gelöscht" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("employee_availability")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-availability"] });
      toast({ title: "Aktualisiert" });
    },
  });

  const resetForm = () =>
    setFormData({ type: "vacation", start_date: "", end_date: "", start_time: "", end_time: "", notes: "" });

  const upcoming = entries?.filter((e) => new Date(e.end_date) >= new Date()) || [];
  const past = entries?.filter((e) => new Date(e.end_date) < new Date()) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Verfügbarkeit</h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {isEmployeeView ? "Antrag stellen" : "Eintragen"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : upcoming.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Einträge</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {upcoming.map((entry) => {
            const config = typeConfig[entry.type] || typeConfig.vacation;
            const Icon = config.icon;
            return (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.label}</span>
                    <Badge
                      variant={
                        entry.status === "approved" ? "default" : entry.status === "rejected" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {entry.status === "approved" ? "Genehmigt" : entry.status === "rejected" ? "Abgelehnt" : "Ausstehend"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.start_date), "dd.MM.yyyy", { locale: de })} –{" "}
                    {format(new Date(entry.end_date), "dd.MM.yyyy", { locale: de })}
                    {entry.start_time && ` • ${entry.start_time}–${entry.end_time}`}
                  </p>
                  {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                </div>
                <div className="flex gap-1">
                  {!isEmployeeView && entry.status === "pending" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: entry.id, status: "approved" })}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: entry.id, status: "rejected" })}
                      >
                        ✕
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEmployeeView ? "Abwesenheit beantragen" : "Verfügbarkeit eintragen"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Typ</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Urlaub</SelectItem>
                  <SelectItem value="sick">Krankmeldung</SelectItem>
                  <SelectItem value="shift">Arbeitszeitfenster</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Von</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Bis</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {formData.type === "shift" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Uhrzeit von</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Uhrzeit bis</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Anmerkung</Label>
              <Textarea
                placeholder="Optional..."
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formData.start_date || !formData.end_date || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEmployeeView ? "Beantragen" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
