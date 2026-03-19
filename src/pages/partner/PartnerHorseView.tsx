import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Pferdeakte } from "@/components/pferdeakte";

export default function PartnerHorseView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verify partner has active grant for this horse
  const { data: grant, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner-home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Pferdeakte</h1>
      </div>

      <Pferdeakte horseId={id!} userRole="partner" />
    </div>
  );
}
