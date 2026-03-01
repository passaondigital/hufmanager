import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addMinutes, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  Smartphone,
  CheckCircle2,
  CalendarDays,
  MapIcon,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppointmentFormModal } from "@/components/calendar/AppointmentFormModal";
import { CalendarSyncModal } from "@/components/calendar/CalendarSyncModal";
import { AppointmentTooltip } from "@/components/calendar/AppointmentTooltip";
import { AppointmentDetailSheet } from "@/components/calendar/AppointmentDetailSheet";
import { NearbyDueClientsPanel } from "@/components/calendar/NearbyDueClientsPanel";
import { TourMapView } from "@/components/calendar/TourMapView";
import { CalendarFilterBar, type CalendarFilters } from "@/components/calendar/CalendarFilterBar";
import { CalendarWeekStats } from "@/components/calendar/CalendarWeekStats";
import { BulkActionsBar } from "@/components/calendar/BulkActionsBar";
import { AssignEmployeeModal } from "@/components/team/AssignEmployeeModal";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { de };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const SERVICE_COLORS: Record<string, { bg: string; border: string }> = {
  Barhuf: { bg: "hsl(142, 76%, 36%)", border: "hsl(142, 76%, 26%)" },
  Beschlag: { bg: "hsl(25, 95%, 53%)", border: "hsl(25, 95%, 43%)" },
  Korrektur: { bg: "hsl(45, 93%, 47%)", border: "hsl(45, 93%, 37%)" },
  Notfall: { bg: "hsl(0, 84%, 60%)", border: "hsl(0, 84%, 50%)" },
  Kontrolle: { bg: "hsl(217, 91%, 60%)", border: "hsl(217, 91%, 50%)" },
};

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
    price_group_applied?: string | null;
    horses?: { name: string; breed: string | null } | null;
    clients?: { first_name: string | null; last_name: string | null; location_lat?: number; location_lng?: number } | null;
  };
}

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
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(
    isMobile ? Views.AGENDA : Views.WEEK
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [preselectedHorseId, setPreselectedHorseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [icalToken, setIcalToken] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(!isMobile);

  // Detail sheet state
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignAppointmentId, setAssignAppointmentId] = useState<string | null>(null);
  const [assignAppointmentInfo, setAssignAppointmentInfo] = useState<any>();

  // Filter state
  const [filters, setFilters] = useState<CalendarFilters>({
    search: "",
    status: "all",
    serviceType: "all",
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch appointments - windowed by ±3 months from current view
  const dateRange = useMemo(() => {
    const start = format(subMonths(currentDate, 3), "yyyy-MM-dd");
    const end = format(addMonths(currentDate, 3), "yyyy-MM-dd");
    return { start, end };
  }, [currentDate]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, date, time, duration, service_type, location, status,
          is_confirmed_by_client, notes, price_group_applied, price, applied_price,
          horses (id, name, breed),
          contacts:client_id (id, full_name, street, zip_code, city)
        `)
        .eq("provider_id", user.id)
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
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

  // Extract unique service types for filter
  const serviceTypes = useMemo(() => {
    const types = new Set(appointments.map((a: any) => a.service_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [appointments]);

  // Apply filters
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt: any) => {
      if (filters.status !== "all" && apt.status !== filters.status) return false;
      if (filters.serviceType !== "all" && apt.service_type !== filters.serviceType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const horseName = apt.horses?.name?.toLowerCase() || "";
        const clientName = apt.contacts?.full_name?.toLowerCase() || "";
        const location = apt.location?.toLowerCase() || "";
        if (!horseName.includes(q) && !clientName.includes(q) && !location.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [appointments, filters]);

  // Convert to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return filteredAppointments.map((apt: any) => {
      const startDate = new Date(`${apt.date}T${apt.time || "09:00"}`);
      const endDate = addMinutes(startDate, apt.duration || 60);
      return {
        id: apt.id,
        title: apt.horses?.name || "Termin",
        start: startDate,
        end: endDate,
        resource: {
          ...apt,
          clients: apt.contacts
            ? {
                first_name: apt.contacts.full_name?.split(" ")[0] || null,
                last_name: apt.contacts.full_name?.split(" ").slice(1).join(" ") || null,
              }
            : null,
        },
      };
    });
  }, [filteredAppointments]);

  // Map appointments
  const appointmentsForMap = useMemo(() => {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    return filteredAppointments
      .filter((apt: any) => apt.date === dateStr)
      .map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        horses: apt.horses,
        clients: apt.contacts
          ? {
              first_name: apt.contacts.full_name?.split(" ")[0] || null,
              last_name: apt.contacts.full_name?.split(" ").slice(1).join(" ") || null,
              location_lat: null,
              location_lng: null,
              street: apt.contacts.street,
              zip: apt.contacts.zip_code,
              city: apt.contacts.city,
            }
          : null,
      }));
  }, [filteredAppointments, currentDate]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const serviceType = event.resource.service_type || "Kontrolle";
    const colors = SERVICE_COLORS[serviceType] || SERVICE_COLORS.Kontrolle;
    const isConfirmed = event.resource.is_confirmed_by_client;
    const isSelected = selectedIds.includes(event.id);

    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: isSelected ? "hsl(var(--primary))" : colors.border,
        borderWidth: isSelected ? "3px" : "2px",
        borderStyle: isConfirmed ? "solid" : "dashed",
        color: "white",
        borderRadius: "6px",
        opacity: event.resource.status === "cancelled" ? 0.5 : 1,
        boxShadow: isSelected ? "0 0 0 2px hsl(var(--primary) / 0.3)" : undefined,
      },
    };
  }, [selectedIds]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedDate(slotInfo.start);
    setPreselectedHorseId(null);
    setIsFormOpen(true);
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent, e: React.SyntheticEvent) => {
      // Shift/Ctrl click for bulk selection
      const nativeEvent = e.nativeEvent as MouseEvent;
      if (nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey) {
        setSelectedIds((prev) =>
          prev.includes(event.id) ? prev.filter((id) => id !== event.id) : [...prev, event.id]
        );
        return;
      }

      // Normal click opens detail sheet
      setDetailEvent(event);
      setDetailOpen(true);
    },
    []
  );

  const handleEventDrop = useCallback(
    async ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
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
      } catch {
        toast({ title: "Fehler beim Verschieben", variant: "destructive" });
      }
    },
    [queryClient]
  );

  const handleCreateNew = () => {
    setSelectedDate(new Date());
    setPreselectedHorseId(null);
    setIsFormOpen(true);
  };

  const handleAssignFromSheet = (appointmentId: string) => {
    const event = events.find((e) => e.resource.id === appointmentId);
    setAssignAppointmentId(appointmentId);
    setAssignAppointmentInfo(
      event
        ? {
            horseName: event.title,
            clientName: event.resource.clients
              ? `${event.resource.clients.first_name || ""} ${event.resource.clients.last_name || ""}`.trim()
              : undefined,
            date: format(event.start, "dd.MM.yyyy"),
            time: event.resource.time || undefined,
          }
        : undefined
    );
    setAssignModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kalender</h1>
          <p className="text-muted-foreground">
            {filteredAppointments.length}
            {filteredAppointments.length !== appointments.length
              ? ` von ${appointments.length}`
              : ""}{" "}
            Termine
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats((p) => !p)}
            className={cn("hidden md:flex gap-1.5", showStats && "bg-accent")}
          >
            <BarChart3 className="h-4 w-4" />
            Statistik
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsSyncModalOpen(true)}>
            <Smartphone className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button size="sm" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Termin
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <CalendarFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        serviceTypes={serviceTypes}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        appointments={appointments}
      />

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
          <div className={cn("flex gap-4", showStats ? "flex-col lg:flex-row" : "")}>
            {/* Calendar */}
            <Card className="flex-1 min-w-0">
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
                          <AppointmentTooltip
                            appointment={event.resource}
                            onAssign={(id) => handleAssignFromSheet(id)}
                          >
                            <div className="px-1 py-0.5 text-xs truncate">
                              {event.resource.is_confirmed_by_client && (
                                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                              )}
                              {event.resource.price_group_applied && (
                                <span className="bg-white/30 rounded px-1 mr-1 text-[10px] font-bold">
                                  {event.resource.price_group_applied === "vip"
                                    ? "VIP"
                                    : event.resource.price_group_applied === "grossstall"
                                    ? "GS"
                                    : event.resource.price_group_applied === "individuell"
                                    ? "IND"
                                    : ""}
                                </span>
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

            {/* Stats Sidebar */}
            {showStats && (
              <div className="w-full lg:w-[260px] shrink-0">
                <CalendarWeekStats appointments={appointments} currentDate={currentDate} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <TourMapView
            appointments={appointmentsForMap as any}
            selectedDate={currentDate}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Nearby Due Clients */}
      <NearbyDueClientsPanel
        selectedDate={selectedDate}
        onSelectHorse={(horseId) => {
          setPreselectedHorseId(horseId);
          setSelectedDate(new Date());
          setIsFormOpen(true);
        }}
      />

      {/* Detail Sheet */}
      <AppointmentDetailSheet
        appointment={detailEvent}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailEvent(null);
        }}
        onAssign={handleAssignFromSheet}
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

      {/* Assign Employee Modal */}
      {assignAppointmentId && (
        <AssignEmployeeModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          appointmentId={assignAppointmentId}
          appointmentInfo={assignAppointmentInfo}
        />
      )}

      {/* Bulk selection hint */}
      {selectedIds.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Tipp: Halte <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift</kbd> gedrückt und klicke Termine, um mehrere auszuwählen.
        </p>
      )}
    </div>
  );
};

export default Kalender;
