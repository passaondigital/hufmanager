import { useState } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Clock,
  CheckCircle,
  Play,
  Square,
  Camera,
  FileText,
  ChevronRight,
  Navigation,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const EmployeeDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();

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

  // Check-in mutation
  const checkIn = useMutation({
    mutationFn: async (assignmentId: string) => {
      // Get current location if available
      let lat: number | null = null;
      let lng: number | null = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {
        console.log("Location not available");
      }

      const { error } = await supabase
        .from("employee_assignments")
        .update({
          status: "checked_in",
          check_in_time: new Date().toISOString(),
          check_in_location_lat: lat,
          check_in_location_lng: lng,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: "Eingecheckt", description: "Du bist jetzt vor Ort eingetragen." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  // Check-out mutation
  const checkOut = useMutation({
    mutationFn: async (assignmentId: string) => {
      let lat: number | null = null;
      let lng: number | null = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {
        console.log("Location not available");
      }

      const { error } = await supabase
        .from("employee_assignments")
        .update({
          status: "checked_out",
          check_out_time: new Date().toISOString(),
          check_out_location_lat: lat,
          check_out_location_lng: lng,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      toast({ title: "Ausgecheckt", description: "Arbeit abgeschlossen. Warte auf Freigabe." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Kein Mitarbeiterprofil</h2>
            <p className="text-muted-foreground mb-4">
              Dein Konto ist nicht als Mitarbeiter registriert.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-sm opacity-80">
                  {profile.role === "employee"
                    ? "Mitarbeiter"
                    : profile.role === "team_lead"
                    ? "Teamleiter"
                    : "Assistent"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => signOut()}
            >
              Abmelden
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-4 pb-8 space-y-4">
        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <Briefcase className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{assignments?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Aufträge</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">
                {assignments?.filter((a) => a.status === "checked_out").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Erledigt</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">
                {assignments?.filter((a) => a.status === "checked_in" || a.status === "working")
                  .length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Aktiv</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Heutige Aufträge</CardTitle>
            <CardDescription>Deine zugewiesenen Termine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignmentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !assignments?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Keine Aufträge heute</p>
                <p className="text-sm">Du hast aktuell keine zugewiesenen Termine.</p>
              </div>
            ) : (
              assignments.map((assignment) => {
                const isActive =
                  assignment.status === "checked_in" || assignment.status === "working";
                const isPending = assignment.status === "pending" || assignment.status === "en_route";

                return (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-lg border ${
                      isActive ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {assignment.appointment?.horse?.name || "Unbekanntes Pferd"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.appointment?.client?.full_name}
                        </p>
                      </div>
                      <Badge
                        variant={isActive ? "default" : isPending ? "secondary" : "outline"}
                      >
                        {assignment.status === "pending"
                          ? "Anstehend"
                          : assignment.status === "en_route"
                          ? "Unterwegs"
                          : assignment.status === "checked_in"
                          ? "Vor Ort"
                          : assignment.status === "working"
                          ? "Arbeitet"
                          : assignment.status}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isPending && (
                        <Button
                          className="flex-1"
                          onClick={() => checkIn.mutate(assignment.id)}
                          disabled={checkIn.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Einchecken
                        </Button>
                      )}
                      {isActive && (
                        <>
                          <Button variant="outline" className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Fotos
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <FileText className="h-4 w-4 mr-2" />
                            Notizen
                          </Button>
                          <Button
                            variant="default"
                            onClick={() => checkOut.mutate(assignment.id)}
                            disabled={checkOut.isPending}
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Fertig
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
