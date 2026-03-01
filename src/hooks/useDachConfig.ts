import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type DachCountry,
  formatCurrency as dachFormatCurrency,
  formatDate as dachFormatDate,
  formatTime as dachFormatTime,
  getVatConfig,
  getVatLabel,
  getCurrencySymbol,
  getCurrencyCode,
  getCountryDefaults,
  calculateVat,
  roundToRappen,
} from "@/lib/dach";

/**
 * Hook to access the current user's DACH country and locale-aware formatting functions.
 * Falls back to "DE" if no country is set.
 */
export function useDachConfig() {
  const { user } = useAuth();

  const { data: country } = useQuery({
    queryKey: ["user-country", user?.id],
    queryFn: async (): Promise<DachCountry> => {
      if (!user?.id) return "DE";
      const { data } = await supabase
        .from("profiles")
        .select("country")
        .eq("id", user.id)
        .maybeSingle();
      return (data?.country as DachCountry) || "DE";
    },
    enabled: !!user?.id,
    staleTime: Infinity,
    initialData: "DE" as DachCountry,
  });

  const c = country || "DE";

  return {
    country: c,
    currency: getCurrencyCode(c),
    currencySymbol: getCurrencySymbol(c),
    vatConfig: getVatConfig(c),
    vatLabel: getVatLabel(c),
    defaults: getCountryDefaults(c),
    
    // Formatting
    formatCurrency: useCallback((amount: number) => dachFormatCurrency(amount, c), [c]),
    formatDate: useCallback((date: string | Date) => dachFormatDate(date, c), [c]),
    formatTime: useCallback((date: string | Date) => dachFormatTime(date, c), [c]),
    calculateVat: useCallback(
      (amount: number, vatRate: number, fromGross = true) => calculateVat(amount, vatRate, c, fromGross),
      [c]
    ),
    roundToRappen: useCallback(
      (amount: number) => (c === "CH" ? roundToRappen(amount) : amount),
      [c]
    ),
  };
}
