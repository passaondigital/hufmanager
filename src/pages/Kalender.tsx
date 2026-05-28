import { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import { format, startOfWeek, addMinutes, subMonths, addMonths, addDays, isSameDay, endOfWeek, eachDayOfInterval, getISODay } from "date-fns";
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
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/ui/HelpTip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useServicePresets } from "@/hooks/useServicePresets";
import { useIsMobile } from "@/hooks/use-mobile";
import { NearbyDueClientsPanel } from "@/components/calendar/NearbyDueClientsPanel";
import { CalendarFilterBar, type CalendarFilters } from "@/components/calendar/CalendarFilterBar";

const DesktopBigCalendarView = lazy(() =>
  import("@/components/calendar/DesktopBigCalendarView").then((m) => ({ default: m.DesktopBigCalendarView }))
);
const TourMapView = lazy(() =>
  import("@/components/calendar/TourMapView").then((m) => ({ default: m.TourMapView }))
);
const AppointmentFormModal = lazy(() =>
  import("@/components/calendar/AppointmentFormModal").then((m) => ({ default: m.AppointmentFormModal }))
);
const CalendarSyncModal = lazy(() =>
  import("@/components/calendar/CalendarSyncModal").then((m) => ({ default: m.CalendarSyncModal }))
);
const AppointmentDetailSheet = lazy(() =>
  import("@/components/calendar/AppointmentDetailSheet").then((m) => ({ default: m.AppointmentDetailSheet }))
);
const CalendarWeekStats = lazy(() =>
  import("@/components/calendar/CalendarWeekStats").then((m) => ({ default: m.CalendarWeekStats }))
);
const BulkActionsBar = lazy(() =>
  import("@/components/calendar/BulkActionsBar").then((m) => ({ default: m.BulkActionsBar }))
);
const AssignEmployeeModal = lazy(() =>
  import("@/components/team/AssignEmployeeModal").then((m) => ({ default: m.AssignEmployeeModal }))
);

