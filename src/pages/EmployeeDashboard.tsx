import { useState } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardWelcomeHeader } from "@/components/dashboard/DashboardWelcomeHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { EmployeeDocumentationForm } from "@/components/team/EmployeeDocumentationForm";
import { EmployeeAvailabilityManager } from "@/components/team/EmployeeAvailabilityManager";
import { EmployeeOnboarding } from "@/components/employee/EmployeeOnboarding";
import { EmployeeRoleGate } from "@/components/employee/EmployeeRoleGate";
import {
  MapPin, Clock, CheckCircle, Play, Square, Camera, FileText,
  ChevronRight, Calendar, User, Briefcase, Route, Package, CalendarOff, Timer,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, differenceInMinutes, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";

const EmployeeDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();
  const [docAssignment, setDocAssignment] = useState<any>(null);

  // Fetch today's assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["my-assignments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          appointment:appointments(
            id, date, time, status, location, notes,
            horse:horses(id, name),
            client:profiles!appointments_client_id_fkey(id, full_name, phone)
          )
        `)
        .eq("employee_id", profile?.id)
        .in("status", ["pending", "en_route", "checked_in", "working"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profile?.id,
  });

  // Completed assignments count (lifetime)
  const { data: completedTotal = 0 } = useQuery({
    queryKey: ["employee-completed-total", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from("employee_assignments")
        .select("*", { count: "exact", head: true })
        .eq("employee_id", profile.id)
        .eq("status", "checked_out");
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  // Active time record
  const { data: activeTimeRecord } = useQuery({
    queryKey: ["employee-active-time-dash", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from("employee_time_records")
        .select("start_time, break_minutes")
        .eq("employee_id", profile.id)
        .is("end_time", null)
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  // Week time records
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const { data: weekRecords = [] } = useQuery({
    queryKey: ["employee-week-time-dash", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("employee_time_records")
        .select("date, start_time, end_time, break_minutes")
        .eq("employee_id", profile.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .is("deleted_at", null)
        .not("end_time", "is", null);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Material count
  const { data: materialCount = 0 } = useQuery({
    queryKey: ["employee-material-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from("employee_material_assignments")
        .select("*", { count: "exact", head: true })
        .eq("employee_id", profile.id);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  // Pending absence requests
  const { data: pendingAbsences = 0 } = useQuery({
    queryKey: ["employee-pending-absences", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from("employee_absence_requests")
        .select("*", { count: "exact", head: true })
        .eq("employee_id", profile.id)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  // Check-in/out mutations
  const checkIn = useMutation({
    mutationFn: async (assignmentId: string) => {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
      const { error } = await supabase
        .from("employee_assignments")
        .update({ status: "checked_in", check_in_time: new Date().toISOString(), check_in_location_lat: lat, check_in_location_lng: lng })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: "Eingecheckt", description: "Du bist jetzt vor Ort eingetragen." });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const checkOut = useMutation({
    mutationFn: async (assignmentId: string) => {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
      const { error } = await supabase
        .from("employee_assignments")
        .update({ status: "checked_out", check_out_time: new Date().toISOString(), check_out_location_lat: lat, check_out_location_lng: lng })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: "Ausgecheckt", description: "Arbeit abgeschlossen." });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  // Compute work hours
  const weekTotalMins = weekRecords.reduce((sum, r: any) => {
    if (!r.end_time) return sum;
    return sum + differenceInMinutes(parseISO(r.end_time), parseISO(r.start_time)) - (r.break_minutes || 0);
  }, 0);

  const todayMins = activeTimeRecord
    ? differenceInMinutes(new Date(), parseISO(activeTimeRecord.start_time)) - (activeTimeRecord.break_minutes || 0)
    : 0;

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (profileLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Kein Mitarbeiterprofil</h2>
            <p className="text-muted-foreground mb-4">Dein Konto ist nicht als Mitarbeiter registriert.</p>
            <Button variant="outline" onClick={() => signOut()}>Abmelden</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="space-y-4 animate-fade-in">
      <DashboardWelcomeHeader
        fullName={profile.full_name}
        readableId={profile.id ? `EID-${profile.id.substring(0, 6).toUpperCase()}` : undefined}
        subtitle={format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
      />

      {/* Onboarding */}
      <EmployeeOnboarding />

      {/* Quick Tour Link */}
      <Link to="/employee/tour">
        <Card className="bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Meine Tour</p>
                <p className="text-xs text-muted-foreground">Tagesroute mit Navigation</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Briefcase className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{assignments?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Aufträge heute</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{assignments?.filter((a) => a.status === "checked_out").length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Erledigt heute</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{assignments?.filter((a) => ["checked_in", "working"].includes(a.status)).length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Aktiv</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Timer className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{activeTimeRecord ? `${Math.floor(todayMins / 60)}h` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">Stunden heute</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{Math.floor(weekTotalMins / 60)}h {weekTotalMins % 60}m</p>
            <p className="text-[10px] text-muted-foreground">Diese Woche</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{completedTotal}</p>
            <p className="text-[10px] text-muted-foreground">Pferde gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{materialCount}</p>
            <p className="text-[10px] text-muted-foreground">Materialien</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CalendarOff className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{pendingAbsences}</p>
            <p className="text-[10px] text-muted-foreground">Offene Anträge</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini Weekly Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Meine Woche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
              // Count assignments for this day (simplified)
              const dayAssignments = assignments?.filter(
                (a) => a.appointment?.date === dayStr
              ) || [];
              const doneCount = dayAssignments.filter((a) => a.status === "checked_out").length;
              const openCount = dayAssignments.length - doneCount;

              return (
                <div
                  key={dayStr}
                  className={`text-center p-1.5 rounded-lg text-xs ${isToday ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}
                >
                  <p className="font-medium">{format(day, "EE", { locale: de })}</p>
                  <p className={`text-[10px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {format(day, "dd")}
                  </p>
                  {(doneCount > 0 || openCount > 0) && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {doneCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      {openCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Heutige Aufträge</CardTitle>
          <CardDescription>Deine zugewiesenen Termine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignmentsLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : !assignments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Keine Aufträge heute</p>
              <p className="text-sm">Du hast aktuell keine zugewiesenen Termine.</p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const isActive = assignment.status === "checked_in" || assignment.status === "working";
              const isPending = assignment.status === "pending" || assignment.status === "en_route";
              const role = profile?.role || "employee";

              return (
                <div
                  key={assignment.id}
                  className={`p-4 rounded-lg border ${isActive ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{assignment.appointment?.horse?.name || "Unbekanntes Pferd"}</h3>
                      <p className="text-sm text-muted-foreground">{assignment.appointment?.client?.full_name}</p>
                    </div>
                    <Badge variant={isActive ? "default" : isPending ? "secondary" : "outline"}>
                      {assignment.status === "pending" ? "Anstehend" : assignment.status === "en_route" ? "Unterwegs" : assignment.status === "checked_in" ? "Vor Ort" : assignment.status === "working" ? "Arbeitet" : assignment.status}
                    </Badge>
                  </div>

                  {assignment.appointment?.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{assignment.appointment.location}</span>
                    </div>
                  )}
                  {assignment.appointment?.time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Clock className="h-4 w-4" />
                      <span>{assignment.appointment.time} Uhr</span>
                    </div>
                  )}
                  {assignment.instructions && (
                    <div className="p-2 rounded bg-muted/50 text-sm mb-3">
                      <p className="font-medium text-xs mb-1">Anweisungen:</p>
                      <p className="text-muted-foreground">{assignment.instructions}</p>
                    </div>
                  )}

                  {/* Action Buttons — restricted for 'view' role */}
                  {role === "view" ? (
                    <p className="text-xs text-muted-foreground italic">Nur Ansichtsmodus — Check-in nicht verfügbar.</p>
                  ) : (
                    <div className="flex gap-2">
                      {isPending && (
                        <Button className="flex-1" onClick={() => checkIn.mutate(assignment.id)} disabled={checkIn.isPending}>
                          <Play className="h-4 w-4 mr-2" />Einchecken
                        </Button>
                      )}
                      {isActive && (
                        <>
                          <Button variant="outline" className="flex-1" onClick={() => setDocAssignment(assignment)}>
                            <FileText className="h-4 w-4 mr-2" />Doku
                          </Button>
                          <Button variant="default" onClick={() => checkOut.mutate(assignment.id)} disabled={checkOut.isPending}>
                            <Square className="h-4 w-4 mr-2" />Fertig
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Availability */}
      {profile && (
        <Card>
          <CardContent className="pt-6">
            <EmployeeAvailabilityManager employeeId={profile.id} providerId={profile.provider_id} isEmployeeView />
          </CardContent>
        </Card>
      )}

      {/* Documentation Form */}
      {docAssignment && profile && (
        <EmployeeDocumentationForm
          open={!!docAssignment}
          onOpenChange={(open) => !open && setDocAssignment(null)}
          assignmentId={docAssignment.id}
          providerId={profile.provider_id}
          employeeId={profile.id}
          appointmentInfo={{
            horseName: docAssignment.appointment?.horse?.name,
            clientName: docAssignment.appointment?.client?.full_name,
          }}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
