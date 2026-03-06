import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  Calendar, Clock, CheckCircle2, MapPin, Truck, AlertTriangle,
  CalendarCheck, Navigation, CircleCheck
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface TodayAppointment {
  id: string;
  date: string;
  time: string | null;
  status: string;
  service_type: string | null;
  location: string | null;
  provider_id: string;
  assigned_to_user_id: string | null;
  horse_name: string | null;
  provider_name: string;
  provider_avatar: string | null;
  service_color: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

interface TourInfo {
  isActive: boolean;
  tourActiveSince: string | null;
  completedCount: number;
  totalCount: number;
  stationsAway: number;
  isMyTurn: boolean;
  estimatedArrival: string | null;
  hasDelay: boolean;
  delayMinutes: number;
  delayReason: string | null;
}

// ── Timeline step config ───────────────────────────────────

type TimelineStep = "planned" | "confirmed" | "unterwegs" | "angekommen" | "completed";

const TIMELINE_STEPS: { key: TimelineStep; label: string; icon: typeof Calendar; emoji: string }[] = [
  { key: "planned",    label: "Geplant",     icon: Calendar,      emoji: "📅" },
  { key: "confirmed",  label: "Bestätigt",   icon: CalendarCheck, emoji: "✅" },
  { key: "unterwegs",  label: "Unterwegs",   icon: Navigation,    emoji: "🚗" },
  { key: "angekommen", label: "Angekommen",  icon: MapPin,        emoji: "📍" },
  { key: "completed",  label: "Erledigt",    icon: CircleCheck,   emoji: "✓"  },
];

const STEP_ORDER: TimelineStep[] = ["planned", "confirmed", "unterwegs", "angekommen", "completed"];

const FALLBACK_AVATAR_BG = "#F5970A";

// ── Helper: initials avatar ────────────────────────────────
function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Component ──────────────────────────────────────────────

export function ClientTodayDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [tourInfo, setTourInfo] = useState<TourInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // ── Data fetch ─────────────────────────────────────────

  const fetchToday = useCallback(async () => {
    if (!user) return;

    // 1. Get client's horses
    const { data: horses } = await supabase
      .from("horses")
      .select("id, name")
      .eq("owner_id", user.id)
      .is("deleted_at", null);

    const horseIds = (horses || []).map(h => h.id);
    const horseMap = Object.fromEntries((horses || []).map(h => [h.id, h.name]));

    if (horseIds.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    // 2. Today's appointments
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, date, time, status, service_type, location, provider_id, assigned_to_user_id, horse_id, confirmed_at, completed_at")
      .eq("date", today)
      .in("horse_id", horseIds)
      .neq("status", "cancelled")
      .order("time", { ascending: true });

    if (!appts || appts.length === 0) {
      setAppointments([]);
      setTourInfo(null);
      setLoading(false);
      return;
    }

    // 3. Resolve names + avatars
    const allPersonIds = new Set<string>();
    appts.forEach((a: any) => {
      allPersonIds.add(a.provider_id);
      if (a.assigned_to_user_id) allPersonIds.add(a.assigned_to_user_id);
    });

    const [{ data: profiles }, { data: bsData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", [...allPersonIds]),
      supabase.from("business_settings").select("user_id, business_name").in("user_id", [...new Set(appts.map((a: any) => a.provider_id))]),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const bsMap = Object.fromEntries((bsData || []).map(b => [b.user_id, b.business_name]));

    // Employee profiles for assigned users
    const employeeIds = appts.map((a: any) => a.assigned_to_user_id).filter(Boolean) as string[];
    let employeeMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
    if (employeeIds.length > 0) {
      const { data: employees } = await supabase
        .from("employee_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", employeeIds);
      employeeMap = Object.fromEntries((employees || []).map(e => [e.user_id, e]));
    }

    // 4. Service presets for color
    const providerIds = [...new Set(appts.map((a: any) => a.provider_id))];
    const { data: presets } = await supabase
      .from("service_time_presets" as any)
      .select("service_type, color_hex, provider_id")
      .in("provider_id", providerIds);
    const colorMap: Record<string, string> = {};
    (presets || []).forEach((p: any) => { colorMap[`${p.provider_id}:${p.service_type}`] = p.color_hex; });

    // 5. Build enriched appointments
    const enriched: TodayAppointment[] = appts.map((a: any) => {
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
        id: a.id,
        date: a.date,
        time: a.time,
        status: a.status,
        service_type: a.service_type,
        location: a.location,
        provider_id: a.provider_id,
        assigned_to_user_id: a.assigned_to_user_id,
        horse_name: horseMap[a.horse_id] || null,
        provider_name: displayName,
        provider_avatar: displayAvatar,
        service_color: colorMap[`${a.provider_id}:${a.service_type}`] || "#9ca3af",
        confirmed_at: a.confirmed_at,
        completed_at: a.completed_at,
      };
    });

    setAppointments(enriched);

    // 6. Tour info
    await fetchTourInfo(appts[0].provider_id, appts);

    setLoading(false);
  }, [user, today]);

  const fetchTourInfo = async (providerId: string, myAppts: any[]) => {
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

    const { data: allAppts } = await supabase
      .from("appointments")
      .select("id, status, tour_order, time, completed_at")
      .eq("provider_id", providerId)
      .eq("date", today)
      .neq("status", "cancelled")
      .order("tour_order", { ascending: true, nullsFirst: false })
      .order("time", { ascending: true });

    if (!allAppts) return;

    const completedCount = allAppts.filter(a => a.status === "completed").length;
    const myAppt = myAppts[0];
    const myIndex = allAppts.findIndex(a => a.id === myAppt.id);
    const stationsAway = Math.max(0, myIndex - completedCount);

    // ETA
    let estimatedArrival: string | null = null;
    const completedAppts = allAppts.filter(a => a.status === "completed" && a.completed_at);
    if (completedAppts.length > 0 && stationsAway > 0) {
      const tourStart = new Date(tour.tour_active_since);
      const lastCompleted = new Date(completedAppts[completedAppts.length - 1].completed_at!);
      const avgMin = (lastCompleted.getTime() - tourStart.getTime()) / (completedCount * 60000);
      const etaMs = lastCompleted.getTime() + stationsAway * avgMin * 60000;
      estimatedArrival = format(new Date(etaMs), "HH:mm");
    }

    // Delay
    const { data: emergency } = await supabase
      .from("tour_emergency_status")
      .select("estimated_delay_minutes, reason, ended_at")
      .eq("tour_id", tour.id)
      .is("ended_at", null)
      .maybeSingle();

    setTourInfo({
      isActive: true,
      tourActiveSince: tour.tour_active_since,
      completedCount,
      totalCount: allAppts.length,
      stationsAway,
      isMyTurn: myIndex === completedCount,
      estimatedArrival,
      hasDelay: !!emergency,
      delayMinutes: emergency?.estimated_delay_minutes || 0,
      delayReason: emergency?.reason || null,
    });
  };

  // ── Realtime ───────────────────────────────────────────

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    if (!user || appointments.length === 0) return;

    const providerId = appointments[0]?.provider_id;
    const appointmentIds = appointments.map(a => a.id);

    const channel = supabase
      .channel("client-tour-status")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "daily_tours",
        filter: `provider_id=eq.${providerId}`,
      }, () => { fetchToday(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "appointments",
        filter: `date=eq.${today}`,
      }, (payload) => {
        // Only refetch if it's one of our appointments
        if (appointmentIds.includes((payload.new as any)?.id)) {
          fetchToday();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, appointments.length > 0 ? appointments[0]?.provider_id : null, today]);

  // ── Status derivation ──────────────────────────────────

  const getDisplayStatus = (appt: TodayAppointment): TimelineStep => {
    if (appt.status === "completed") return "completed";
    if (appt.status === "arrived") return "angekommen";
    if (tourInfo?.isMyTurn && tourInfo.isActive) return "unterwegs";
    if (tourInfo?.isActive && tourInfo.stationsAway > 0) return "unterwegs"; // tour active but not my turn yet → show unterwegs for tour
    if (appt.status === "confirmed" || appt.confirmed_at) return "confirmed";
    return "planned";
  };

  const getTimestampForStep = (appt: TodayAppointment, step: TimelineStep): string | null => {
    switch (step) {
      case "planned": return appt.time ? appt.time.slice(0, 5) : null;
      case "confirmed": return appt.confirmed_at ? format(new Date(appt.confirmed_at), "HH:mm") : null;
      case "unterwegs": return tourInfo?.tourActiveSince ? format(new Date(tourInfo.tourActiveSince), "HH:mm") : null;
      case "angekommen": return null; // Would need arrival timestamp
      case "completed": return appt.completed_at ? format(new Date(appt.completed_at), "HH:mm") : null;
      default: return null;
    }
  };

  // ── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-8 text-center space-y-2">
          <span className="text-4xl">🐴</span>
          <p className="font-semibold text-foreground">Kein Termin heute</p>
          <p className="text-sm text-muted-foreground">
            Genieße den Tag mit deinem Pferd!
          </p>
        </CardContent>
      </Card>
    );
  }

  const heroAppt = appointments[0];
  const heroStatus = getDisplayStatus(heroAppt);
  const heroStepIndex = STEP_ORDER.indexOf(heroStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">Heute</h2>
        <Badge variant="secondary" className="text-xs">
          {appointments.length} Termin{appointments.length !== 1 ? "e" : ""}
        </Badge>
        <HelpTip id="client.dashboard-hero" />
      </div>

      {/* ── HERO CARD ───────────────────────────────────── */}
      <Card className={cn(
        "overflow-hidden border-2 transition-colors",
        heroStatus === "unterwegs" && "border-[#F5970A] shadow-lg shadow-[#F5970A]/10",
        heroStatus === "angekommen" && "border-green-500 shadow-lg shadow-green-500/10",
        heroStatus === "completed" && "border-green-500/50",
        heroStatus === "confirmed" && "border-blue-500/50",
        heroStatus === "planned" && "border-border",
      )}>
        <CardContent className="p-5 space-y-4">
          {/* Top row: Time + Provider */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background shadow-md">
              {heroAppt.provider_avatar ? (
                <AvatarImage src={heroAppt.provider_avatar} alt={heroAppt.provider_name} />
              ) : null}
              <AvatarFallback
                className="text-white font-bold text-lg"
                style={{ backgroundColor: FALLBACK_AVATAR_BG }}
              >
                {getInitials(heroAppt.provider_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Time prominent */}
              {heroAppt.time && (
                <div className="text-2xl font-bold text-foreground tracking-tight">
                  {heroAppt.time.slice(0, 5)} Uhr
                </div>
              )}

              {/* Horse + service badge */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-semibold text-foreground truncate">
                  {heroAppt.horse_name || "Termin"}
                </span>
                {heroAppt.service_type && (
                  <Badge
                    className="text-[10px] border-0 text-white shrink-0"
                    style={{ backgroundColor: heroAppt.service_color }}
                  >
                    {heroAppt.service_type}
                  </Badge>
                )}
              </div>

              {/* Provider name */}
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                mit {heroAppt.provider_name}
              </p>
            </div>
          </div>

          {/* Location */}
          {heroAppt.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{heroAppt.location}</span>
            </div>
          )}

          {/* Live tour banner */}
          {tourInfo?.isActive && (
            <div className={cn(
              "rounded-lg p-3 flex items-center gap-3",
              tourInfo.isMyTurn
                ? "bg-[#F5970A]/10"
                : "bg-blue-500/10"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                tourInfo.isMyTurn ? "bg-[#F5970A]/20" : "bg-blue-500/20"
              )}>
                <Truck className={cn(
                  "h-4 w-4",
                  tourInfo.isMyTurn ? "text-[#F5970A]" : "text-blue-600"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {heroAppt.provider_name} ist unterwegs
                </p>
                {tourInfo.isMyTurn ? (
                  <p className="text-xs text-[#F5970A] font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#F5970A] animate-pulse" />
                    Du bist als Nächstes dran!
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Noch {tourInfo.stationsAway} Station{tourInfo.stationsAway !== 1 ? "en" : ""} vor dir
                    {tourInfo.estimatedArrival && ` • Ankunft ca. ${tourInfo.estimatedArrival} Uhr`}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {tourInfo.completedCount}/{tourInfo.totalCount}
              </Badge>
            </div>
          )}

          {/* Delay warning */}
          {tourInfo?.hasDelay && (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Verzögerung: ca. {tourInfo.delayMinutes} Min.
                {tourInfo.delayReason && (
                  <p className="text-xs mt-0.5 opacity-80">{tourInfo.delayReason}</p>
                )}
              </div>
            </div>
          )}

          {/* ── STATUS TIMELINE ────────────────────────── */}
          <div className="relative pt-2">
            <HelpTip id="client.dashboard-timeline" className="absolute -top-1 right-0" />
            <div className="flex items-start justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const thisIndex = STEP_ORDER.indexOf(step.key);
                const isReached = thisIndex <= heroStepIndex;
                const isCurrent = step.key === heroStatus;
                const timestamp = isReached ? getTimestampForStep(heroAppt, step.key) : null;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center relative" style={{ flex: 1 }}>
                    {/* Connector line (before this step) */}
                    {i > 0 && (
                      <div
                        className={cn(
                          "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                          thisIndex <= heroStepIndex ? "bg-[#F5970A]" : "bg-muted",
                        )}
                        style={{ zIndex: 0 }}
                      />
                    )}

                    {/* Step circle */}
                    <div
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        isCurrent && "ring-4 ring-[#F5970A]/20 bg-[#F5970A] text-white shadow-lg",
                        isReached && !isCurrent && "bg-green-500 text-white",
                        !isReached && "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCurrent && heroStatus === "unterwegs" ? (
                        <Truck className="h-4 w-4 animate-pulse" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>

                    {/* Label */}
                    <span className={cn(
                      "text-[9px] sm:text-[10px] mt-1.5 text-center leading-tight font-medium",
                      isCurrent ? "text-[#F5970A]" : isReached ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>

                    {/* Timestamp */}
                    {timestamp && (
                      <span className={cn(
                        "text-[8px] sm:text-[9px] mt-0.5",
                        isCurrent ? "text-[#F5970A]/80" : "text-green-600/70 dark:text-green-400/70"
                      )}>
                        {timestamp}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ADDITIONAL TODAY APPOINTMENTS ─────────────── */}
      {appointments.length > 1 && (
        <div className="space-y-2">
          {appointments.slice(1).map(appt => {
            const status = getDisplayStatus(appt);
            return (
              <Card key={appt.id} className="overflow-hidden">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {appt.provider_avatar && <AvatarImage src={appt.provider_avatar} />}
                    <AvatarFallback style={{ backgroundColor: FALLBACK_AVATAR_BG }} className="text-white text-xs font-bold">
                      {getInitials(appt.provider_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{appt.horse_name || "Termin"}</span>
                      {appt.service_type && (
                        <Badge className="text-[9px] border-0 text-white shrink-0" style={{ backgroundColor: appt.service_color }}>
                          {appt.service_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {appt.time && <span>{appt.time.slice(0, 5)} Uhr</span>}
                      <span>•</span>
                      <span className="truncate">{appt.provider_name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
