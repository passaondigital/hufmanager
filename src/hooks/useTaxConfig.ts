/**
 * Hook: Provides the current provider's tax configuration.
 * Use this anywhere prices are displayed to determine netto/brutto formatting.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VAT_RATES, type TaxConfig, type PriceDisplayMode } from "@/lib/taxConfig";

const DEFAULT_CONFIG: TaxConfig = {
  kleinunternehmer: false,
  mwstPflichtig: false,
  vatRate: 19,
  priceDisplayMode: "netto",
  country: "DE",
  legalForm: null,
};

export function useTaxConfig(providerId?: string): TaxConfig {
  const { user } = useAuth();
  const uid = providerId || user?.id;

  const { data } = useQuery({
    queryKey: ["tax-config", uid],
    queryFn: async () => {
      if (!uid) return DEFAULT_CONFIG;

      const { data: bs } = await supabase
        .from("business_settings")
        .select("kleine_unternehmer, mwst_pflichtig, default_vat_rate, price_display_mode, tax_country, legal_form")
        .eq("user_id", uid)
        .maybeSingle();

      if (!bs) return DEFAULT_CONFIG;

      return {
        kleinunternehmer: bs.kleine_unternehmer ?? false,
        mwstPflichtig: bs.mwst_pflichtig ?? false,
        vatRate: bs.default_vat_rate ?? VAT_RATES[(bs.tax_country as string) || "DE"]?.standard ?? 19,
        priceDisplayMode: ((bs as any).price_display_mode as PriceDisplayMode) || "netto",
        country: bs.tax_country || "DE",
        legalForm: (bs as any).legal_form || null,
      } satisfies TaxConfig;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return data || DEFAULT_CONFIG;
}
