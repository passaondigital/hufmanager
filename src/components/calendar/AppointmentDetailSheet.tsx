import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Trash2,
  UserPlus,
  Edit3,
  Tags,
  Loader2,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getPriceGroupShortLabel } from "@/lib/priceGroups";

interface AppointmentDetailSheetProps {
  appointment: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
      id: string;
      time: string | null;
      duration: number | null;
      service_type: string | null;
      location: string | null;
      status: string | null;
      is_confirmed_by_client: boolean | null;
      notes: string | null;
      price_group_applied?: string | null;
      horses?: { name: string; breed: string | null } | null;
      clients?: { first_name: string | null; last_name: string | null } | null;
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign?: (appointmentId: string) => void;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Geplant", color: "bg-yellow-500" },
  { value: "confirmed", label: "Bestätigt", color: "bg-blue-500" },
  { value: "completed", label: "Erledigt", color: "bg-green-500" },
  { value: "cancelled", label: "Abgesagt", color: "bg-red-500" },
  { value: "no_show", label: "Nicht erschienen", color: "bg-gray-500" },
];

export function AppointmentDetailSheet({
  appointment,
  isOpen,
  onClose,
  onAssign,
}: AppointmentDetailSheetProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Status aktualisiert" });
    },
    onError: () => {
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Termin gelöscht" });
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: () => {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    },
  });

  if (!appointment) return null;

  const { resource } = appointment;
  const clientName = resource.clients
    ? `${resource.clients.first_name || ""} ${resource.clients.last_name || ""}`.trim()
    : null;
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === resource.status) || STATUS_OPTIONS[0];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              🐴 {resource.horses?.name || "Unbekannt"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {/* Status Badge + Change */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <Select
                value={resource.status || "planned"}
                onValueChange={(value) =>
                  updateStatusMutation.mutate({ id: resource.id, status: value })
                }
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${currentStatus.color}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{format(appointment.start, "EEEE, d. MMMM yyyy", { locale: de })}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {resource.time || "–"} · {resource.duration || 60} Min.
                </span>
              </div>

              {resource.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{resource.location}</span>
                </div>
              )}

              {resource.service_type && (
                <div className="flex items-center gap-3 text-sm">
                  <Tags className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{resource.service_type}</Badge>
                    {resource.price_group_applied && (
                      <Badge variant="secondary" className="text-[10px]">
                        {getPriceGroupShortLabel(resource.price_group_applied)}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {clientName && (
                <div className="flex items-center gap-3 text-sm">
                  <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{clientName}</span>
                </div>
              )}

              {resource.horses?.breed && (
                <p className="text-xs text-muted-foreground ml-7">
                  Rasse: {resource.horses.breed}
                </p>
              )}

              {resource.is_confirmed_by_client && (
                <div className="flex items-center gap-3 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>Vom Kunden bestätigt</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {resource.notes && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Notizen
                  </label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {resource.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {onAssign && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => onAssign(resource.id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Mitarbeiter zuweisen
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Termin löschen
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin für {resource.horses?.name || "dieses Pferd"} am{" "}
              {format(appointment.start, "d. MMMM yyyy", { locale: de })} wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(resource.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
