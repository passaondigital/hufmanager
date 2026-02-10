import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DocumentationReviewSheet } from "./DocumentationReviewSheet";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  FileCheck,
  AlertCircle,
  ChevronRight,
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";

export function ProviderControlCenter() {
  const { user } = useAuth();
  const { employees, isLoading: employeesLoading } = useEmployees();
  const [reviewingDoc, setReviewingDoc] = useState<any>(null);

  // Fetch today's assignments
  const { data: todayAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["today-assignments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          employee:employee_profiles(id, full_name, avatar_url),
          appointment:appointments(
            id, date, time, status, location,
            horse:horses(id, name),
            client:profiles!appointments_client_id_fkey(id, full_name)
          )
        `)
        .eq("provider_id", user.id)
        .gte("created_at", today)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch pending documentation
  const { data: pendingDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["pending-documentation", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("employee_documentation")
        .select(`
          *,
          employee:employee_profiles(id, full_name),
          assignment:employee_assignments(
            id,
            appointment:appointments(
              id, date,
              horse:horses(id, name),
              client:profiles!appointments_client_id_fkey(id, full_name)
            )
          )
        `)
        .eq("provider_id", user.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const activeEmployees = employees.filter((e) => e.status === "active");
  const onVacation = employees.filter((e) => e.status === "vacation");
  const onSick = employees.filter((e) => e.status === "sick");

  const inProgressAssignments = todayAssignments?.filter(
    (a) => a.status === "checked_in" || a.status === "working"
  ) || [];

  const completedToday = todayAssignments?.filter(
    (a) => a.status === "completed" || a.status === "checked_out"
  ) || [];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const isLoading = employeesLoading || assignmentsLoading || docsLoading;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
                <p className="text-xs text-muted-foreground">Aktive Mitarbeiter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Briefcase className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Im Einsatz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <FileCheck className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingDocs?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Prüfung ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedToday.length}</p>
                <p className="text-xs text-muted-foreground">Heute erledigt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Employee Status Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Verfügbarkeit heute</CardTitle>
              <Link to="/team">
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Mitarbeiter</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.slice(0, 5).map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee.full_name}</p>
                    </div>
                    <Badge
                      variant={
                        employee.status === "active"
                          ? "default"
                          : employee.status === "vacation"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {employee.status === "active"
                        ? "Verfügbar"
                        : employee.status === "vacation"
                        ? "Urlaub"
                        : employee.status === "sick"
                        ? "Krank"
                        : employee.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Prüfung erforderlich</CardTitle>
                <CardDescription>Dokumentationen zur Freigabe</CardDescription>
              </div>
              {(pendingDocs?.length || 0) > 0 && (
                <Badge variant="destructive">{pendingDocs?.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !pendingDocs?.length ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Alles geprüft!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDocs.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <FileCheck className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.assignment?.appointment?.horse?.name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        von {doc.employee?.full_name}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setReviewingDoc(doc)}>
                      Prüfen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Aktive Einsätze</CardTitle>
              <CardDescription>Mitarbeiter, die gerade arbeiten</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : inProgressAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine aktiven Einsätze</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {inProgressAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={assignment.employee?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(assignment.employee?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{assignment.employee?.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {assignment.appointment?.horse?.name} •{" "}
                      {assignment.appointment?.client?.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={assignment.status === "working" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {assignment.status === "checked_in"
                          ? "Eingecheckt"
                          : assignment.status === "working"
                          ? "Arbeitet"
                          : assignment.status}
                      </Badge>
                      {assignment.check_in_time && (
                        <span className="text-xs text-muted-foreground">
                          seit{" "}
                          {format(new Date(assignment.check_in_time), "HH:mm", { locale: de })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Documentation Review Sheet */}
      {reviewingDoc && (
        <DocumentationReviewSheet
          open={!!reviewingDoc}
          onOpenChange={(open) => !open && setReviewingDoc(null)}
          documentation={reviewingDoc}
        />
      )}
    </div>
  );
}
