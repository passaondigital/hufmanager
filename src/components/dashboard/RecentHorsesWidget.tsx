import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface RecentHorse {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string | null;
  last_interaction: string;
  owner_name: string | null;
}

export function RecentHorsesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: recentHorses, isLoading } = useQuery({
    queryKey: ["recent-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get horses from recent appointments (provider's appointments)
      const { data: recentAppointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          horse_id,
          updated_at,
          horses (
            id,
            name,
            photo_url,
            breed,
            owner_id
          )
        `)
        .eq("provider_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (appointmentsError) {
        console.error("Error fetching recent appointments:", appointmentsError);
        return [];
      }

      // Get unique horses with their last interaction time
      const horseMap = new Map<string, { horse: any; lastInteraction: string }>();
      
      for (const apt of recentAppointments || []) {
        if (apt.horses && !horseMap.has(apt.horse_id)) {
          horseMap.set(apt.horse_id, {
            horse: apt.horses,
            lastInteraction: apt.updated_at,
          });
        }
        if (horseMap.size >= 3) break;
      }

      // Get owner names for the horses
      const horseOwnerIds = Array.from(horseMap.values()).map((h) => h.horse.owner_id);
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", horseOwnerIds);

      const ownerMap = new Map(owners?.map((o) => [o.id, o.full_name]) || []);

      const result: RecentHorse[] = Array.from(horseMap.values()).map(({ horse, lastInteraction }) => ({
        id: horse.id,
        name: horse.name,
        photo_url: horse.photo_url,
        breed: horse.breed,
        last_interaction: lastInteraction,
        owner_name: ownerMap.get(horse.owner_id) || null,
      }));

      return result;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const handleHorseClick = (horseId: string) => {
    // Navigate directly to horse detail with Historie tab pre-selected
    navigate(`/horse/${horseId}?tab=historie`);
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Zuletzt bearbeitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[100px]">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recentHorses || recentHorses.length === 0) {
    return null; // Don't show widget if no recent horses
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Zuletzt bearbeitet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recentHorses.map((horse) => (
            <button
              key={horse.id}
              onClick={() => handleHorseClick(horse.id)}
              className="flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group cursor-pointer"
            >
              <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary transition-all">
                <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {horse.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[90px]">
                  {horse.name}
                </p>
                {horse.owner_name && (
                  <p className="text-xs text-muted-foreground truncate max-w-[90px]">
                    {horse.owner_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(horse.last_interaction), {
                    addSuffix: true,
                    locale: de,
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
