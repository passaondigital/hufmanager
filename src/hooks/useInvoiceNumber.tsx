import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to generate the next invoice number for a provider
 * Uses the invoice_number_counters table and generate_invoice_number function
 */
export function useInvoiceNumber(userId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNextNumber = useCallback(async (): Promise<string | null> => {
    if (!userId) {
      setError("Kein Benutzer angemeldet");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the database function to generate the next invoice number
      const { data, error: rpcError } = await supabase
        .rpc("generate_invoice_number", { p_provider_id: userId });

      if (rpcError) {
        console.error("Invoice number generation error:", rpcError);
        setError("Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen.");
        return null;
      }

      return data as string;
    } catch (err) {
      console.error("Invoice number generation failed:", err);
      setError("Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const previewNextNumber = useCallback(async (): Promise<string> => {
    if (!userId) {
      return `RE-${new Date().getFullYear()}-0001`;
    }

    try {
      // Get the current counter without incrementing
      const { data: counter } = await supabase
        .from("invoice_number_counters")
        .select("last_number")
        .eq("provider_id", userId)
        .eq("year", new Date().getFullYear())
        .maybeSingle();

      const nextNumber = (counter?.last_number || 0) + 1;
      const year = new Date().getFullYear();
      return `RE-${year}-${nextNumber.toString().padStart(4, "0")}`;
    } catch {
      return `RE-${new Date().getFullYear()}-0001`;
    }
  }, [userId]);

  return {
    generateNextNumber,
    previewNextNumber,
    loading,
    error,
  };
}
