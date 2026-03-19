import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Loader2,
  Check, X as XIcon, ArrowLeftRight, Save, CalendarClock, StickyNote, Trash2,
  CalendarDays, CheckCircle2,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addDays,
  addWeeks, subWeeks,
} from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; emoji: string }> = {
  planned: { label: "Geplant", variant: "secondary", emoji: "🟡" },
  requested: { label: "Angefragt", variant: "outline", emoji: "📩" },
  confirmed: { label: "Bestätigt", variant: "default", emoji: "✔️" },
  completed: { label: "Erledigt", variant: "secondary", emoji: "✅" },
  cancelled: { label: "Storniert", variant: "destructive", emoji: "❌" },
  no_show: { label: "Nicht erschienen", variant: "destructive", emoji: "⚫" },
};

export default function PartnerCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"week" | "month">(isMobile ? "week" : "month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [newApt, setNewApt] = useState({
    title: "", horse_id: "", appointment_date: "", appointment_time: "",
    duration: "60", notes: "", location: "", price: "",
  });

  // Swipe handling for mobile month navigation
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setCurrentMonth(subMonths(currentMonth, 1));
      else setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["partner-calendar", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_appointments")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .gte("appointment_date", format(calStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(calEnd, "yyyy-MM-dd"))
        .order("appointment_date")
        .order("appointment_time");
      if (error) throw error;
      return (data || []).map((a: any) => ({ ...a, _source: "partner" as const }));
    },
    enabled: !!user,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["partner-horses-for-calendar", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((d: any) => d.horses).filter(Boolean);
    },
    enabled: !!user,
  });

  const { data: providerAppointments = [] } = useQuery({
    queryKey: ["partner-provider-appointments", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const horseIds = horses.map((h: any) => h.id);
      if (horseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, status, horse_id, service_type, horses:horse_id (name), profiles:provider_id (full_name)")
        .in("horse_id", horseIds)
        .gte("date", format(calStart, "yyyy-MM-dd"))
        .lte("date", format(calEnd, "yyyy-MM-dd"))
        .in("status", ["planned", "confirmed", "completed"])
        .order("date")
        .order("time");
      if (error) return [];
      return (data || []).map((a: any) => ({
        id: a.id,
        appointment_date: a.date,
        appointment_time: a.time,
        title: `Hufpflege — ${(a.profiles as any)?.full_name || "Hufbearbeiter"}`,
        horses: a.horses,
        status: a.status,
        _source: "provider" as const,
      }));
    },
    enabled: !!user && horses.length > 0,
  });

  const allAppointments = [...appointments, ...providerAppointments];

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_appointments").insert({
        partner_id: user!.id,
        horse_id: newApt.horse_id,
        title: newApt.title,
        appointment_date: newApt.appointment_date,
        appointment_time: newApt.appointment_time || null,
        duration: newApt.duration ? parseInt(newApt.duration) : null,
        notes: newApt.notes || null,
        location: newApt.location || null,
        price: newApt.price ? parseFloat(newApt.price) : null,
        status: "planned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termin erstellt");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["partner-upcoming-appointments"] });
      setCreateOpen(false);
      setNewApt({ title: "", horse_id: "", appointment_date: "", appointment_time: "", duration: "60", notes: "", location: "", price: "" });
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
      const { error } = await supabase.from("partner_appointments").update(updates).eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status aktualisiert");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
      setDetailApt(null);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      const { error } = await supabase
        .from("partner_appointments")
        .update({ appointment_date: date, appointment_time: time })
        .eq("id", id)
        .eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termin verschoben");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
      setIsRescheduling(false);
      setDetailApt(null);
    },
    onError: () => toast.error("Fehler beim Verschieben"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_appointments").delete().eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Termin gelöscht");
      queryClient.invalidateQueries({ queryKey: ["partner-calendar"] });
      setDetailApt(null);
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const getAppointmentsForDay = (day: Date) =>
    allAppointments.filter((a: any) => isSameDay(new Date(a.appointment_date), day));

  const selectedDayAppts = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const handleCreateClick = () => {
    setNewApt(prev => ({
      ...prev,
      appointment_date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    }));
    setCreateOpen(true);
  };

  const handleOpenDetail = (apt: any) => {
    if (apt._source === "provider") return; // Can't edit provider appointments
    setDetailApt(apt);
    setIsRescheduling(false);
  };

  const handleStartReschedule = () => {
    if (!detailApt) return;
    setRescheduleDate(detailApt.appointment_date);
    setRescheduleTime(detailApt.appointment_time?.slice(0, 5) || "09:00");
    setIsRescheduling(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-32" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // Week view helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const navigateView = (dir: number) => {
    if (view === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentMonth(dir > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const getStatusIndicator = (status: string | null) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "confirmed": return "bg-blue-500";
      case "cancelled": return "bg-destructive";
      default: return "bg-yellow-500";
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header — identisch wie Provider */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Kalender <HelpTip id="partner.kalender" />
        </h1>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs px-3">Woche</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">Monat</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleCreateClick} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {isMobile ? "Neu" : "Neuer Termin"}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary" /> Meine Termine</div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Hufpflege-Termine</div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateView(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button className="font-semibold text-sm" onClick={() => { setCurrentDate(new Date()); setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
          {view === "week"
            ? `${format(weekStart, "d. MMM", { locale: de })} – ${format(weekEnd, "d. MMM yyyy", { locale: de })}`
            : format(currentMonth, "MMMM yyyy", { locale: de })}
        </button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateView(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── WEEK VIEW: Mobile Day-Strip + Events List (identisch wie Provider) ─── */}
      {view === "week" && isMobile && (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="space-y-3">
          {/* Day strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {weekDays.map((day) => {
              const isActive = selectedDate && isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const hasEvents = allAppointments.some((a: any) => isSameDay(new Date(a.appointment_date), day));
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center min-w-[48px] py-2 px-2 rounded-xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isTodayDay
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-[10px] uppercase font-medium">{format(day, "EE", { locale: de })}</span>
                  <span className={cn("text-lg font-bold", isActive ? "" : "text-foreground")}>{format(day, "d")}</span>
                  {hasEvents && !isActive && <div className="h-1 w-1 rounded-full bg-primary mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Events list for selected day */}
          {selectedDate && (
            <>
              {selectedDayAppts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
                  <Button size="sm" variant="outline" onClick={handleCreateClick} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Termin erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayAppts.map((apt: any) => {
                    const statusInfo = STATUS_LABELS[apt.status] || STATUS_LABELS.planned;
                    const isProvider = apt._source === "provider";
                    return (
                      <button
                        key={apt.id}
                        onClick={() => handleOpenDetail(apt)}
                        className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          {/* Time block */}
                          <div className="flex flex-col items-center min-w-[48px] shrink-0">
                            <span className="text-lg font-bold text-foreground">{apt.appointment_time?.slice(0, 5) || "–"}</span>
                            <span className="text-[10px] text-muted-foreground">{apt.duration || 60} Min.</span>
                          </div>

                          {/* Color bar */}
                          <div className={cn("w-1 self-stretch rounded-full shrink-0", isProvider ? "bg-amber-500" : "bg-primary")} />

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground truncate">{apt.title || apt.horses?.name}</p>
                              <div className={cn("h-2 w-2 rounded-full shrink-0", getStatusIndicator(apt.status))} />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">🐴 {apt.horses?.name}</p>
                            {apt.location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{apt.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <p className="text-[10px] text-muted-foreground text-center">← Wischen für Wochenwechsel →</p>
        </div>
      )}

      {/* ─── WEEK VIEW: Desktop (same compact list per day) ─── */}
      {view === "week" && !isMobile && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayAppts = getAppointmentsForDay(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDay = isToday(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg min-h-[120px] transition-colors text-left",
                        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50",
                        isTodayDay && "bg-primary/10"
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">{format(day, "EE", { locale: de })}</span>
                      <span className={cn("text-lg font-bold mb-2", isTodayDay ? "text-primary" : "text-foreground")}>{format(day, "d")}</span>
                      {dayAppts.slice(0, 3).map((a: any) => (
                        <div key={a.id} className={cn("w-full text-[9px] rounded px-1 py-0.5 mb-0.5 truncate",
                          a._source === "provider" ? "bg-amber-500/15 text-amber-700" : "bg-primary/10 text-primary"
                        )}>
                          {a.appointment_time?.slice(0, 5)} {a.horses?.name}
                        </div>
                      ))}
                      {dayAppts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayAppts.length - 3}</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day Detail sidebar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, dd. MMMM", { locale: de }) : "Tag auswählen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">Klicke auf einen Tag</p>
              ) : selectedDayAppts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Keine Termine</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleCreateClick}>
                    <Plus className="h-3 w-3 mr-1" /> Termin erstellen
                  </Button>
                </div>
              ) : (
                selectedDayAppts.map((apt: any) => {
                  const statusInfo = STATUS_LABELS[apt.status] || STATUS_LABELS.planned;
                  const isProvider = apt._source === "provider";
                  return (
                    <button
                      key={apt.id}
                      onClick={() => handleOpenDetail(apt)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border space-y-2 transition-colors",
                        isProvider ? "border-amber-500/30 bg-amber-500/5 cursor-default" : "border-border hover:bg-muted/50 active:scale-[0.98]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{apt.title}</p>
                          <p className="text-xs text-muted-foreground">🐴 {apt.horses?.name}</p>
                        </div>
                        <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.emoji} {statusInfo.label}</Badge>
                      </div>
                      {apt.appointment_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {apt.appointment_time.substring(0, 5)} {apt.duration && `· ${apt.duration} Min.`}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── MONTH VIEW (existing, refined) ─── */}
      {view === "month" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <CardContent className="px-2 pb-3 pt-3">
              <div className="grid grid-cols-7 gap-px">
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {days.map(day => {
                  const dayAppts = getAppointmentsForDay(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative p-1.5 min-h-[56px] md:min-h-[72px] text-sm rounded-lg transition-colors text-left",
                        !isSameMonth(day, currentMonth) ? "text-muted-foreground/40" : "text-foreground",
                        isToday(day) ? "bg-primary/10 font-bold" : "",
                        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xs">{format(day, "d")}</span>
                      {dayAppts.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap">
                          {dayAppts.slice(0, 3).map((a: any) => (
                            <div
                              key={a.id}
                              className={cn("h-1.5 w-1.5 rounded-full",
                                a._source === "provider"
                                  ? "bg-amber-500"
                                  : a.status === "completed" ? "bg-muted-foreground" : a.status === "confirmed" ? "bg-primary" : "bg-primary/50"
                              )}
                            />
                          ))}
                          {dayAppts.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayAppts.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {isMobile && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">← Wischen für Monatswechsel →</p>
              )}
            </CardContent>
          </Card>

          {/* Day Detail sidebar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, dd. MMMM", { locale: de }) : "Tag auswählen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">Klicke auf einen Tag im Kalender</p>
              ) : selectedDayAppts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleCreateClick}>
                    <Plus className="h-3 w-3 mr-1" /> Termin erstellen
                  </Button>
                </div>
              ) : (
                selectedDayAppts.map((apt: any) => {
                  const statusInfo = STATUS_LABELS[apt.status] || STATUS_LABELS.planned;
                  const isProvider = apt._source === "provider";
                  return (
                    <button
                      key={apt.id}
                      onClick={() => handleOpenDetail(apt)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border space-y-2 transition-colors",
                        isProvider ? "border-amber-500/30 bg-amber-500/5 cursor-default" : "border-border hover:bg-muted/50 active:scale-[0.98]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isProvider && <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />}
                            <p className="font-semibold text-sm text-foreground">{apt.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">🐴 {apt.horses?.name}</p>
                        </div>
                        <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.emoji} {statusInfo.label}</Badge>
                      </div>
                      {apt.appointment_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {apt.appointment_time.substring(0, 5)} {apt.duration && `· ${apt.duration} Min.`}
                        </div>
                      )}
                      {apt.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {apt.location}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Sheet (Partner appointments only) */}
      <Sheet open={!!detailApt} onOpenChange={(open) => { if (!open) { setDetailApt(null); setIsRescheduling(false); } }}>
        <SheetContent className="w-full sm:max-w-[400px] flex flex-col p-0">
          {detailApt && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4">
                <SheetTitle className="text-lg">🐴 {detailApt.horses?.name || "Termin"}</SheetTitle>
                <p className="text-sm text-muted-foreground">{detailApt.title}</p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                {/* Status pills */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_LABELS).map(([key, opt]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus.mutate({ id: detailApt.id, status: key })}
                        disabled={updateStatus.isPending}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 min-h-[40px]",
                          detailApt.status === key
                            ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{format(new Date(detailApt.appointment_date), "EEEE, d. MMMM yyyy", { locale: de })}</p>
                      <p className="text-xs text-muted-foreground">
                        {detailApt.appointment_time?.substring(0, 5) || "–"} · {detailApt.duration || 60} Min.
                      </p>
                    </div>
                  </div>
                  {detailApt.location && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm truncate">{detailApt.location}</span>
                    </div>
                  )}
                  {detailApt.notes && (
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                      <p className="text-sm whitespace-pre-wrap">{detailApt.notes}</p>
                    </div>
                  )}
                </div>

                {/* Reschedule panel */}
                {isRescheduling ? (
                  <>
                    <Separator />
                    <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-primary font-semibold">
                          <CalendarClock className="h-4 w-4" /> Termin verschieben
                        </Label>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRescheduling(false)}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Neues Datum</Label>
                          <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="h-12 text-base" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Neue Uhrzeit</Label>
                          <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="h-12 text-base" />
                        </div>
                      </div>
                      <Button className="w-full h-12 gap-2" onClick={() => rescheduleMutation.mutate({ id: detailApt.id, date: rescheduleDate, time: rescheduleTime })} disabled={rescheduleMutation.isPending}>
                        {rescheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Verschieben
                      </Button>
                    </div>
                  </>
                ) : null}

                <Separator />

                {/* Actions */}
                <div className="space-y-2 pb-4">
                  {!isRescheduling && (
                    <Button variant="outline" className="w-full justify-start gap-2 h-12" onClick={handleStartReschedule}>
                      <ArrowLeftRight className="h-4 w-4" /> Termin verschieben
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => deleteMutation.mutate(detailApt.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Termin löschen
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neuer Termin</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div><Label>Titel *</Label><Input value={newApt.title} onChange={e => setNewApt(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Osteopathie-Sitzung" required /></div>
            <div>
              <Label>Pferd *</Label>
              <Select value={newApt.horse_id} onValueChange={v => setNewApt(p => ({ ...p, horse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pferd auswählen" /></SelectTrigger>
                <SelectContent>
                  {horses.map((h: any) => (<SelectItem key={h.id} value={h.id}>🐴 {h.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Datum *</Label><Input type="date" value={newApt.appointment_date} onChange={e => setNewApt(p => ({ ...p, appointment_date: e.target.value }))} required className="h-12" /></div>
              <div><Label>Uhrzeit</Label><Input type="time" value={newApt.appointment_time} onChange={e => setNewApt(p => ({ ...p, appointment_time: e.target.value }))} className="h-12" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dauer (Min.)</Label><Input type="number" value={newApt.duration} onChange={e => setNewApt(p => ({ ...p, duration: e.target.value }))} /></div>
              <div><Label>Preis (€)</Label><Input type="number" step="0.01" value={newApt.price} onChange={e => setNewApt(p => ({ ...p, price: e.target.value }))} /></div>
            </div>
            <div><Label>Ort</Label><Input value={newApt.location} onChange={e => setNewApt(p => ({ ...p, location: e.target.value }))} placeholder="z.B. Stall Müller" /></div>
            <div><Label>Notizen</Label><Textarea value={newApt.notes} onChange={e => setNewApt(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={createMutation.isPending || !newApt.title || !newApt.horse_id || !newApt.appointment_date} className="gap-1.5">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
