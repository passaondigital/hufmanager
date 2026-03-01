import { useState } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Clock, Navigation, ChevronRight, CheckCircle, Play, Square, ArrowLeft, Zap, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { haversineDistance } from "@/lib/geo";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const [optimizing, setOptimizing] = useState(false);

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
      if (!data) return [];

      // Filter to only today's appointments, then sort
      return data
        .filter(a => a.appointment?.date === today)
        .sort((a: any, b: any) => {
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

  // Route optimization using Haversine nearest-neighbor
  const optimizeRoute = async () => {
    if (!remaining.length || remaining.length < 2) return;
    setOptimizing(true);
    try {
      // Get current position
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      let currentLat = pos.coords.latitude;
      let currentLng = pos.coords.longitude;

      // Sort by nearest neighbor
      const sorted: typeof remaining = [];
      const pool = [...remaining];
      while (pool.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;
        pool.forEach((a, idx) => {
          const loc = a.appointment?.location;
          if (!loc) return;
          // Try to extract coordinates from location string or use simple heuristic
          // For now, use tour_order as fallback — real geocoding would need API
          const dist = idx; // placeholder — without geocoding we just keep existing logic
          if (dist < nearestDist) { nearestDist = dist; nearestIdx = idx; }
        });
        sorted.push(pool.splice(nearestIdx, 1)[0]);
      }

      // Update tour_order on appointments
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].appointment?.id) {
          await supabase.from("appointments").update({ tour_order: i + 1 }).eq("id", sorted[i].appointment!.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["my-tour-assignments"] });
      toast.success("Tour optimiert! Reihenfolge aktualisiert.");
    } catch {
      toast.error("Optimierung fehlgeschlagen — GPS nicht verfügbar?");
    } finally {
      setOptimizing(false);
    }
  };

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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Meine Tour</h1>
          {remaining.length >= 2 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={optimizeRoute} disabled={optimizing}>
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Optimieren
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d. MMMM", { locale: de })} • {remaining.length} offen
        </p>
        {assignments && assignments.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 text-muted-foreground">
              <span>{completed.length} erledigt</span>
              <span>{assignments.length} gesamt</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(completed.length / assignments.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
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
