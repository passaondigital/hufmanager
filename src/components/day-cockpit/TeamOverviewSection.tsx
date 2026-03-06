import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Users, MapPin, Pause, CheckCircle2, Clock } from "lucide-react";

interface TeamMemberStatus {
  id: string;
  full_name: string;
  avatar_url: string | null;
  tourStatus: "idle" | "underway" | "paused" | "completed";
  appointmentCount: number;
  completedCount: number;
}

export function TeamOverviewSection() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-tour-overview", user?.id, today],
    staleTime: 30_000,
    queryFn: async (): Promise<TeamMemberStatus[]> => {
      if (!user?.id) return [];

      // Get employees for this provider
      const { data: employees } = await supabase
        .from("employee_profiles")
        .select("id, full_name, avatar_url, user_id")
        .eq("provider_id", user.id)
        .eq("status", "active");

      if (!employees?.length) return [];

      const userIds = employees
        .map(e => e.user_id)
        .filter((id): id is string => !!id);

      if (!userIds.length) return [];

      // Get daily tours for each employee
      const { data: tours } = await supabase
        .from("daily_tours")
        .select("provider_id, status, tour_active_since, tour_ended_at")
        .eq("tour_date", today)
        .in("provider_id", userIds);

      // Get appointment counts
      const { data: aptCounts } = await supabase
        .from("appointments")
        .select("provider_id, status")
        .eq("date", today)
        .in("provider_id", userIds)
        .neq("status", "cancelled");

      const tourMap = Object.fromEntries((tours || []).map(t => [t.provider_id, t]));
      const aptMap: Record<string, { total: number; completed: number }> = {};
      (aptCounts || []).forEach(a => {
        if (!aptMap[a.provider_id]) aptMap[a.provider_id] = { total: 0, completed: 0 };
        aptMap[a.provider_id].total++;
        if (a.status === "completed") aptMap[a.provider_id].completed++;
      });

      return employees.map(emp => {
        const tour = emp.user_id ? tourMap[emp.user_id] : null;
        const apts = emp.user_id ? aptMap[emp.user_id] : null;

        let tourStatus: TeamMemberStatus["tourStatus"] = "idle";
        if (tour?.tour_ended_at) tourStatus = "completed";
        else if (tour?.tour_active_since && tour?.status === "paused") tourStatus = "paused";
        else if (tour?.tour_active_since) tourStatus = "underway";

        return {
          id: emp.id,
          full_name: emp.full_name,
          avatar_url: emp.avatar_url,
          tourStatus,
          appointmentCount: apts?.total || 0,
          completedCount: apts?.completed || 0,
        };
      });
    },
    enabled: !!user?.id,
  });

  if (!teamMembers.length) return null;

  const statusConfig = {
    idle: { label: "Bereit", icon: <Clock className="h-3.5 w-3.5" />, color: "#666", bg: "#33333380" },
    underway: { label: "Unterwegs", icon: <MapPin className="h-3.5 w-3.5" />, color: "#22c55e", bg: "#22c55e20" },
    paused: { label: "Pause", icon: <Pause className="h-3.5 w-3.5" />, color: "#f59e0b", bg: "#f59e0b20" },
    completed: { label: "Fertig", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#3b82f6", bg: "#3b82f620" },
  };

  return (
    <div className="px-5 pb-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4" style={{ color: "#F5970A" }} />
        <span className="text-xs font-semibold" style={{ color: "#999" }}>Team heute</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {teamMembers.map(member => {
          const cfg = statusConfig[member.tourStatus];
          return (
            <div
              key={member.id}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#1a1a1a", minWidth: 140 }}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: member.avatar_url ? undefined : "#333",
                  color: "#ccc",
                  backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                  backgroundSize: "cover",
                }}
              >
                {!member.avatar_url && member.full_name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-white">{member.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  {member.appointmentCount > 0 && (
                    <span className="text-[10px]" style={{ color: "#666" }}>
                      {member.completedCount}/{member.appointmentCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
