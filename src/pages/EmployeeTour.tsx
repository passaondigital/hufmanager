import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Clock,
  Navigation,
  ChevronRight,
  CheckCircle,
  Play,
  Square,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";

const statusLabels: Record<string, string> = {
  pending: "Anstehend",
  en_route: "Unterwegs",
  checked_in: "Vor Ort",
  working: "Arbeitet",
  checked_out: "Erledigt",
  completed: "Abgeschlossen",
};

const EmployeeTour = () => {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["my-tour-assignments", user?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const today = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          appointment:appointments(
            id, date, time, status, location, notes, tour_order,
            horse:horses(id, name),
            client:profiles!appointments_client_id_fkey(id, full_name, phone)
          )
        `)
        .eq("employee_id", profile.id)
        .in("status", ["pending", "en_route", "checked_in", "working", "checked_out"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Sort by tour_order if available, otherwise by time
      return (data || []).sort((a, b) => {
        const orderA = a.appointment?.tour_order ?? 999;
        const orderB = b.appointment?.tour_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.appointment?.time || "").localeCompare(b.appointment?.time || "");
      });
    },
    enabled: !!profile?.id,
  });

  const openNavigation = (location: string) => {
    const encoded = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
  };

  const completed = assignments?.filter((a) => a.status === "checked_out" || a.status === "completed") || [];
  const remaining = assignments?.filter((a) => a.status !== "checked_out" && a.status !== "completed") || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/employee">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Meine Tour</h1>
              <p className="text-sm opacity-80">
                {format(new Date(), "EEEE, d. MMMM", { locale: de })} • {remaining.length} offen
              </p>
            </div>
          </div>
          {/* Progress bar */}
          {assignments && assignments.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1 opacity-80">
                <span>{completed.length} erledigt</span>
                <span>{assignments.length} gesamt</span>
              </div>
              <div className="h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-foreground/80 rounded-full transition-all"
                  style={{ width: `${(completed.length / assignments.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tour Stops */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {remaining.length === 0 && completed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Navigation className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Keine Stops heute</p>
            <p className="text-sm">Du hast aktuell keine zugewiesenen Tour-Stops.</p>
          </div>
        ) : (
          <>
            {/* Remaining stops */}
            {remaining.map((assignment, index) => {
              const isActive = assignment.status === "checked_in" || assignment.status === "working";
              return (
                <Card key={assignment.id} className={isActive ? "border-primary bg-primary/5" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Stop number */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">
                            {assignment.appointment?.horse?.name || "Unbekannt"}
                          </h3>
                          <Badge variant={isActive ? "default" : "secondary"} className="text-xs ml-2">
                            {statusLabels[assignment.status] || assignment.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {assignment.appointment?.client?.full_name}
                        </p>

                        {assignment.appointment?.time && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{assignment.appointment.time} Uhr</span>
                          </div>
                        )}

                        {assignment.appointment?.location && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{assignment.appointment.location}</span>
                          </div>
                        )}

                        {/* Navigation button */}
                        {assignment.appointment?.location && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => openNavigation(assignment.appointment!.location!)}
                          >
                            <Navigation className="h-4 w-4 mr-1.5" />
                            Navigieren
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Completed stops */}
            {completed.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Erledigt ({completed.length})
                </p>
                {completed.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-2"
                  >
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignment.appointment?.horse?.name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.appointment?.client?.full_name}
                      </p>
                    </div>
                    {assignment.check_out_time && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(assignment.check_out_time), "HH:mm")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeTour;
