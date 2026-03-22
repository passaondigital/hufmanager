import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HorseProfileDashboard } from "@/components/horse-profile";
import { Pferdeakte } from "@/components/pferdeakte";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";
import { useState, useCallback } from "react";

export default function PartnerHorseView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAkte, setShowAkte] = useState(false);

  // Verify partner has active grant
  const { data: grant, isLoading: grantLoading } = useQuery({
    queryKey: ["partner-grant", user?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("*")
        .eq("partner_profile_id", user!.id)
        .eq("horse_id", id!)
        .eq("status", "active")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch horse data once we have access
  const { data: horseData, isLoading: horseLoading } = useQuery({
    queryKey: ["partner-horse-detail", id],
    queryFn: async () => {
      const [horseRes, apptRes, photoRes, docRes] = await Promise.all([
        supabase.from("horses").select("*").eq("id", id!).is("deleted_at", null).maybeSingle(),
        supabase.from("appointments").select("*").eq("horse_id", id!).order("date", { ascending: false }),
        supabase.from("hoof_photos").select("*").eq("horse_id", id!).order("taken_at", { ascending: false }),
        supabase.from("horse_documents").select("*").eq("horse_id", id!).order("created_at", { ascending: false }),
      ]);
      return {
        horse: horseRes.data as unknown as Horse | null,
        appointments: (apptRes.data || []) as Appointment[],
        hoofPhotos: (photoRes.data || []) as HoofPhoto[],
        documents: (docRes.data || []) as HorseDocument[],
      };
    },
    enabled: !!grant && !!id,
  });

  const handleAction = useCallback((action: string) => {
    if (["show-photos", "show-docs", "compare-health"].includes(action)) {
      setShowAkte(true);
    }
  }, []);

  if (grantLoading || horseLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Kein Zugriff auf dieses Pferd</p>
          <Button onClick={() => navigate("/partner-home")}>Zurück</Button>
        </div>
      </div>
    );
  }

  if (!horseData?.horse) return null;

  if (showAkte) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setShowAkte(false)} className="text-xs text-muted-foreground hover:text-primary">
          ← Zurück zur Übersicht
        </button>
        <Pferdeakte horseId={id!} userRole="partner" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <HorseProfileDashboard
        horse={horseData.horse}
        horseId={id!}
        role="partner"
        appointments={horseData.appointments}
        hoofPhotos={horseData.hoofPhotos}
        documents={horseData.documents}
        backPath="/partner-home"
        onAction={handleAction}
      >
        <button
          onClick={() => setShowAkte(true)}
          className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
        >
          📋 Vollständige Pferdeakte öffnen
        </button>
      </HorseProfileDashboard>
    </div>
  );
}
