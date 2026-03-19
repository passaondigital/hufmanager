import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Syringe, Clock } from "lucide-react";
import type { Horse } from "@/components/horse-detail/types";
import type { PferdeakteUserRole } from "./types";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { usePferdeakteLiveSync, PFERDEAKTE_STALE_TIME } from "@/hooks/usePferdeakteLiveSync";
import { PferdeakteTabGrid, PFERDEAKTE_TABS } from "./PferdeakteTabGrid";
import type { PferdeakteTabValue } from "./PferdeakteTabGrid";

import { PferdeakteStart } from "./PferdeakteStart";
import { PferdeakteTimeline } from "./PferdeakteTimeline";
import { PferdeakteHuf } from "./PferdeakteHuf";
import { PferdeakteVet } from "./PferdeakteVet";
import { PferdeakteTherapie } from "./PferdeakteTherapie";
import { PferdeakteBerichte } from "./PferdeakteBerichte";
import { PferdeakteTresor } from "./PferdeakteTresor";

interface PferdeakteProps {
  horseId: string;
  userRole: PferdeakteUserRole;
  horse?: Horse | null;
  initialTab?: string;
}

const TAB_VALUES = PFERDEAKTE_TABS.map((t) => t.value);

export function Pferdeakte({ horseId, userRole, horse: horseProp, initialTab }: PferdeakteProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab || "start");

  // Live-sync: subscribe to realtime changes for this horse
  usePferdeakteLiveSync(horseId);

  const currentIndex = TAB_VALUES.indexOf(activeTab as PferdeakteTabValue);

  const goNext = useCallback(() => {
    if (currentIndex < TAB_VALUES.length - 1) setActiveTab(TAB_VALUES[currentIndex + 1]);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setActiveTab(TAB_VALUES[currentIndex - 1]);
  }, [currentIndex]);

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  const { data: horseData, isLoading } = useQuery({
    queryKey: ["pferdeakte-horse", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("*, profiles!horses_owner_id_fkey(full_name)")
        .eq("id", horseId)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!horseId && !horseProp,
    staleTime: PFERDEAKTE_STALE_TIME,
  });

  const horse = (horseProp || horseData) as any;

  const { data: statusData } = useQuery({
    queryKey: ["pferdeakte-status", horseId],
    queryFn: async () => {
      const [healthRes, vaccRes, apptRes] = await Promise.all([
        supabase
          .from("horse_health_logs")
          .select("wellbeing, date")
          .eq("horse_id", horseId)
          .order("date", { ascending: false })
          .limit(1),
        supabase
          .from("horse_vaccinations")
          .select("next_due_date, vaccine_type")
          .eq("horse_id", horseId)
          .not("next_due_date", "is", null)
          .order("next_due_date", { ascending: true })
          .limit(3),
        supabase
          .from("appointments")
          .select("date, status")
          .eq("horse_id", horseId)
          .in("status", ["scheduled", "planned", "confirmed"])
          .gte("date", new Date().toISOString().split("T")[0])
          .order("date", { ascending: true })
          .limit(1),
      ]);

      const lastHealth = healthRes.data?.[0];
      const nextVacc = vaccRes.data?.find((v: any) => {
        const due = new Date(v.next_due_date);
        return due <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      });
      const nextAppt = apptRes.data?.[0];

      return { lastHealth, nextVacc, nextAppt };
    },
    enabled: !!horseId,
  });

  if (isLoading && !horse) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!horse) return null;

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;

  return (
    <div className="space-y-4">
      {/* Horse Header */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
          <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
            {horse.name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{horse.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[horse.breed, horse.gender, age ? `${age} J.` : null].filter(Boolean).join(" · ")}
          </p>
          {horse.readable_id && (
            <span className="text-xs font-mono text-muted-foreground">#{horse.readable_id}</span>
          )}
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {statusData?.lastHealth && (
          <StatusPill
            icon={<Heart className="h-3.5 w-3.5" />}
            label={`Wohlbefinden ${statusData.lastHealth.wellbeing}/5`}
            variant={(statusData.lastHealth.wellbeing as number) >= 4 ? "success" : (statusData.lastHealth.wellbeing as number) >= 3 ? "warning" : "danger"}
          />
        )}
        {statusData?.nextAppt && (
          <StatusPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label={`Termin ${new Date(statusData.nextAppt.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`}
            variant="info"
          />
        )}
        {statusData?.nextVacc && (
          <StatusPill
            icon={<Syringe className="h-3.5 w-3.5" />}
            label={`${statusData.nextVacc.vaccine_type} fällig`}
            variant={new Date(statusData.nextVacc.next_due_date) < new Date() ? "danger" : "warning"}
          />
        )}
      </div>

      {/* Tab Navigation — Grid on mobile, pills on desktop */}
      <PferdeakteTabGrid activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Swipe indicator (mobile) */}
      <div className="flex justify-center gap-1 sm:hidden pb-1">
        {TAB_VALUES.map((t, i) => (
          <div
            key={t}
            className={cn(
              "h-1 rounded-full transition-all",
              i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Tab Content with swipe */}
      <div
        className="min-h-[200px]"
        {...swipeHandlers}
      >
        {activeTab === "start" && (
          <PferdeakteStart horseId={horseId} userRole={userRole} horse={horse} onTabChange={setActiveTab} />
        )}
        {activeTab === "verlauf" && (
          <PferdeakteTimeline horseId={horseId} userRole={userRole} />
        )}
        {activeTab === "huf" && (
          <PferdeakteHuf horseId={horseId} userRole={userRole} />
        )}
        {activeTab === "vet" && (
          <PferdeakteVet horseId={horseId} userRole={userRole} />
        )}
        {activeTab === "therapie" && (
          <PferdeakteTherapie horseId={horseId} horseName={horse?.name} userRole={userRole} ownerId={horse?.owner_id} />
        )}
        {activeTab === "berichte" && (
          <PferdeakteBerichte horseId={horseId} />
        )}
        {activeTab === "tresor" && (
          <PferdeakteTresor horseId={horseId} horse={horse} />
        )}
      </div>
    </div>
  );
}

function StatusPill({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: "success" | "warning" | "danger" | "info" }) {
  const colors = {
    success: "bg-green-500/10 text-green-600 border-green-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 border-red-500/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0", colors[variant])}>
      {icon}
      {label}
    </div>
  );
}
