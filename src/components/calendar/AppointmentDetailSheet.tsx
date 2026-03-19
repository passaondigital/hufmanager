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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Tags,
  Loader2,
  CalendarClock,
  Save,
  X,
  Edit3,
  ArrowLeftRight,
  StickyNote,
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
  { value: "planned", label: "Geplant", color: "bg-yellow-500", emoji: "🟡" },
  { value: "confirmed", label: "Bestätigt", color: "bg-blue-500", emoji: "✔️" },
  { value: "completed", label: "Erledigt", color: "bg-green-500", emoji: "✅" },
  { value: "cancelled", label: "Abgesagt", color: "bg-red-500", emoji: "❌" },
  { value: "no_show", label: "Nicht erschienen", color: "bg-gray-500", emoji: "⚫" },
];

export function AppointmentDetailSheet({
  appointment,
  isOpen,
  onClose,
  onAssign,
}: AppointmentDetailSheetProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [editedNotes, setEditedNotes] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };
      if (status === "completed") updateData.completed_at = new Date().toISOString();
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

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ date, time, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Termin verschoben", description: `Neuer Termin: ${rescheduleDate} um ${rescheduleTime}` });
      setIsRescheduling(false);
    },
    onError: () => {
      toast({ title: "Fehler beim Verschieben", variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Notizen aktualisiert" });
      setIsEditingNotes(false);
    },
    onError: () => {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
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

  const handleStartReschedule = () => {
    setRescheduleDate(format(appointment.start, "yyyy-MM-dd"));
    setRescheduleTime(resource.time?.slice(0, 5) || "09:00");
    setIsRescheduling(true);
  };

  const handleStartEditNotes = () => {
    setEditedNotes(resource.notes || "");
    setIsEditingNotes(true);
  };

  const handleRescheduleSubmit = () => {
    if (!rescheduleDate || !rescheduleTime) return;
    rescheduleMutation.mutate({ id: resource.id, date: rescheduleDate, time: rescheduleTime });
  };

  const handleNotesSubmit = () => {
    updateNotesMutation.mutate({ id: resource.id, notes: editedNotes });
  };

  // Quick status action buttons for mobile
  const quickActions = () => {
    const status = resource.status;
    if (status === "planned") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            className="h-14 text-sm gap-2"
            onClick={() => updateStatusMutation.mutate({ id: resource.id, status: "confirmed" })}
            disabled={updateStatusMutation.isPending}
          >
            <CheckCircle2 className="h-5 w-5" />
            Bestätigen
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-sm gap-2"
            onClick={() => updateStatusMutation.mutate({ id: resource.id, status: "completed" })}
            disabled={updateStatusMutation.isPending}
          >
            ✅ Erledigt
          </Button>
        </div>
      );
    }
    if (status === "confirmed") {
      return (
        <Button
          size="lg"
          className="w-full h-14 text-sm gap-2"
          onClick={() => updateStatusMutation.mutate({ id: resource.id, status: "completed" })}
          disabled={updateStatusMutation.isPending}
        >
          ✅ Als erledigt markieren
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsRescheduling(false);
          setIsEditingNotes(false);
          onClose();
        }
      }}>
        <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              🐴 {resource.horses?.name || "Unbekannt"}
            </SheetTitle>
            {resource.horses?.breed && (
              <p className="text-xs text-muted-foreground">{resource.horses.breed}</p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-5">
            {/* Status selector - big buttons for mobile */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatusMutation.mutate({ id: resource.id, status: opt.value })}
                    disabled={updateStatusMutation.isPending}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 min-h-[40px]
                      ${resource.status === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }
                    `}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Info cards */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{format(appointment.start, "EEEE, d. MMMM yyyy", { locale: de })}</p>
                  <p className="text-xs text-muted-foreground">
                    {resource.time?.slice(0, 5) || "–"} · {resource.duration || 60} Min.
                  </p>
                </div>
              </div>

              {resource.location && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm truncate">{resource.location}</span>
                </div>
              )}

              {resource.service_type && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <Tags className="h-5 w-5 text-primary flex-shrink-0" />
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{clientName}</span>
                </div>
              )}

              {resource.is_confirmed_by_client && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Vom Kunden bestätigt</span>
                </div>
              )}
            </div>

            {/* Reschedule Panel */}
            {isRescheduling ? (
              <>
                <Separator />
                <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-primary font-semibold">
                      <CalendarClock className="h-4 w-4" />
                      Termin verschieben
                    </Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRescheduling(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Neues Datum</Label>
                      <Input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Neue Uhrzeit</Label>
                      <Input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 gap-2"
                    onClick={handleRescheduleSubmit}
                    disabled={rescheduleMutation.isPending}
                  >
                    {rescheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Termin verschieben
                  </Button>
                </div>
              </>
            ) : null}

            {/* Notes edit */}
            {isEditingNotes ? (
              <>
                <Separator />
                <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 font-semibold">
                      <StickyNote className="h-4 w-4" />
                      Notizen bearbeiten
                    </Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditingNotes(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={4}
                    className="text-sm resize-none"
                    placeholder="Notizen zum Termin..."
                    maxLength={2000}
                  />
                  <Button
                    className="w-full h-11 gap-2"
                    onClick={handleNotesSubmit}
                    disabled={updateNotesMutation.isPending}
                  >
                    {updateNotesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Notizen speichern
                  </Button>
                </div>
              </>
            ) : resource.notes ? (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Notizen
                    </label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleStartEditNotes}>
                      <Edit3 className="h-3 w-3" /> Bearbeiten
                    </Button>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                    {resource.notes}
                  </p>
                </div>
              </>
            ) : null}

            <Separator />

            {/* Quick status actions */}
            {quickActions()}

            {/* Action buttons */}
            <div className="space-y-2 pb-4">
              {!isRescheduling && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-12"
                  onClick={handleStartReschedule}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Termin verschieben
                </Button>
              )}

              {!isEditingNotes && !resource.notes && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-12"
                  onClick={handleStartEditNotes}
                >
                  <StickyNote className="h-4 w-4" />
                  Notizen hinzufügen
                </Button>
              )}

              {onAssign && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-12"
                  onClick={() => onAssign(resource.id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Mitarbeiter zuweisen
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
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
