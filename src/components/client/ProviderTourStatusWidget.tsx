import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle2, Truck } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProviderTourStatusWidgetProps {
  userId: string;
}

export function ProviderTourStatusWidget({ userId }: ProviderTourStatusWidgetProps) {
  // Find active provider tour for today where this client has an appointment
  const { data: tourStatus, isLoading } = useQuery({
    queryKey: ["client-tour-status", userId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data: myHorses } = await supabase
        .from("horses")
        .select("id")
        .eq("owner_id", userId)
        .is("deleted_at", null);
      
      const horseIds = (myHorses || []).map(h => h.id);
      if (horseIds.length === 0) return null;
      
      const { data: myAppointments } = await supabase
        .from("appointments")
        .select("id, time, status, provider_id, tour_order")
        .eq("date", today)
        .in("horse_id", horseIds)
        .neq("status", "cancelled")
        .order("time", { ascending: true });
      
      if (!myAppointments || myAppointments.length === 0) return null;
      
      const myAppt = myAppointments[0];
      const providerId = myAppt.provider_id;
      if (!providerId) return null;
      
      const { data: tour } = await supabase
        .from("daily_tours")
        .select("id, tour_active_since, tour_ended_at")
        .eq("provider_id", providerId)
        .eq("tour_date", today)
        .maybeSingle();
      
      if (!tour || !tour.tour_active_since || tour.tour_ended_at) return null;
      
      const { data: allAppts } = await supabase
        .from("appointments")
        .select("id, status, tour_order, time, completed_at")
        .eq("provider_id", providerId)
        .eq("date", today)
        .neq("status", "cancelled")
        .order("tour_order", { ascending: true, nullsFirst: false })
        .order("time", { ascending: true });
      
      if (!allAppts) return null;
      
      const completedCount = allAppts.filter(a => a.status === "completed").length;
      const totalCount = allAppts.length;
      const myIndex = allAppts.findIndex(a => a.id === myAppt.id);
      const isMyTurn = myIndex === completedCount;
      const stationsAway = Math.max(0, myIndex - completedCount);
      
      // Calculate ETA based on average time per stop
      let estimatedArrival: string | null = null;
      const completedAppts = allAppts.filter(a => a.status === "completed" && a.completed_at);
      if (completedAppts.length > 0 && stationsAway > 0) {
        const tourStart = new Date(tour.tour_active_since);
        const lastCompleted = new Date(completedAppts[completedAppts.length - 1].completed_at!);
        const avgMinPerStop = (lastCompleted.getTime() - tourStart.getTime()) / (completedCount * 60000);
        const etaMs = lastCompleted.getTime() + (stationsAway * avgMinPerStop * 60000);
        estimatedArrival = format(new Date(etaMs), "HH:mm");
      }
      
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", providerId)
        .maybeSingle();
      
      const { data: emergency } = await supabase
        .from("tour_emergency_status")
        .select("id, estimated_delay_minutes, reason, ended_at")
        .eq("tour_id", tour.id)
        .is("ended_at", null)
        .maybeSingle();
      
      return {
        isActive: true,
        tourId: tour.id,
        providerId,
        providerName: providerProfile?.full_name || "Dein Hufpfleger",
        completedCount,
        totalCount,
        myPosition: myIndex + 1,
        stationsAway,
        isMyTurn,
        isCompleted: myAppt.status === "completed",
        myTime: myAppt.time,
        estimatedArrival,
        horseName: myHorses?.[0] ? (await supabase.from("horses").select("name").eq("id", horseIds[0]).maybeSingle())?.data?.name || null : null,
        hasDelay: !!emergency,
        delayMinutes: emergency?.estimated_delay_minutes || 0,
        delayMessage: emergency?.reason || null,
      };
    },
    enabled: !!userId,
    refetchInterval: 15000, // Every 15 seconds for smoother updates
  });

  if (isLoading || !tourStatus) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={cn(
          "overflow-hidden border-2",
          tourStatus.isMyTurn && !tourStatus.isCompleted 
            ? "border-primary bg-primary/5" 
            : tourStatus.hasDelay 
              ? "border-amber-500 bg-amber-500/5"
              : "border-blue-500/30 bg-blue-500/5"
        )}>
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                tourStatus.isMyTurn ? "bg-primary/20" : "bg-blue-500/20"
              )}>
                <Truck className={cn(
                  "h-5 w-5",
                  tourStatus.isMyTurn ? "text-primary" : "text-blue-600"
                )} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {tourStatus.providerName} ist unterwegs
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  <span>Live-Tour aktiv</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tourStatus.completedCount}/{tourStatus.totalCount}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(tourStatus.completedCount / tourStatus.totalCount) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Status message */}
            {tourStatus.isCompleted ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Dein Termin wurde abgeschlossen!</span>
              </div>
            ) : tourStatus.isMyTurn ? (
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <MapPin className="h-4 w-4 animate-bounce" />
                <span>Du bist als Nächstes dran!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Noch {tourStatus.stationsAway} Station{tourStatus.stationsAway !== 1 ? "en" : ""} vor dir
                  {tourStatus.estimatedArrival && ` • Ankunft ca. ${tourStatus.estimatedArrival} Uhr`}
                  {!tourStatus.estimatedArrival && tourStatus.myTime && ` • geplant um ${tourStatus.myTime}`}
                </span>
              </div>
            )}

            {/* Delay warning */}
            {tourStatus.hasDelay && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg p-3 text-sm">
                ⚠️ Verzögerung: ca. {tourStatus.delayMinutes} Min.
                {tourStatus.delayMessage && (
                  <p className="text-xs mt-1 opacity-80">{tourStatus.delayMessage}</p>
                )}
              </div>
            )}

            {/* Horse info */}
            {tourStatus.horseName && !tourStatus.isCompleted && (
              <div className="text-xs text-muted-foreground">
                🐴 Termin für: {tourStatus.horseName}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