const FALLBACK_COLORS: Record<string, { bg: string; border: string }> = {
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

// --- Mobile Day List View ---
function MobileDayList({
  currentDate,
  events,
  onSelectEvent,
  onDateChange,
  onCreateNew,
  presetColors,
  newClientDays = [1, 6],
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onDateChange: (date: Date) => void;
  onCreateNew: () => void;
  presetColors: Record<string, string>;
  newClientDays?: number[];
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate 7 days around current
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

  const dayEvents = events
    .filter((e) => isSameDay(e.start, currentDate))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) onDateChange(addDays(currentDate, -1));
      else onDateChange(addDays(currentDate, 1));
    }
  };

  const getStatusIndicator = (status: string | null) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "confirmed": return "bg-blue-500";
      case "cancelled": return "bg-destructive";
      case "no_show": return "bg-muted-foreground";
      default: return "bg-yellow-500";
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="space-y-3"
    >
      {/* Day selector strip */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {weekDays.map((day) => {
          const isActive = isSameDay(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const hasEvents = events.some((e) => isSameDay(e.start, day));
          const isNewClientDay = newClientDays.includes(getISODay(day));
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={cn(
                "flex flex-col items-center min-w-[48px] py-2 px-2 rounded-xl transition-all relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday
                  ? "bg-primary/10 text-primary"
                  : isNewClientDay
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-[10px] uppercase font-medium">
                {format(day, "EE", { locale: de })}
              </span>
              <span className={cn("text-lg font-bold", isActive ? "" : "text-foreground")}>
                {format(day, "d")}
              </span>
              {isNewClientDay && !isActive && (
                <span className="text-[8px] font-semibold text-amber-600 leading-tight mt-0.5">NK</span>
              )}
              {hasEvents && !isActive && !isNewClientDay && (
                <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />
              )}
              {hasEvents && !isActive && isNewClientDay && (
                <div className="h-1 w-1 rounded-full bg-amber-500 mt-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDateChange(addDays(currentDate, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{format(currentDate, "EEEE", { locale: de })}</p>
          <p className="text-xs text-muted-foreground">{format(currentDate, "d. MMMM yyyy", { locale: de })}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDateChange(addDays(currentDate, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Events list */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
          <Button size="sm" variant="outline" onClick={onCreateNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Termin erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => {
            const colorHex = presetColors[event.resource.service_type || ""] || FALLBACK_COLORS[event.resource.service_type || "Kontrolle"]?.bg;
            return (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all active:scale-[0.98] shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Time block */}
                  <div className="flex flex-col items-center min-w-[48px] shrink-0">
                    <span className="text-lg font-bold text-foreground">{event.resource.time?.slice(0, 5) || "–"}</span>
                    <span className="text-[10px] text-muted-foreground">{event.resource.duration || 60} Min.</span>
                  </div>

                  {/* Color bar */}
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorHex }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                      <div className={cn("h-2 w-2 rounded-full shrink-0", getStatusIndicator(event.resource.status))} />
                      {event.resource.is_confirmed_by_client && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    {event.resource.service_type && (
                      <Badge variant="outline" className="text-[10px] h-5">{event.resource.service_type}</Badge>
                    )}
                    {event.resource.clients && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.resource.clients.first_name} {event.resource.clients.last_name}
                      </p>
                    )}
                    {event.resource.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.resource.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Swipe hint */}
      <p className="text-[10px] text-muted-foreground text-center">
        ← Wischen für vorherigen / nächsten Tag →
      </p>
    </div>
  );
}

// --- Main Calendar Component ---
const Kalender = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { colorMap: presetColors } = useServicePresets();
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [preselectedHorseId, setPreselectedHorseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [icalToken, setIcalToken] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

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

  // Show stats on desktop by default
  useEffect(() => {
    if (!isMobile) setShowStats(true);
  }, [isMobile]);

  // Fetch appointments
  const dateRange = useMemo(() => {
    const start = format(subMonths(currentDate, 3), "yyyy-MM-dd");
    const end = format(addMonths(currentDate, 3), "yyyy-MM-dd");
    return { start, end };
  }, [currentDate]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!user?.id) return [];
      const { fetchAppointmentsByDateRange } = await import("@/services/appointmentService");
      return fetchAppointmentsByDateRange(user.id, dateRange.start, dateRange.end);
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

  // Neukundentage aus business_settings laden
  const { data: newClientDays = [1, 6] } = useQuery<number[]>({
    queryKey: ["new-client-days", user?.id],
    queryFn: async () => {
      if (!user?.id) return [1, 6];
      const { data } = await supabase
        .from("business_settings")
        .select("new_client_days")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.new_client_days as number[] | null) ?? [1, 6];
    },
    enabled: !!user?.id,
  });

  const serviceTypes = useMemo(() => {
    const types = new Set(appointments.map((a: any) => a.service_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt: any) => {
      if (filters.status !== "all" && apt.status !== filters.status) return false;
      if (filters.serviceType !== "all" && apt.service_type !== filters.serviceType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const horseName = apt.horses?.name?.toLowerCase() || "";
        const clientName = apt.contacts?.full_name?.toLowerCase() || "";
        const location = apt.location?.toLowerCase() || "";
        if (!horseName.includes(q) && !clientName.includes(q) && !location.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, filters]);

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
    const presetHex = presetColors[serviceType];
    const fallback = FALLBACK_COLORS[serviceType] || FALLBACK_COLORS.Kontrolle;
    const bgColor = presetHex || fallback.bg;
    const borderColor = presetHex ? presetHex : fallback.border;
    const isConfirmed = event.resource.is_confirmed_by_client;
    const isSelected = selectedIds.includes(event.id);

    return {
      style: {
        backgroundColor: bgColor,
        borderColor: isSelected ? "hsl(var(--primary))" : borderColor,
        borderWidth: isSelected ? "3px" : "2px",
        borderStyle: isConfirmed ? "solid" : "dashed",
        color: "white",
        borderRadius: "6px",
        opacity: event.resource.status === "cancelled" ? 0.5 : 1,
        boxShadow: isSelected ? "0 0 0 2px hsl(var(--primary) / 0.3)" : undefined,
      },
    };
  }, [selectedIds, presetColors]);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    setSelectedDate(slotInfo.start);
    setPreselectedHorseId(null);
    setIsFormOpen(true);
  }, []);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent, e: React.SyntheticEvent) => {
      const nativeEvent = e.nativeEvent as MouseEvent;
      if (nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey) {
        setSelectedIds((prev) =>
          prev.includes(event.id) ? prev.filter((id) => id !== event.id) : [...prev, event.id]
        );
        return;
      }
      setDetailEvent(event);
      setDetailOpen(true);
    },
    []
  );

  const handleMobileSelectEvent = useCallback((event: CalendarEvent) => {
    setDetailEvent(event);
    setDetailOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEvent; start: Date }) => {
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
    setSelectedDate(currentDate);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Kalender <HelpTip id="kalender.bereich" /></h1>
          <p className="text-sm text-muted-foreground">
            {filteredAppointments.length}
            {filteredAppointments.length !== appointments.length
              ? ` von ${appointments.length}`
              : ""}{" "}
            Termine
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats((p) => !p)}
              className={cn("gap-1.5", showStats && "bg-accent")}
            >
              <BarChart3 className="h-4 w-4" />
              Statistik
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsSyncModalOpen(true)}>
            <Smartphone className="h-4 w-4 mr-1.5" />
            Sync
          </Button>
          <Button size="sm" onClick={handleCreateNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {isMobile ? "Neu" : "Neuer Termin"}
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
      {selectedIds.length > 0 && (
        <Suspense fallback={null}>
          <BulkActionsBar
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
            appointments={appointments}
          />
        </Suspense>
      )}

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
          {isMobile ? (
            /* Mobile: Day list view with swipe */
            <Card>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <MobileDayList
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleMobileSelectEvent}
                    onDateChange={setCurrentDate}
                    onCreateNew={handleCreateNew}
                    presetColors={presetColors}
                    newClientDays={newClientDays}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* Desktop: react-big-calendar with DnD */
            <div className={cn("flex gap-4", showStats ? "flex-col lg:flex-row" : "")}>
              <Card className="flex-1 min-w-0">
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[500px]">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="h-[700px]">
                      <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                        <DesktopBigCalendarView
                          events={events}
                          currentView={currentView}
                          onView={setCurrentView}
                          currentDate={currentDate}
                          onNavigate={setCurrentDate}
                          onSelectSlot={handleSelectSlot}
                          onSelectEvent={handleSelectEvent}
                          onEventDrop={handleEventDrop}
                          eventStyleGetter={eventStyleGetter}
                          onAssign={handleAssignFromSheet}
                          newClientDays={newClientDays}
                        />
                      </Suspense>
                    </div>
                  )}
                </CardContent>
              </Card>

              {showStats && (
                <div className="w-full lg:w-[260px] shrink-0">
                  <Suspense fallback={null}>
                    <CalendarWeekStats appointments={appointments} currentDate={currentDate} />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <Suspense fallback={<Card><CardContent className="py-10 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>}>
            <TourMapView
              appointments={appointmentsForMap as any}
              selectedDate={currentDate}
              isLoading={isLoading}
            />
          </Suspense>
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
      {detailOpen && (
        <Suspense fallback={null}>
          <AppointmentDetailSheet
            appointment={detailEvent}
            isOpen={detailOpen}
            onClose={() => {
              setDetailOpen(false);
              setDetailEvent(null);
            }}
            onAssign={handleAssignFromSheet}
          />
        </Suspense>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Sync Modal */}
      {isSyncModalOpen && (
        <Suspense fallback={null}>
          <CalendarSyncModal
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
            icalToken={icalToken}
          />
        </Suspense>
      )}

      {/* Assign Employee Modal */}
      {assignAppointmentId && (
        <Suspense fallback={null}>
          <AssignEmployeeModal
            open={assignModalOpen}
            onOpenChange={setAssignModalOpen}
            appointmentId={assignAppointmentId}
            appointmentInfo={assignAppointmentInfo}
          />
        </Suspense>
      )}

      {/* Bulk selection hint - desktop only */}
      {!isMobile && selectedIds.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Tipp: Halte <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift</kbd> gedrückt und klicke Termine, um mehrere auszuwählen.
        </p>
      )}
    </div>
  );
};

export default Kalender;
