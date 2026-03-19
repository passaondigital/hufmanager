import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Heart, Plus } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientHorsesContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: horses = [] } = useQuery({
    queryKey: ["client-horses-widget", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, birth_year, health_status")
        .eq("owner_id", user!.id)
        .is("deleted_at", null)
        .order("name")
        .limit(8);
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (horses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Heart className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Noch keine Pferde</p>
        <button
          onClick={() => navigate("/client-horses")}
          className="text-xs font-medium text-primary mt-2 hover:underline"
        >
          Pferd hinzufügen →
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {horses.map((horse: any) => {
        const isHealthy = !horse.health_status || horse.health_status === "healthy";
        return (
          <button
            key={horse.id}
            onClick={() => navigate(`/client-horse/${horse.id}`)}
            className="flex flex-col items-center p-3 rounded-xl bg-muted/50 hover:bg-accent transition-colors text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden mb-1.5">
              {horse.photo_url ? (
                <img src={horse.photo_url} alt={horse.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-sm">🐴</span>
              )}
            </div>
            <p className="text-xs font-medium text-foreground truncate w-full">{horse.name}</p>
            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-medium ${isHealthy ? "text-green-500" : "text-yellow-500"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {isHealthy ? "Gesund" : "Befund"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
