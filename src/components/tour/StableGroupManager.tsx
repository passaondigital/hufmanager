import { useState } from "react";
import { Building2, Plus, Users, MapPin, Clock, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  horses: {
    name: string;
    owner: { full_name: string | null } | null;
  } | null;
  stable_group_id: string | null;
}

interface StableGroup {
  id: string;
  title: string;
  stable_name: string | null;
  stable_address: string | null;
  date: string;
  status: string;
  appointments?: Appointment[];
}

interface StableGroupManagerProps {
  selectedDate: Date;
  onGroupCreated?: () => void;
}

export function StableGroupManager({ selectedDate, onGroupCreated }: StableGroupManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);

  const [groupForm, setGroupForm] = useState({
    title: "",
    stableName: "",
    stableAddress: "",
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch existing stable groups for the date
  const { data: stableGroups = [] } = useQuery<StableGroup[]>({
    queryKey: ["stable-groups", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_groups")
        .select("id, title, stable_name, stable_address, date, status")
        .eq("date", dateStr)
        .eq("created_by", user?.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch ungrouped appointments for the date
  const { data: ungroupedAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["ungrouped-appointments", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          stable_group_id,
          horses(name, owner:profiles!horses_owner_id_fkey(full_name))
        `)
        .eq("date", dateStr)
        .eq("provider_id", user?.id)
        .is("stable_group_id", null)
        .order("time");

      if (error) throw error;
      return data as unknown as Appointment[];
    },
    enabled: !!user,
  });

  // Fetch grouped appointments
  const { data: groupedAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["grouped-appointments", dateStr],
    queryFn: async () => {
      const groupIds = stableGroups.map((g) => g.id);
      if (groupIds.length === 0) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          stable_group_id,
          horses(name, owner:profiles!horses_owner_id_fkey(full_name))
        `)
        .in("stable_group_id", groupIds)
        .order("time");

      if (error) throw error;
      return data as unknown as Appointment[];
    },
    enabled: stableGroups.length > 0,
  });

  const handleToggleAppointment = (appointmentId: string) => {
    setSelectedAppointmentIds((prev) =>
      prev.includes(appointmentId)
        ? prev.filter((id) => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !groupForm.title) {
      toast.error("Bitte geben Sie einen Titel an");
      return;
    }

    setIsCreating(true);

    try {
      // Create the stable group
      const { data: newGroup, error: groupError } = await supabase
        .from("appointment_groups")
        .insert({
          title: groupForm.title,
          stable_name: groupForm.stableName || null,
          stable_address: groupForm.stableAddress || null,
          date: dateStr,
          created_by: user.id,
          status: "planned",
        })
        .select("id")
        .single();

      if (groupError) throw groupError;

      // Link selected appointments to the group
      if (selectedAppointmentIds.length > 0) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ stable_group_id: newGroup.id })
          .in("id", selectedAppointmentIds);

        if (updateError) throw updateError;
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["stable-groups"] });
      queryClient.invalidateQueries({ queryKey: ["ungrouped-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["grouped-appointments"] });

      toast.success(`Sammeltermin "${groupForm.title}" erstellt`);
      
      setShowCreateDialog(false);
      setGroupForm({ title: "", stableName: "", stableAddress: "" });
      setSelectedAppointmentIds([]);
      onGroupCreated?.();
    } catch (error) {
      console.error("Error creating stable group:", error);
      toast.error("Fehler beim Erstellen des Sammeltermins");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Unlink appointments first
      await supabase
        .from("appointments")
        .update({ stable_group_id: null })
        .eq("stable_group_id", groupId);

      // Delete the group
      await supabase.from("appointment_groups").delete().eq("id", groupId);

      queryClient.invalidateQueries({ queryKey: ["stable-groups"] });
      queryClient.invalidateQueries({ queryKey: ["ungrouped-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["grouped-appointments"] });

      toast.success("Sammeltermin gelöscht");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const getGroupAppointments = (groupId: string) =>
    groupedAppointments.filter((apt) => apt.stable_group_id === groupId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sammeltermine</h3>
          <Badge variant="secondary">
            {format(selectedDate, "EEEE, dd.MM.", { locale: de })}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Sammeltermin
        </Button>
      </div>

      {/* Existing Groups */}
      {stableGroups.length > 0 && (
        <div className="space-y-3">
          {stableGroups.map((group) => {
            const appointments = getGroupAppointments(group.id);
            return (
              <Card key={group.id} className="overflow-hidden">
                <CardHeader className="py-3 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {group.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {appointments.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {group.stable_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {group.stable_name}
                      {group.stable_address && ` - ${group.stable_address}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {appointments.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      Keine Termine zugeordnet
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="p-3 flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {apt.time?.slice(0, 5) || "--:--"}
                          </span>
                          <span className="text-sm">
                            🐴 {apt.horses?.name || "Unbekannt"}
                          </span>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {apt.horses?.owner?.full_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {stableGroups.length === 0 && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-8 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Noch keine Sammeltermine für diesen Tag
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Ersten Sammeltermin erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Sammeltermin erstellen
            </DialogTitle>
            <DialogDescription>
              Fassen Sie mehrere Termine am gleichen Standort zusammen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Title */}
            <div className="space-y-2">
              <Label htmlFor="group-title">Titel *</Label>
              <Input
                id="group-title"
                placeholder="z.B. Reitverein Müller, Hof Schmidt..."
                value={groupForm.title}
                onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
              />
            </div>

            {/* Stable Name */}
            <div className="space-y-2">
              <Label htmlFor="stable-name">Stallname (optional)</Label>
              <Input
                id="stable-name"
                placeholder="z.B. Reitanlage Sonnenhof"
                value={groupForm.stableName}
                onChange={(e) => setGroupForm({ ...groupForm, stableName: e.target.value })}
              />
            </div>

            {/* Stable Address */}
            <div className="space-y-2">
              <Label htmlFor="stable-address">Adresse (optional)</Label>
              <Input
                id="stable-address"
                placeholder="Musterstraße 1, 12345 Musterstadt"
                value={groupForm.stableAddress}
                onChange={(e) => setGroupForm({ ...groupForm, stableAddress: e.target.value })}
              />
            </div>

            {/* Select Appointments */}
            {ungroupedAppointments.length > 0 && (
              <div className="space-y-2">
                <Label>Termine zuordnen ({selectedAppointmentIds.length} ausgewählt)</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {ungroupedAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        "p-3 flex items-center gap-3 border-b last:border-0 cursor-pointer hover:bg-muted/50",
                        selectedAppointmentIds.includes(apt.id) && "bg-primary/5"
                      )}
                      onClick={() => handleToggleAppointment(apt.id)}
                    >
                      <Checkbox
                        checked={selectedAppointmentIds.includes(apt.id)}
                        onCheckedChange={() => handleToggleAppointment(apt.id)}
                      />
                      <span className="text-sm font-medium">
                        {apt.time?.slice(0, 5) || "--:--"}
                      </span>
                      <span className="text-sm">
                        🐴 {apt.horses?.name || "Unbekannt"}
                      </span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {apt.horses?.owner?.full_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ungroupedAppointments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Alle Termine sind bereits einem Sammeltermin zugeordnet
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateGroup} disabled={isCreating || !groupForm.title}>
              {isCreating ? "Wird erstellt..." : "Sammeltermin erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
