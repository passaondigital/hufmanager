import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Timer, Play, Square, Coffee, Loader2, Clock, Calendar, Download, Car,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, differenceInMinutes, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TimeRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  break_minutes: number;
  break_type: string | null;
  notes: string | null;
}

export function EmployeeTimeTracker() {
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [breakType, setBreakType] = useState<string>("standard");

  // Active record (no end_time)
  const { data: activeRecord, isLoading } = useQuery({
    queryKey: ["employee-active-time", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from("employee_time_records")
        .select("*")
        .eq("employee_id", profile.id)
        .is("end_time", null)
        .is("deleted_at", null)
        .maybeSingle();
      return data as TimeRecord | null;
    },
    enabled: !!profile?.id,
  });

  // This week's records
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: weekRecords = [] } = useQuery({
    queryKey: ["employee-week-time", profile?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("employee_time_records")
        .select("*")
        .eq("employee_id", profile.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .is("deleted_at", null)
        .order("date", { ascending: true });
      return (data || []) as TimeRecord[];
    },
    enabled: !!profile?.id,
  });

  const startShift = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const now = new Date();
      await supabase.from("employee_time_records").insert({
        employee_id: profile.id,
        provider_id: profile.provider_id,
        date: format(now, "yyyy-MM-dd"),
        start_time: now.toISOString(),
        break_minutes: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-active-time"] });
      queryClient.invalidateQueries({ queryKey: ["employee-week-time"] });
      toast({ title: "Schicht gestartet ⏱️" });
    },
  });

  const endShift = useMutation({
    mutationFn: async () => {
      if (!activeRecord) return;
      const now = new Date();
      await supabase
        .from("employee_time_records")
        .update({ end_time: now.toISOString() })
        .eq("id", activeRecord.id);
      return activeRecord;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["employee-active-time"] });
      queryClient.invalidateQueries({ queryKey: ["employee-week-time"] });
      if (record) {
        const start = new Date(record.start_time);
        const end = new Date();
        const totalMins = differenceInMinutes(end, start) - (record.break_minutes || 0);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        toast({ title: "Feierabend! 🎉", description: `Netto-Arbeitszeit: ${h}h ${m}m` });
      }
    },
  });

  const addBreak = useMutation({
    mutationFn: async (minutes: number) => {
      if (!activeRecord) return;
      const newBreak = (activeRecord.break_minutes || 0) + minutes;
      await supabase
        .from("employee_time_records")
        .update({ break_minutes: newBreak, break_type: breakType })
        .eq("id", activeRecord.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-active-time"] });
      toast({ title: "Pause erfasst ☕" });
    },
  });

  const exportCSV = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    supabase
      .from("employee_time_records")
      .select("*")
      .eq("employee_id", profile?.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd"))
      .is("deleted_at", null)
      .order("date")
      .then(({ data }) => {
        if (!data?.length) { toast({ title: "Keine Daten für diesen Monat" }); return; }
        const header = "Datum;Beginn;Ende;Pause (Min);Netto (Min);Notiz\n";
        const rows = data.map((r: TimeRecord) => {
          const start = r.start_time ? format(parseISO(r.start_time), "HH:mm") : "";
          const end = r.end_time ? format(parseISO(r.end_time), "HH:mm") : "";
          const net = r.end_time ? differenceInMinutes(parseISO(r.end_time), parseISO(r.start_time)) - (r.break_minutes || 0) : 0;
          return `${format(parseISO(r.date), "dd.MM.yyyy")};${start};${end};${r.break_minutes || 0};${net};${r.notes || ""}`;
        }).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Arbeitszeit_${format(monthStart, "yyyy-MM")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV exportiert 📥" });
      });
  };

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const DAILY_TARGET = 480; // 8h in minutes
  const DAILY_MAX = 600; // 10h in minutes (DE)

  // Calculate current shift duration for warnings
  const currentShiftMins = activeRecord
    ? differenceInMinutes(new Date(), parseISO(activeRecord.start_time)) - (activeRecord.break_minutes || 0)
    : 0;

  const getOvertimeWarning = () => {
    if (currentShiftMins >= 570) return { level: "critical", text: "⚠️ WARNUNG: Maximale Arbeitszeit fast erreicht (10h Limit DE)" };
    if (currentShiftMins >= 480) return { level: "warning", text: "Du arbeitest seit 8 Stunden — Überstunden beginnen" };
    if (currentShiftMins >= 360) return { level: "info", text: "Bitte mach eine Pause (gesetzlich vorgeschrieben nach 6h)" };
    return null;
  };

  const overtimeWarning = activeRecord ? getOvertimeWarning() : null;

  if (isLoading) {
    return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Overtime warning */}
      {overtimeWarning && (
        <div className={cn(
          "p-3 rounded-lg text-sm font-medium flex items-center gap-2",
          overtimeWarning.level === "critical" ? "bg-destructive/10 text-destructive border border-destructive/30" :
          overtimeWarning.level === "warning" ? "bg-amber-500/10 text-amber-700 border border-amber-500/30" :
          "bg-primary/10 text-primary border border-primary/30"
        )}>
          {overtimeWarning.text}
        </div>
      )}

      {/* Active shift or start button */}
      {activeRecord ? (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Aktive Schicht
              </CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/30">Läuft</Badge>
            </div>
            <CardDescription>
              Seit {format(parseISO(activeRecord.start_time), "HH:mm")} Uhr • {activeRecord.break_minutes || 0} Min. Pause
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Break buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setBreakType("standard"); addBreak.mutate(15); }}>
                <Coffee className="h-3.5 w-3.5" /> 15 Min
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setBreakType("lunch"); addBreak.mutate(30); }}>
                <Coffee className="h-3.5 w-3.5" /> 30 Min
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setBreakType("travel"); addBreak.mutate(15); }}>
                <Car className="h-3.5 w-3.5" /> Fahrt
              </Button>
            </div>
            <Button variant="destructive" className="w-full gap-2" onClick={() => endShift.mutate()} disabled={endShift.isPending}>
              {endShift.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Schicht beenden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Button className="w-full gap-2" size="lg" onClick={() => startShift.mutate()} disabled={startShift.isPending}>
              {startShift.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Schicht starten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weekly overview */}
      <Tabs defaultValue="week">
        <TabsList className="w-full">
          <TabsTrigger value="week" className="flex-1">Diese Woche</TabsTrigger>
          <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Wochenübersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {days.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const dayRecords = weekRecords.filter((r) => r.date === dayStr);
                  const totalMins = dayRecords.reduce((sum, r) => {
                    if (!r.end_time) return sum;
                    return sum + differenceInMinutes(parseISO(r.end_time), parseISO(r.start_time)) - (r.break_minutes || 0);
                  }, 0);
                  const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
                  const isOvertime = totalMins > DAILY_TARGET;

                  return (
                    <div key={dayStr} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isToday ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                      <span className={`font-medium ${isToday ? "text-primary" : ""}`}>
                        {format(day, "EEE dd.MM.", { locale: de })}
                      </span>
                      <div className="flex items-center gap-2">
                        {totalMins > 0 ? (
                          <>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={isOvertime ? "text-destructive font-semibold" : "text-primary font-medium"}>
                              {Math.floor(totalMins / 60)}h {totalMins % 60}m
                            </span>
                            {isOvertime && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Ü</Badge>}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Weekly total */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-semibold text-sm border-t mt-2">
                  <span>Gesamt</span>
                  <span>
                    {(() => {
                      const total = weekRecords.reduce((sum, r) => {
                        if (!r.end_time) return sum;
                        return sum + differenceInMinutes(parseISO(r.end_time), parseISO(r.start_time)) - (r.break_minutes || 0);
                      }, 0);
                      return `${Math.floor(total / 60)}h ${total % 60}m`;
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardContent className="p-4 text-center space-y-3">
              <Download className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Exportiere den aktuellen Monat als CSV-Datei für die Lohnabrechnung.
              </p>
              <Button variant="outline" className="gap-2" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                Monat exportieren (CSV)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
