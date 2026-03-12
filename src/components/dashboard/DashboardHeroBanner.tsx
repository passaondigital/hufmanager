import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Inbox, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { isDemoEmail } from "@/lib/demo-accounts";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 22) return "Guten Abend";
  return "Gute Nacht";
}

interface DashboardHeroBannerProps {
  fullName?: string | null;
}

export function DashboardHeroBanner({ fullName }: DashboardHeroBannerProps) {
  const { user } = useAuth();
  const firstName = fullName?.split(" ")[0];
  const isDemo = isDemoEmail(user?.email);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Today's appointments count
  const { data: todayCount = 0 } = useQuery({
    queryKey: ["hero-today-count", user?.id, todayStr],
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", user!.id)
        .eq("date", todayStr)
        .in("status", ["scheduled", "confirmed"]);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Open leads count
  const { data: leadsCount = 0 } = useQuery({
    queryKey: ["hero-leads-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "neu");
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Active clients count
  const { data: clientsCount = 0 } = useQuery({
    queryKey: ["hero-clients-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("created_by_provider_id", user!.id)
        .is("deleted_at", null);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const stats = [
    { icon: Calendar, value: todayCount, label: "Termine heute" },
    { icon: Inbox, value: leadsCount, label: "Offene Anfragen" },
    { icon: Users, value: clientsCount, label: "Aktive Kunden" },
  ];

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: greeting + date */}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground truncate">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">
              {format(today, "EEEE, d. MMMM yyyy", { locale: de })}
            </p>
            {isDemo && <DemoBadge />}
          </div>
        </div>

        {/* Right: mini stats */}
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground tabular-nums">{value}</span>
              <span className="text-muted-foreground hidden lg:inline">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex sm:hidden items-center gap-4 mt-2 text-xs text-muted-foreground">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{value}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
