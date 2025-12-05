import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const typeColors: Record<string, string> = {
  Barhuf: "bg-accent text-accent-foreground",
  Beschlag: "bg-primary text-primary-foreground",
  Korrektur: "bg-amber-500 text-white",
};

const Kalender = () => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const queryClient = useQueryClient();

  // Send appointment reminders
  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-appointment-reminders");
      
      if (error) throw error;
      
      toast({
        title: "Erinnerungen versendet",
        description: `${data.sent} Erinnerung(en) für morgige Termine wurden erfolgreich versendet.`,
      });
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Fehler",
        description: error.message || "Erinnerungen konnten nicht versendet werden.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    horseId: "",
    time: "09:00",
    serviceType: "Barhuf",
    notes: "",
    location: "",
  });

  // Fetch horses for the dropdown
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, horses(name, owner_id), is_confirmed_by_client")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (data: {
      horse_id: string;
      date: string;
      time: string;
      service_type: string;
      notes: string;
      location: string;
    }) => {
      const { error } = await supabase.from("appointments").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Termin erstellt",
        description: "Der Termin wurde erfolgreich gespeichert.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Der Termin konnte nicht erstellt werden.",
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
    });
  };

  // Generate week days
  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + currentWeek * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        dayName: daysOfWeek[i],
        dayNumber: date.getDate(),
        month: date.toLocaleDateString("de-DE", { month: "short" }),
        isToday: date.toDateString() === today.toDateString(),
        dayIndex: i + 1,
        fullDate: date,
      };
    });
  };

  const weekDays = getWeekDays();

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter((apt) => apt.date === dateStr);
  };

  const handleDayClick = (day: (typeof weekDays)[0]) => {
    setSelectedDay(day.dayIndex);
    setSelectedDate(day.fullDate);
  };

  const handleOpenNewAppointment = () => {
    if (selectedDate) {
      setIsDialogOpen(true);
    } else {
      // Use today if no date selected
      setSelectedDate(new Date());
      setIsDialogOpen(true);
    }
  };

  const handleSubmit = () => {
    if (!formData.horseId || !selectedDate) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Pferd aus.",
        variant: "destructive",
      });
      return;
    }

    createAppointment.mutate({
      horse_id: formData.horseId,
      date: selectedDate.toISOString().split("T")[0],
      time: formData.time,
      service_type: formData.serviceType,
      notes: formData.notes,
      location: formData.location,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Termine und Besuche
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleSendReminders}
            disabled={isSendingReminders}
          >
            {isSendingReminders ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Erinnerungen senden
          </Button>
          <Button className="gap-2" onClick={handleOpenNewAppointment}>
            <Plus className="h-4 w-4" />
            Neuer Termin
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek((w) => w - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {currentWeek === 0
                ? "Diese Woche"
                : currentWeek === 1
                ? "Nächste Woche"
                : currentWeek === -1
                ? "Letzte Woche"
                : `KW ${new Date().getWeek() + currentWeek}`}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek((w) => w + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day.fullDate);
              const isSelected = selectedDay === day.dayIndex;

              return (
                <div
                  key={day.dayIndex}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "p-3 rounded-xl cursor-pointer transition-all min-h-[120px]",
                    day.isToday && "ring-2 ring-primary",
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 hover:bg-muted/50",
                    "border border-transparent"
                  )}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground font-medium">{day.dayName}</p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        day.isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {day.dayNumber}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-xs p-1.5 rounded-md truncate flex items-center gap-1",
                          typeColors[apt.service_type || "Barhuf"]
                        )}
                      >
                        {apt.is_confirmed_by_client && (
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                        )}
                        <span className="truncate">{apt.time} {apt.horses?.name}</span>
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - 2} mehr
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail */}
      {selectedDay && selectedDate && (
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Termine am {weekDays[selectedDay - 1]?.dayNumber}. {weekDays[selectedDay - 1]?.month}
            </CardTitle>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Termin hinzufügen
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {getAppointmentsForDay(selectedDate).length > 0 ? (
              getAppointmentsForDay(selectedDate).map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{apt.horses?.name}</h4>
                        <Badge className={cn("text-xs", typeColors[apt.service_type || "Barhuf"])}>
                          {apt.service_type}
                        </Badge>
                        {apt.is_confirmed_by_client ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Bestätigt
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Ausstehend
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {apt.location || "Keine Ortsangabe"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Keine Termine an diesem Tag
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Neuer Termin</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Termin für{" "}
              {selectedDate?.toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                <Label>Uhrzeit</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Service-Typ</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                placeholder="Adresse oder Stallname"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                placeholder="Zusätzliche Hinweise..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "Speichern..." : "Termin erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export default Kalender;
