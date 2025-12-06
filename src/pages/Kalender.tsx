import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Mail,
  Loader2,
  Smartphone,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppointmentFormModal } from "@/components/calendar/AppointmentFormModal";
import { CalendarSyncModal } from "@/components/calendar/CalendarSyncModal";
import { AppointmentTooltip } from "@/components/calendar/AppointmentTooltip";

// Import CSS for react-big-calendar
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

// Setup date-fns localizer
const locales = { de };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Drag and drop calendar
const DnDCalendar = withDragAndDrop(Calendar);

// Color mapping for service types
const SERVICE_COLORS: Record<string, { bg: string; border: string }> = {
  Barhuf: { bg: "hsl(142, 76%, 36%)", border: "hsl(142, 76%, 26%)" },
  Beschlag: { bg: "hsl(25, 95%, 53%)", border: "hsl(25, 95%, 43%)" },
  Korrektur: { bg: "hsl(45, 93%, 47%)", border: "hsl(45, 93%, 37%)" },
  Notfall: { bg: "hsl(0, 84%, 60%)", border: "hsl(0, 84%, 50%)" },
  Kontrolle: { bg: "hsl(217, 91%, 60%)", border: "hsl(217, 91%, 50%)" },
};

// Define event type
interface CalendarEvent {
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
    horses?: { name: string; breed: string | null } | null;
  };
}

// German messages for calendar
const messages = {
  allDay: "Ganztägig",
  previous: "Zurück",
  next: "Weiter",
  today: "Heute",
  month: "Monat",
  week: "Woche",
  day: "Tag",
  agenda: "Agenda",
  date: "Datum",
  time: "Zeit",
  event: "Termin",
  noEventsInRange: "Keine Termine in diesem Zeitraum.",
  showMore: (total: number) => `+${total} weitere`,
};

