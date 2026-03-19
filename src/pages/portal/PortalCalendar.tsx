import { useState, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useOrganizationBySlug, useOrgMembership } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin,
  Plus, Loader2,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PortalCalendar() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: membership, isLoading: memLoading } = useOrgMembership(org?.id);
  const isMobile = useIsMobile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Swipe
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

  if (authLoading || orgLoading || memLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!org || !membership) return <Navigate to="/auth" replace />;

  const basePath = `/portal/${slug}`;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Mobile: Day-strip for the current week
  const mobileWeekStart = startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 });
  const mobileWeekDays = eachDayOfInterval({
    start: mobileWeekStart,
    end: endOfWeek(mobileWeekStart, { weekStartsOn: 1 }),
  });

  return (
    <div className="flex min-h-screen bg-background">
      {!isMobile && <PortalSidebar org={org} basePath={basePath} />}
      <main className="flex-1 p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Kalender
          </h1>
          <Button size={isMobile ? "sm" : "default"} className="gap-1.5">
            <Plus className="h-4 w-4" /> {isMobile ? "Neu" : "Neuer Termin"}
          </Button>
        </div>

        {isMobile ? (
          /* ─── Mobile: Day Strip + Event List ─── */
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="space-y-3">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button className="font-semibold text-sm" onClick={() => setCurrentMonth(new Date())}>
                {format(currentMonth, "MMMM yyyy", { locale: de })}
              </button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day strip */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
              {mobileWeekDays.map((day) => {
                const isActive = selectedDate && isSameDay(day, selectedDate);
                const isTodayDay = isToday(day);
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
                  </button>
                );
              })}
            </div>

            {/* Selected day */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {selectedDate ? format(selectedDate, "EEEE, d. MMMM", { locale: de }) : "Tag auswählen"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
                  <p className="text-xs text-muted-foreground mt-1">Termine werden hier angezeigt, sobald sie erstellt werden.</p>
                </div>
              </CardContent>
            </Card>
            <p className="text-[10px] text-muted-foreground text-center">← Wischen für Monatswechsel →</p>
          </div>
        ) : (
          /* ─── Desktop: Month grid ─── */
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy", { locale: de })}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <div className="grid grid-cols-7 gap-px">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                  {days.map(day => {
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
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day detail */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDate ? format(selectedDate, "EEEE, dd. MMMM", { locale: de }) : "Tag auswählen"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Klicke auf einen Tag im Kalender</p>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                      <Plus className="h-3 w-3" /> Termin erstellen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
