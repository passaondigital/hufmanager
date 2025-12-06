import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { addWeeks, format } from "date-fns";
import { de } from "date-fns/locale";

const appointmentSchema = z.object({
  horseId: z.string().min(1, "Bitte wählen Sie ein Pferd aus"),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Ungültiges Zeitformat"),
  serviceType: z.string().min(1, "Bitte wählen Sie einen Service-Typ"),
  notes: z.string().max(2000, "Notizen dürfen maximal 2000 Zeichen haben").optional(),
  location: z.string().max(255, "Ort darf maximal 255 Zeichen haben").optional(),
  duration: z.number().min(15).max(480),
});

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  existingAppointments: any[];
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Einmalig" },
  { value: "4", label: "Alle 4 Wochen" },
  { value: "6", label: "Alle 6 Wochen" },
  { value: "8", label: "Alle 8 Wochen" },
  { value: "custom", label: "Benutzerdefiniert" },
];

export function AppointmentFormModal({
  isOpen,
  onClose,
  selectedDate,
  existingAppointments,
}: AppointmentFormModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState("none");
  const [customWeeks, setCustomWeeks] = useState(4);

  const [formData, setFormData] = useState({
    horseId: "",
    time: "09:00",
    serviceType: "Barhuf",
    notes: "",
    location: "",
    duration: 60,
  });

  // Fetch horses
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Check for conflicts
  const checkForConflicts = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existingAtTime = existingAppointments.filter(
      (apt) => apt.date === dateStr && apt.time === time
    );
    
    if (existingAtTime.length > 0) {
      const horseNames = existingAtTime
        .map((apt) => apt.horses?.name || "Unbekannt")
        .join(", ");
      setConflictWarning(`Zur gleichen Zeit ist bereits ein Termin geplant: ${horseNames}`);
    } else {
      setConflictWarning(null);
    }
  };

  useEffect(() => {
    if (selectedDate && formData.time) {
      checkForConflicts(selectedDate, formData.time);
    }
  }, [selectedDate, formData.time, existingAppointments]);

  // Create appointment mutation
  const createAppointments = useMutation({
    mutationFn: async (appointments: any[]) => {
      const { error } = await supabase.from("appointments").insert(appointments);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      const count = variables.length;
      toast({
        title: count > 1 ? `${count} Termine erstellt` : "Termin erstellt",
        description: count > 1 
          ? `${count} wiederkehrende Termine wurden gespeichert.`
          : "Der Termin wurde erfolgreich gespeichert.",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Der Termin konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      horseId: "",
      time: "09:00",
      serviceType: "Barhuf",
      notes: "",
      location: "",
      duration: 60,
    });
    setRecurrence("none");
    setCustomWeeks(4);
    setConflictWarning(null);
  };

  const handleSubmit = () => {
    if (!selectedDate || !user?.id) {
      toast({
        title: "Fehler",
        description: "Bitte melden Sie sich erneut an.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = appointmentSchema.safeParse({
      horseId: formData.horseId,
      time: formData.time,
      serviceType: formData.serviceType,
      notes: formData.notes || undefined,
      location: formData.location || undefined,
      duration: formData.duration,
    });

    if (!validationResult.success) {
      toast({
        title: "Validierungsfehler",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast({
        title: "Ungültiges Datum",
        description: "Termine können nicht in der Vergangenheit erstellt werden.",
        variant: "destructive",
      });
      return;
    }

    const validated = validationResult.data;
    const appointments: any[] = [];
    const recurringGroupId = recurrence !== "none" ? crypto.randomUUID() : null;

    // Calculate number of occurrences (12 months worth)
    const weeksInterval = recurrence === "custom" ? customWeeks : parseInt(recurrence);
    const occurrences = recurrence === "none" ? 1 : Math.floor(52 / weeksInterval);

    for (let i = 0; i < occurrences; i++) {
      const appointmentDate = addWeeks(selectedDate, i * weeksInterval);
      
      appointments.push({
        horse_id: validated.horseId,
        date: format(appointmentDate, "yyyy-MM-dd"),
        time: validated.time,
        service_type: validated.serviceType,
        notes: validated.notes || "",
        location: validated.location || "",
        duration: validated.duration,
        provider_id: user.id,
        recurring_group_id: recurringGroupId,
      });
    }

    createAppointments.mutate(appointments);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Termin</DialogTitle>
          <DialogDescription>
            {selectedDate ? (
              <>Termin für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}</>
            ) : (
              "Wählen Sie ein Datum im Kalender"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {conflictWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{conflictWarning}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Pferd auswählen *</Label>
            <Select
              value={formData.horseId}
              onValueChange={(value) => setFormData({ ...formData, horseId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pferd auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name} ({horse.breed || "Unbekannt"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Uhrzeit *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dauer (Min.)</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Min.</SelectItem>
                  <SelectItem value="45">45 Min.</SelectItem>
                  <SelectItem value="60">1 Stunde</SelectItem>
                  <SelectItem value="90">1,5 Stunden</SelectItem>
                  <SelectItem value="120">2 Stunden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service-Typ *</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Barhuf">Barhuf</SelectItem>
                <SelectItem value="Beschlag">Beschlag</SelectItem>
                <SelectItem value="Korrektur">Korrektur</SelectItem>
                <SelectItem value="Notfall">Notfall</SelectItem>
                <SelectItem value="Kontrolle">Kontrolle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Options */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Label className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Wiederholung
            </Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {recurrence === "custom" && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm whitespace-nowrap">Alle</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={customWeeks}
                  onChange={(e) => setCustomWeeks(parseInt(e.target.value) || 4)}
                  className="w-20"
                />
                <Label className="text-sm">Wochen</Label>
              </div>
            )}
            
            {recurrence !== "none" && (
              <p className="text-xs text-muted-foreground mt-2">
                Es werden automatisch Termine für die nächsten 12 Monate erstellt.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ort</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="z.B. Reitstall Sonnenhof"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Zusätzliche Informationen..."
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAppointments.isPending}
          >
            {createAppointments.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {recurrence !== "none" ? "Termine erstellen" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