const Kalender = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for reschedule confirmation dialog
  const [pendingReschedule, setPendingReschedule] = useState<{
    id: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    horseName: string;
  } | null>(null);

  // Fetch user profile for ical_token
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("ical_token")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, horses(name, breed)")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((apt) => {
      const [hours, minutes] = (apt.time || "09:00").split(":").map(Number);
      const start = new Date(apt.date);
      start.setHours(hours, minutes, 0);
      const end = addMinutes(start, apt.duration || 60);

      return {
        id: apt.id,
        title: `${apt.horses?.name || "Unbekannt"} - ${apt.service_type || "Termin"}`,
        start,
        end,
        resource: {
          id: apt.id,
          time: apt.time,
          duration: apt.duration,
          service_type: apt.service_type,
          location: apt.location,
          status: apt.status,
          is_confirmed_by_client: apt.is_confirmed_by_client,
          notes: apt.notes,
          horses: apt.horses,
        },
      };
    });
  }, [appointments]);

  // Update appointment mutation (for drag & drop)
  const updateAppointment = useMutation({
    mutationFn: async ({ 
      id, 
      date, 
      time, 
      oldDate, 
      oldTime 
    }: { 
      id: string; 
      date: string; 
      time: string; 
      oldDate: string; 
      oldTime: string;
    }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ date, time })
        .eq("id", id);
      if (error) throw error;
      
      // Send notification in background (don't await)
      supabase.functions.invoke("send-reschedule-notification", {
        body: {
          appointmentId: id,
          oldDate,
          oldTime,
          newDate: date,
          newTime: time,
        },
      }).then(({ error: notifyError }) => {
        if (notifyError) {
          console.error("Failed to send reschedule notification:", notifyError);
        } else {
          console.log("Reschedule notification sent");
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Termin verschoben",
        description: "Der Termin wurde aktualisiert. Der Kunde wird benachrichtigt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Der Termin konnte nicht verschoben werden.",
        variant: "destructive",
      });
    },
  });

  // Handle event drop (drag & drop) - show confirmation first
  const handleEventDrop = useCallback(
    ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
      const oldDate = format(event.start, "yyyy-MM-dd");
      const oldTime = format(event.start, "HH:mm");
      const newDate = format(start as Date, "yyyy-MM-dd");
      const newTime = format(start as Date, "HH:mm");
      
      // Show confirmation dialog
      setPendingReschedule({
        id: event.id,
        oldDate,
        oldTime,
        newDate,
        newTime,
        horseName: event.resource.horses?.name || "Unbekannt",
      });
    },
    []
  );

  // Handle event resize - show confirmation first
  const handleEventResize = useCallback(
    ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
      const oldDate = format(event.start, "yyyy-MM-dd");
      const oldTime = format(event.start, "HH:mm");
      const newDate = format(start as Date, "yyyy-MM-dd");
      const newTime = format(start as Date, "HH:mm");
      
      // Show confirmation dialog
      setPendingReschedule({
        id: event.id,
        oldDate,
        oldTime,
        newDate,
        newTime,
        horseName: event.resource.horses?.name || "Unbekannt",
      });
    },
    []
  );

  // Confirm reschedule
  const confirmReschedule = useCallback(() => {
    if (pendingReschedule) {
      updateAppointment.mutate({
        id: pendingReschedule.id,
        date: pendingReschedule.newDate,
        time: pendingReschedule.newTime,
        oldDate: pendingReschedule.oldDate,
        oldTime: pendingReschedule.oldTime,
      });
      setPendingReschedule(null);
    }
  }, [pendingReschedule, updateAppointment]);

  // Cancel reschedule
  const cancelReschedule = useCallback(() => {
    setPendingReschedule(null);
    // Invalidate to reset the calendar visual state
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }, [queryClient]);

  // Handle slot selection (create new appointment)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedDate(slotInfo.start);
    setIsFormOpen(true);
  }, []);

  // Send reminders
  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-appointment-reminders");
      if (error) throw error;
      toast({
        title: "Erinnerungen versendet",
        description: `${data?.sent || 0} Erinnerung(en) wurden erfolgreich versendet.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({
        title: "Fehler",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Custom event styling
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const serviceType = event.resource.service_type || "Barhuf";
    const colors = SERVICE_COLORS[serviceType] || SERVICE_COLORS.Barhuf;
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: "2px",
        borderRadius: "6px",
        color: "white",
        fontSize: "0.75rem",
        fontWeight: 500,
      },
    };
  }, []);

  // Custom event component with tooltip
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => (
      <AppointmentTooltip appointment={event.resource}>
        <div className="flex items-center gap-1 truncate px-1">
          {event.resource.is_confirmed_by_client && (
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{event.title}</span>
        </div>
      </AppointmentTooltip>
    ),
    []
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-muted-foreground text-sm">
            Verwalten Sie Ihre Termine und Besuche
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsSyncModalOpen(true)}
          >
            <Smartphone className="h-4 w-4" />
            Mit Handy synchronisieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSendReminders}
            disabled={isSendingReminders}
          >
            {isSendingReminders ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Erinnerungen
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setSelectedDate(new Date());
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Neuer Termin
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SERVICE_COLORS).map(([type, colors]) => (
          <Badge
            key={type}
            className="text-xs"
            style={{ backgroundColor: colors.bg, color: "white" }}
          >
            {type}
          </Badge>
        ))}
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[700px] calendar-container">
            <DnDCalendar
              localizer={localizer}
              events={events}
              view={currentView}
              onView={(view) => setCurrentView(view)}
              date={currentDate}
              onNavigate={setCurrentDate}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectSlot={handleSelectSlot}
              selectable
              resizable
              eventPropGetter={eventStyleGetter}
              components={{
                event: EventComponent,
              }}
              messages={messages}
              culture="de"
              step={30}
              timeslots={2}
              min={new Date(0, 0, 0, 6, 0)} // 6 AM
              max={new Date(0, 0, 0, 21, 0)} // 9 PM
              defaultView={Views.WEEK}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              popup
              tooltipAccessor={() => ""} // Disable default tooltip (we use custom)
              className="rbc-calendar-custom"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        existingAppointments={appointments}
      />

      <CalendarSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        icalToken={profile?.ical_token || null}
      />

      {/* Reschedule Confirmation Dialog */}
      <AlertDialog open={!!pendingReschedule} onOpenChange={(open) => !open && cancelReschedule()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Termin verschieben?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Möchten Sie den Termin für <strong>🐴 {pendingReschedule?.horseName}</strong> wirklich verschieben?
                </p>
                {pendingReschedule && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">
                        {format(new Date(pendingReschedule.oldDate), "dd.MM.yyyy", { locale: de })} um {pendingReschedule.oldTime} Uhr
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      → {format(new Date(pendingReschedule.newDate), "dd.MM.yyyy", { locale: de })} um {pendingReschedule.newTime} Uhr
                    </div>
                  </div>
                )}
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Der Kunde wird automatisch per E-Mail benachrichtigt.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReschedule}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReschedule}>
              Ja, verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Add getWeek function for ISO week numbers
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
