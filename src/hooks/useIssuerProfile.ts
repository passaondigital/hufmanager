import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IssuerProfile {
  name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
  iban: string;
  bic: string;
  account_holder: string;
  tax_note: string;
  tax_id: string;
}

const DEFAULT_ISSUER: IssuerProfile = {
  name: "Pascal Christian Schmid",
  company: "Hufi",
  address: "Pascal Schmid c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven",
  email: "kontakt@hufiapp.de",
  phone: "0152 0900 7017",
  iban: "DE66 2020 2080 0002 8383 704",
  bic: "SXPYDEHH",
  account_holder: "Pascal Christian Schmid",
  tax_note: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.",
  tax_id: "",
};

export function useIssuerProfile() {
  const [profile, setProfile] = useState<IssuerProfile>(DEFAULT_ISSUER);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "issuer_profile")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") {
      setProfile({ ...DEFAULT_ISSUER, ...(data.value as Record<string, string>) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (updated: IssuerProfile) => {
    const { error } = await supabase
      .from("admin_settings")
      .update({ value: updated as any, updated_at: new Date().toISOString() })
      .eq("key", "issuer_profile");
    if (error) throw error;
    setProfile(updated);
  }, []);

  return { profile, loading, save, refetch: fetch };
}
