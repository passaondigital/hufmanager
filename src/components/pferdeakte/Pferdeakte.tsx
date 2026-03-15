import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play, History, Footprints, Stethoscope, Activity, FileText, Lock,
  Heart, Syringe, AlertTriangle, Clock, CheckCircle
} from "lucide-react";
import type { Horse } from "@/components/horse-detail/types";
import type { PferdeakteUserRole } from "./types";

import { PferdeakteStart } from "./PferdeakteStart";
import { PferdeakteTimeline } from "./PferdeakteTimeline";
import { PferdeakteHuf } from "./PferdeakteHuf";
import { PferdeakteVet } from "./PferdeakteVet";
import { PferdeakteTherapie } from "./PferdeakteTherapie";
import { PferdeakteBerichte } from "./PferdeakteBerichte";
import { VaultTab } from "@/components/client/VaultTab";

const PFERDEAKTE_TABS = [
  { value: "start", label: "Start", icon: Play },
  { value: "verlauf", label: "Verlauf", icon: History },
  { value: "huf", label: "Huf", icon: Footprints },
  { value: "vet", label: "Vet", icon: Stethoscope },
  { value: "therapie", label: "Therapie", icon: Activity },
  { value: "berichte", label: "Berichte", icon: FileText },
  { value: "tresor", label: "Tresor", icon: Lock },
] as const;

interface PferdeakteProps {
  horseId: string;
  userRole: PferdeakteUserRole;
  horse?: Horse | null;
}

export function Pferdeakte({ horseId, userRole, horse: horseProp }: PferdeakteProps) {
  const [activeTab, setActiveTab] = useState("start");

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
  });

  const horse = (horseProp || horseData) as any;

  // Status pills data
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
  const ownerName = (horse as any).profiles?.full_name || null;

  return (
    <div className="space-y-4">
      {/* Horse Header */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
        <Avatar className="h-16 w-16">
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
            label={`Nächster Termin ${new Date(statusData.nextAppt.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`}
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

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4">
        <div className="flex overflow-x-auto gap-1 py-3 scrollbar-hide">
          {PFERDEAKTE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
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
          <PferdeakteTherapie horseId={horseId} userRole={userRole} />
        )}
        {activeTab === "berichte" && (
          <PferdeakteBerichte horseId={horseId} />
        )}
        {activeTab === "tresor" && (
          <VaultTab horseId={horseId} />
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
