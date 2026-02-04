import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Smartphone,
  CheckCircle2,
  CalendarDays,
  MapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppointmentFormModal } from "@/components/calendar/AppointmentFormModal";
import { CalendarSyncModal } from "@/components/calendar/CalendarSyncModal";
import { AppointmentTooltip } from "@/components/calendar/AppointmentTooltip";
import { NearbyDueClientsPanel } from "@/components/calendar/NearbyDueClientsPanel";
import { TourMapView } from "@/components/calendar/TourMapView";

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
    clients?: { first_name: string | null; last_name: string | null; location_lat?: number; location_lng?: number } | null;
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
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  // Mobile: Default to agenda view for better readability
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(
    isMobile ? Views.AGENDA : Views.WEEK
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [preselectedHorseId, setPreselectedHorseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [icalToken, setIcalToken] = useState<string | null>(null);

  // Fetch appointments with client data for map
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          duration,
          service_type,
          location,
          status,
          is_confirmed_by_client,
          notes,
          horses (
            id,
            name,
            breed
          ),
          contacts:client_id (
            id,
            full_name,
            street,
            zip_code,
            city
          )
        `)
        .eq("provider_id", user.id)
        .order("date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch ical token
  useQuery({
    queryKey: ["ical-token", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("ical_token")
        .eq("id", user.id)
        .single();
      setIcalToken(data?.ical_token || null);
      return data?.ical_token;
    },
    enabled: !!user?.id,
  });

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((apt: any) => {
      const startDate = new Date(`${apt.date}T${apt.time || "09:00"}`);
      const endDate = addMinutes(startDate, apt.duration || 60);
      
      return {
        id: apt.id,
        title: apt.horses?.name || "Termin",
        start: startDate,
        end: endDate,
        resource: {
          ...apt,
          clients: apt.contacts ? {
            first_name: apt.contacts.full_name?.split(" ")[0] || null,
            last_name: apt.contacts.full_name?.split(" ").slice(1).join(" ") || null,
          } : null,
        },
      };
    });
  }, [appointments]);

  // Filter appointments for current date (for map view)
  const appointmentsForMap = useMemo(() => {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    return appointments
      .filter((apt: any) => apt.date === dateStr)
      .map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        horses: apt.horses,
        clients: apt.contacts ? {
          first_name: apt.contacts.full_name?.split(" ")[0] || null,
          last_name: apt.contacts.full_name?.split(" ").slice(1).join(" ") || null,
          location_lat: null,
          location_lng: null,
          street: apt.contacts.street,
          zip: apt.contacts.zip_code,
          city: apt.contacts.city,
        } : null,
      }));
  }, [appointments, currentDate]);

  // Event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const serviceType = event.resource.service_type || "Kontrolle";
    const colors = SERVICE_COLORS[serviceType] || SERVICE_COLORS.Kontrolle;
    const isConfirmed = event.resource.is_confirmed_by_client;
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: "2px",
        borderStyle: isConfirmed ? "solid" : "dashed",
        color: "white",
        borderRadius: "6px",
        opacity: event.resource.status === "cancelled" ? 0.5 : 1,
      },
    };
  }, []);

  // Handle slot select (create new appointment)
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedDate(slotInfo.start);
    setPreselectedHorseId(null);
    setIsFormOpen(true);
  }, []);

  // Handle event select (edit appointment)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  // Handle event drop (drag & drop reschedule)
  const handleEventDrop = useCallback(async ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
    try {
      const newDate = format(start as Date, "yyyy-MM-dd");
      const newTime = format(start as Date, "HH:mm");
      
      const { error } = await supabase
        .from("appointments")
        .update({ date: newDate, time: newTime })
        .eq("id", event.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Termin verschoben" });
    } catch (error) {
      toast({ title: "Fehler beim Verschieben", variant: "destructive" });
    }
  }, [queryClient]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Termin gelöscht" });
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    },
    onError: () => {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    },
  });

  // Handle create new
  const handleCreateNew = () => {
    setSelectedDate(new Date());
    setPreselectedHorseId(null);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kalender</h1>
          <p className="text-muted-foreground">
            {events.length} Termine
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsSyncModalOpen(true)}>
            <Smartphone className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Termin
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Karte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-2 sm:p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="h-[600px] md:h-[700px]">
                  <DnDCalendar
                    localizer={localizer}
                    events={events}
                    view={currentView}
                    onView={setCurrentView}
                    date={currentDate}
                    onNavigate={setCurrentDate}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventDrop={handleEventDrop}
                    eventPropGetter={eventStyleGetter}
                    selectable
                    resizable={false}
                    messages={messages}
                    culture="de"
                    step={30}
                    timeslots={2}
                    min={new Date(2000, 0, 1, 6, 0)}
                    max={new Date(2000, 0, 1, 21, 0)}
                    className="rounded-lg"
                    components={{
                      event: ({ event }) => (
                        <AppointmentTooltip appointment={event.resource}>
                          <div className="px-1 py-0.5 text-xs truncate">
                            {event.resource.is_confirmed_by_client && (
                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                            )}
                            {event.title}
                          </div>
                        </AppointmentTooltip>
                      ),
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <TourMapView 
            appointments={appointmentsForMap as any} 
            selectedDate={currentDate}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Nearby Due Clients Panel */}
      <NearbyDueClientsPanel 
        selectedDate={selectedDate}
        onSelectHorse={(horseId) => {
          setPreselectedHorseId(horseId);
          setSelectedDate(new Date());
          setIsFormOpen(true);
        }} 
      />

      {/* Form Modal */}
      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPreselectedHorseId(null);
        }}
        selectedDate={selectedDate}
        existingAppointments={appointments}
        preselectedHorseId={preselectedHorseId}
      />

      {/* Sync Modal */}
      <CalendarSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        icalToken={icalToken}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => appointmentToDelete && deleteMutation.mutate(appointmentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Kalender;
