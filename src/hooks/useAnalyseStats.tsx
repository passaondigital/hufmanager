import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfYear, endOfYear, startOfMonth, format, subYears } from "date-fns";

export interface MonthlyData {
  month: string;
  umsatz: number;
  termine: number;
}

export interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AnalyseStats {
  yearlyRevenue: number;
  yearlyRevenueChange: number;
  yearlyAppointments: number;
  yearlyAppointmentsChange: number;
  activeClients: number;
  activeClientsChange: number;
  avgPerAppointment: number;
  avgPerAppointmentChange: number;
  monthlyData: MonthlyData[];
  serviceDistribution: ServiceDistribution[];
}

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const SERVICE_COLORS: Record<string, string> = {
  "Barhuf": "hsl(150, 35%, 35%)",
  "Beschlag": "hsl(25, 80%, 50%)",
  "Korrektur": "hsl(40, 70%, 50%)",
  "Sonstiges": "hsl(30, 10%, 45%)",
};

export function useAnalyseStats(year: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["analyse-stats", user?.id, year],
    queryFn: async (): Promise<AnalyseStats> => {
      if (!user) throw new Error("Nicht angemeldet");

      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 0, 1));
      const prevYearStart = startOfYear(subYears(yearStart, 1));
      const prevYearEnd = endOfYear(subYears(yearStart, 1));

      // Fetch all data in parallel
      const [
        invoicesThisYear,
        invoicesLastYear,
        appointmentsThisYear,
        appointmentsLastYear,
        clientsResult,
        servicesResult,
      ] = await Promise.all([
        // Invoices this year
        supabase
          .from("invoices")
          .select("total_amount, issue_date")
          .eq("provider_id", user.id)
          .eq("status", "paid")
          .gte("issue_date", format(yearStart, "yyyy-MM-dd"))
          .lte("issue_date", format(yearEnd, "yyyy-MM-dd")),
        
        // Invoices last year
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("provider_id", user.id)
          .eq("status", "paid")
          .gte("issue_date", format(prevYearStart, "yyyy-MM-dd"))
          .lte("issue_date", format(prevYearEnd, "yyyy-MM-dd")),
        
        // Appointments this year
        supabase
          .from("appointments")
          .select("id, date, service_type")
          .eq("provider_id", user.id)
          .gte("date", format(yearStart, "yyyy-MM-dd"))
          .lte("date", format(yearEnd, "yyyy-MM-dd")),
        
        // Appointments last year
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("provider_id", user.id)
          .gte("date", format(prevYearStart, "yyyy-MM-dd"))
          .lte("date", format(prevYearEnd, "yyyy-MM-dd")),
        
        // Active clients count
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("created_by_provider_id", user.id)
          .is("deleted_at", null),
        
        // Services for distribution
        supabase
          .from("services")
          .select("name, category")
          .eq("provider_id", user.id)
          .eq("is_active", true),
      ]);

      // Calculate yearly revenue
      const yearlyRevenue = invoicesThisYear.data?.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      ) || 0;

      const lastYearRevenue = invoicesLastYear.data?.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      ) || 0;

      const yearlyRevenueChange = lastYearRevenue > 0
        ? Math.round(((yearlyRevenue - lastYearRevenue) / lastYearRevenue) * 100)
        : yearlyRevenue > 0 ? 100 : 0;

      // Calculate appointments
      const yearlyAppointments = appointmentsThisYear.data?.length || 0;
      const lastYearAppointments = appointmentsLastYear.count || 0;
      const yearlyAppointmentsChange = lastYearAppointments > 0
        ? Math.round(((yearlyAppointments - lastYearAppointments) / lastYearAppointments) * 100)
        : yearlyAppointments > 0 ? 100 : 0;

      // Active clients
      const activeClients = clientsResult.count || 0;

      // Average per appointment
      const avgPerAppointment = yearlyAppointments > 0
        ? Math.round(yearlyRevenue / yearlyAppointments)
        : 0;

      // Build monthly data
      const monthlyData: MonthlyData[] = MONTHS.map((month, index) => {
        const monthStart = startOfMonth(new Date(year, index, 1));
        const monthStr = format(monthStart, "yyyy-MM");
        
        const monthRevenue = invoicesThisYear.data?.filter(inv => 
          inv.issue_date?.startsWith(monthStr)
        ).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        const monthAppointments = appointmentsThisYear.data?.filter(app =>
          app.date?.startsWith(monthStr)
        ).length || 0;

        return {
          month,
          umsatz: monthRevenue,
          termine: monthAppointments,
        };
      });

      // Build service distribution from appointments
      const serviceTypeCounts: Record<string, number> = {};
      appointmentsThisYear.data?.forEach(app => {
        const type = app.service_type || "Sonstiges";
        serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
      });

      const totalAppointments = yearlyAppointments || 1; // Avoid division by zero
      const serviceDistribution: ServiceDistribution[] = Object.entries(serviceTypeCounts)
        .map(([name, count]) => ({
          name,
          value: Math.round((count / totalAppointments) * 100),
          color: SERVICE_COLORS[name] || SERVICE_COLORS["Sonstiges"],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      // If no service data, return empty array (not mock data)
      if (serviceDistribution.length === 0 && yearlyAppointments === 0) {
        // Return empty - no fake data
      }

      return {
        yearlyRevenue,
        yearlyRevenueChange,
        yearlyAppointments,
        yearlyAppointmentsChange,
        activeClients,
        activeClientsChange: 0, // Would need additional query to calculate
        avgPerAppointment,
        avgPerAppointmentChange: 0, // Would need additional query to calculate
        monthlyData,
        serviceDistribution,
      };
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
}
