import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpTip } from "@/components/ui/HelpTip";
import { Calendar, Clock, CheckCircle2, MapPin, Truck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TodayAppointment {
  id: string;
  date: string;
  time: string | null;
  status: string;
  service_type: string | null;
  provider_id: string;
  assigned_to_user_id: string | null;
  horse_name: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
}

interface TourInfo {
  isActive: boolean;
  completedCount: number;
  totalCount: number;
  myPosition: number;
  stationsAway: number;
  isMyTurn: boolean;
  estimatedArrival: string | null;
  hasDelay: boolean;
  delayMinutes: number;
  delayReason: string | null;
}

type AppointmentStatus = "planned" | "confirmed" | "unterwegs" | "angekommen" | "completed";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; icon: typeof Calendar; color: string }> = {
  planned: { label: "Geplant", icon: Calendar, color: "text-muted-foreground" },
  confirmed: { label: "Bestätigt", icon: CheckCircle2, color: "text-blue-600" },
  unterwegs: { label: "Unterwegs zu dir", icon: Truck, color: "text-primary" },
  angekommen: { label: "Angekommen", icon: MapPin, color: "text-green-600" },
  completed: { label: "Erledigt", icon: CheckCircle2, color: "text-green-600" },
};

export function ClientTodayDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's appointments
  useEffect(() => {
    if (!user) return;

    const fetchToday = async () => {
      // Get horses
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user.id)
        .is("deleted_at", null);

      const horseIds = (horses || []).map((h) => h.id);
      const horseMap = Object.fromEntries((horses || []).map((h) => [h.id, h.name]));

      if (horseIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, date, time, status, service_type, provider_id, assigned_to_user_id, horse_id")
        .eq("date", today)
        .in("horse_id", horseIds)
        .neq("status", "cancelled")
        .order("time", { ascending: true });

      if (appts && appts.length > 0) {
        // Collect all user IDs that could be the responsible person
        const allPersonIds = new Set<string>();
        appts.forEach((a: any) => {
          allPersonIds.add(a.provider_id);
          if (a.assigned_to_user_id) allPersonIds.add(a.assigned_to_user_id);
        });

        // Fetch profiles for all relevant people
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", [...allPersonIds]);
        const profileMap = Object.fromEntries(
          (profiles || []).map((p) => [p.id, p])
        );

        // Fetch employee profiles for assigned employees
        const employeeIds = appts
          .map((a: any) => a.assigned_to_user_id)
          .filter((id: any): id is string => !!id);
        let employeeMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
        if (employeeIds.length > 0) {
          const { data: employees } = await supabase
            .from("employee_profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", employeeIds);
          employeeMap = Object.fromEntries(
            (employees || []).map((e) => [e.user_id, e])
          );
        }

        // Fallback: business_settings for provider names
        const providerIds = [...new Set(appts.map((a: any) => a.provider_id))];
        const { data: bsData } = await supabase
          .from("business_settings")
          .select("user_id, business_name")
          .in("user_id", providerIds);
        const bsMap = Object.fromEntries(
          (bsData || []).map((b) => [b.user_id, b.business_name])
        );

        setAppointments(
          appts.map((a: any) => {
            // If assigned to an employee, use employee name/avatar
            const assignee = a.assigned_to_user_id
              ? employeeMap[a.assigned_to_user_id] || profileMap[a.assigned_to_user_id]
              : null;
            const provider = profileMap[a.provider_id];

            const displayName = assignee?.full_name
              || provider?.full_name
              || bsMap[a.provider_id]
              || "Dein Hufpfleger";

            const displayAvatar = (assignee as any)?.avatar_url
              || provider?.avatar_url
              || null;

            return {
              ...a,
              horse_name: horseMap[a.horse_id] || null,
              provider_name: displayName,
              provider_avatar: displayAvatar,
            };
          })
        );

        // Check tour status
        await fetchTourInfo(appts[0].provider_id, horseIds, appts);
      }

      setLoading(false);
    };

    fetchToday();

    // Subscribe to realtime changes on appointments
    const channel = supabase
      .channel("client-today-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `date=eq.${today}`,
        },
        () => {
          fetchToday();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_tours",
        },
        () => {
          // Refetch when tour status changes
          if (appointments.length > 0) {
            fetchToday();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, today]);

  const fetchTourInfo = async (
    providerId: string,
    horseIds: string[],
    appts: any[]
  ) => {
    const { data: tour } = await supabase
      .from("daily_tours")
      .select("id, tour_active_since, tour_ended_at")
      .eq("provider_id", providerId)
      .eq("tour_date", today)
      .maybeSingle();

    if (!tour || !tour.tour_active_since || tour.tour_ended_at) {
      setTourInfo(null);
      return;
    }

    // Get all appointments for this provider today
    const { data: allAppts } = await supabase
      .from("appointments")
      .select("id, status, tour_order, time, completed_at")
      .eq("provider_id", providerId)
      .eq("date", today)
      .neq("status", "cancelled")
      .order("tour_order", { ascending: true, nullsFirst: false })
      .order("time", { ascending: true });

    if (!allAppts) return;

    const completedCount = allAppts.filter((a) => a.status === "completed").length;
    const myAppt = appts[0];
    const myIndex = allAppts.findIndex((a) => a.id === myAppt.id);
    const stationsAway = Math.max(0, myIndex - completedCount);

    // ETA calculation
    let estimatedArrival: string | null = null;
    const completedAppts = allAppts.filter((a) => a.status === "completed" && a.completed_at);
    if (completedAppts.length > 0 && stationsAway > 0) {
      const tourStart = new Date(tour.tour_active_since);
      const lastCompleted = new Date(completedAppts[completedAppts.length - 1].completed_at!);
      const avgMin = (lastCompleted.getTime() - tourStart.getTime()) / (completedCount * 60000);
      const etaMs = lastCompleted.getTime() + stationsAway * avgMin * 60000;
      estimatedArrival = format(new Date(etaMs), "HH:mm");
    }

    // Check for delays
    const { data: emergency } = await supabase
      .from("tour_emergency_status")
      .select("estimated_delay_minutes, reason, ended_at")
      .eq("tour_id", tour.id)
      .is("ended_at", null)
      .maybeSingle();

    setTourInfo({
      isActive: true,
      completedCount,
      totalCount: allAppts.length,
      myPosition: myIndex + 1,
      stationsAway,
      isMyTurn: myIndex === completedCount,
      estimatedArrival,
      hasDelay: !!emergency,
      delayMinutes: emergency?.estimated_delay_minutes || 0,
      delayReason: emergency?.reason || null,
    });
  };

  const getDisplayStatus = (appt: TodayAppointment): AppointmentStatus => {
    if (appt.status === "completed") return "completed";
    if (tourInfo?.isMyTurn && tourInfo.isActive) return "unterwegs";
    if (appt.status === "confirmed") return "confirmed";
    return "planned";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (appointments.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">Heute</h2>
        <Badge variant="secondary" className="text-xs">
          {appointments.length} Termin{appointments.length !== 1 ? "e" : ""}
        </Badge>
        <HelpTip id="client.heute-termine" />
      </div>

      {/* Live Tour Status Banner */}
      {tourInfo?.isActive && (
        <Card
          className={cn(
            "overflow-hidden border-2",
            tourInfo.isMyTurn
              ? "border-primary bg-primary/5"
              : tourInfo.hasDelay
              ? "border-amber-500 bg-amber-500/5"
              : "border-blue-500/30 bg-blue-500/5"
          )}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  tourInfo.isMyTurn ? "bg-primary/20" : "bg-blue-500/20"
                )}
              >
                <Truck
                  className={cn(
                    "h-5 w-5",
                    tourInfo.isMyTurn ? "text-primary" : "text-blue-600"
                  )}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {appointments[0]?.provider_name} ist unterwegs
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  <span>Live-Tour aktiv</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tourInfo.completedCount}/{tourInfo.totalCount}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${(tourInfo.completedCount / tourInfo.totalCount) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Status message */}
            {tourInfo.isMyTurn ? (
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <MapPin className="h-4 w-4 animate-bounce" />
                <span>Du bist als Nächstes dran!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Noch {tourInfo.stationsAway} Station
                  {tourInfo.stationsAway !== 1 ? "en" : ""} vor dir
                  {tourInfo.estimatedArrival &&
                    ` • Ankunft ca. ${tourInfo.estimatedArrival} Uhr`}
                </span>
              </div>
            )}

            {/* Delay warning */}
            {tourInfo.hasDelay && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg p-3 text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Verzögerung: ca. {tourInfo.delayMinutes} Min.
                {tourInfo.delayReason && (
                  <p className="text-xs mt-1 opacity-80">{tourInfo.delayReason}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Timeline for each appointment */}
      {appointments.map((appt) => {
        const displayStatus = getDisplayStatus(appt);
        const config = STATUS_CONFIG[displayStatus];
        const StatusIcon = config.icon;

        return (
          <Card key={appt.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {appt.provider_avatar && (
                    <AvatarImage src={appt.provider_avatar} alt={appt.provider_name || ""} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {(appt.provider_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {appt.horse_name || "Termin"}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] shrink-0", config.color)}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="truncate">mit {appt.provider_name}</span>
                    {appt.time && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{appt.time.slice(0, 5)} Uhr</span>
                      </>
                    )}
                    {appt.service_type && (
                      <>
                        <span>•</span>
                        <span className="truncate">{appt.service_type}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mini status timeline */}
              <div className="flex items-center gap-1 mt-3 px-1">
                {(["planned", "confirmed", "unterwegs", "angekommen", "completed"] as AppointmentStatus[]).map(
                  (step, i) => {
                    const stepOrder = ["planned", "confirmed", "unterwegs", "angekommen", "completed"];
                    const currentOrder = stepOrder.indexOf(displayStatus);
                    const thisOrder = stepOrder.indexOf(step);
                    const isReached = thisOrder <= currentOrder;
                    const isCurrent = step === displayStatus;

                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0 transition-colors",
                            isReached ? "bg-primary" : "bg-muted",
                            isCurrent && "ring-2 ring-primary/30 h-3 w-3"
                          )}
                        />
                        {i < 4 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1 mx-0.5",
                              thisOrder < currentOrder ? "bg-primary" : "bg-muted"
                            )}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-0.5">
                <span>Geplant</span>
                <span>Bestätigt</span>
                <span>Unterwegs</span>
                <span>Da</span>
                <span>Fertig</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}
