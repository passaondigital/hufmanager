import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, CheckSquare, MessageSquare, LayoutDashboard } from "lucide-react";
import { Tile, TileHubHeader } from "@/components/ui/TileHub";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function AuffassenHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayCount } = useQuery({
    queryKey: ["auffassen-today-count", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", user!.id)
        .eq("date", today);
      return count || 0;
    },
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["auffassen-unread", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count || 0;
    },
  });

  const todayFormatted = format(new Date(), "EEEE, d. MMMM", { locale: de });

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader title="Auffassen" subtitle="Dein Arbeitstag im Überblick" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile
          icon={<Calendar className="w-10 h-10 text-primary" />}
          title="Terminplaner"
          description="Termine planen und verwalten"
          status={todayCount ? `${todayCount} Termine heute` : undefined}
          onClick={() => navigate("/kalender")}
        />
        <Tile
          icon={<CheckSquare className="w-10 h-10 text-primary" />}
          title="Tages-Cockpit"
          description="Tour · Zeit · km · Sprit"
          onClick={() => navigate("/tour")}
        />
        <Tile
          icon={<MessageSquare className="w-10 h-10 text-primary" />}
          title="Nachrichten"
          description="Kundenkommunikation"
          status={unreadCount ? `${unreadCount} ungelesen` : undefined}
          onClick={() => navigate("/chat")}
        />
        <Tile
          icon={<LayoutDashboard className="w-10 h-10 text-primary" />}
          title="Tagesübersicht"
          description="Alle Termine heute"
          status={todayFormatted}
          onClick={() => navigate("/kalender")}
        />
      </div>
    </div>
  );
}
