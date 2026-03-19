import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ClientMode = "private" | "stall" | "commercial";

export interface ClientModeInfo {
  mode: ClientMode;
  label: string;
  description: string;
  isVerified: boolean;
  verificationStatus: string | null;
  companyName: string | null;
}

const MODE_LABELS: Record<ClientMode, string> = {
  private: "Pferdebesitzer",
  stall: "Stallbetreiber",
  commercial: "Gewerblich",
};

const MODE_DESCRIPTIONS: Record<ClientMode, string> = {
  private: "Für private Pferdehalter mit eigenen Pferden",
  stall: "Für Pensionsställe, Reiterhöfe und Stallbetriebe",
  commercial: "Für Züchter, Händler, Vereine und gewerbliche Betriebe",
};

export function useClientMode() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client-mode", user?.id],
    queryFn: async (): Promise<ClientModeInfo> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("client_type, is_verified_business, verification_status, company_name")
        .eq("id", user!.id)
        .single();

      const mode = (profile?.client_type as ClientMode) || "private";
      return {
        mode,
        label: MODE_LABELS[mode],
        description: MODE_DESCRIPTIONS[mode],
        isVerified: profile?.is_verified_business || false,
        verificationStatus: profile?.verification_status || null,
        companyName: profile?.company_name || null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const setMode = useMutation({
    mutationFn: async ({ mode, companyName }: { mode: ClientMode; companyName?: string }) => {
      const update: Record<string, unknown> = {
        client_type: mode,
        updated_at: new Date().toISOString(),
      };

      if (mode === "private") {
        // Reset business fields
        update.is_verified_business = false;
        update.verification_status = null;
        update.company_name = null;
      } else {
        // Set pending verification
        if (companyName) update.company_name = companyName;
        update.verification_status = "pending";
        update.verification_submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-mode", user?.id] });
    },
  });

  const needsVerification = data
    ? (data.mode === "stall" || data.mode === "commercial") && !data.isVerified
    : false;

  const isFeatureLocked = needsVerification && data?.verificationStatus !== "approved";

  return {
    mode: data?.mode || "private",
    modeInfo: data || { mode: "private" as ClientMode, label: "Pferdebesitzer", description: "", isVerified: false, verificationStatus: null, companyName: null },
    isLoading,
    setMode: setMode.mutate,
    isSettingMode: setMode.isPending,
    needsVerification,
    isFeatureLocked,
    MODE_LABELS,
    MODE_DESCRIPTIONS,
  };
}
