import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { HorseProfileDashboard } from "@/components/horse-profile";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

export default function PortalHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["portal-horse-detail", id],
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
    enabled: !!user && !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!data?.horse) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Pferd nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <HorseProfileDashboard
        horse={data.horse}
        horseId={id!}
        role="portal"
        appointments={data.appointments}
        hoofPhotos={data.hoofPhotos}
        documents={data.documents}
      />
    </div>
  );
}
