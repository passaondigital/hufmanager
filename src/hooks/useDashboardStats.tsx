import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, startOfWeek, endOfWeek, format } from "date-fns";

export interface DashboardStats {
  activeClients: number;
  activeClientsChange: string;
  appointmentsThisWeek: number;
  appointmentsToday: number;
  newLeads: number;
  unreadLeads: number;
  monthlyRevenue: number;
  revenueChangePercent: number;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) throw new Error("Nicht angemeldet");

      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const lastMonthStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      // Fetch all data in parallel
      const [
        clientsResult,
        appointmentsWeekResult,
        appointmentsTodayResult,
        leadsResult,
        invoicesThisMonthResult,
        invoicesLastMonthResult,
      ] = await Promise.all([
        // Count active clients (profiles created by this provider OR with active access grants)
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("created_by_provider_id", user.id)
          .is("deleted_at", null),
        
        // Count appointments this week
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .gte("date", format(weekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd")),
        
        // Count appointments today
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .eq("date", todayStr),
        
        // Count new leads
        supabase
          .from("leads")
          .select("id, status", { count: "exact" })
          .eq("provider_id", user.id)
          .eq("status", "neu"),
        
        // Sum invoices this month (paid)
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("provider_id", user.id)
          .eq("status", "paid")
          .gte("issue_date", format(monthStart, "yyyy-MM-dd")),
        
        // Sum invoices last month (paid) for comparison
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("provider_id", user.id)
          .eq("status", "paid")
          .gte("issue_date", format(lastMonthStart, "yyyy-MM-dd"))
          .lte("issue_date", format(lastMonthEnd, "yyyy-MM-dd")),
      ]);

      // Calculate revenue
      const thisMonthRevenue = invoicesThisMonthResult.data?.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      ) || 0;
      
      const lastMonthRevenue = invoicesLastMonthResult.data?.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      ) || 0;

      // Calculate percentage change
      let revenueChangePercent = 0;
      if (lastMonthRevenue > 0) {
        revenueChangePercent = Math.round(
          ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        );
      } else if (thisMonthRevenue > 0) {
        revenueChangePercent = 100;
      }

      return {
        activeClients: clientsResult.count || 0,
        activeClientsChange: `${clientsResult.count || 0} aktiv`,
        appointmentsThisWeek: appointmentsWeekResult.count || 0,
        appointmentsToday: appointmentsTodayResult.count || 0,
        newLeads: leadsResult.count || 0,
        unreadLeads: leadsResult.data?.filter(l => l.status === "neu").length || 0,
        monthlyRevenue: thisMonthRevenue,
        revenueChangePercent,
      };
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
}
