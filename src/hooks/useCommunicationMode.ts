import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type CommunicationMode = "not_set" | "whatsapp" | "hufmanager";

interface CommunicationModeResult {
  mode: CommunicationMode;
  whatsappNumber: string | null;
  isWhatsApp: boolean;
  isHufManager: boolean;
  isNotSet: boolean;
  isLoading: boolean;
  getWhatsAppLink: (phone: string, text?: string) => string;
  setMode: (mode: "whatsapp" | "hufmanager", whatsappNumber?: string) => Promise<void>;
}

export function useCommunicationMode(): CommunicationModeResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["communication-mode", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("communication_mode, whatsapp_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { communication_mode: string | null; whatsapp_number: string | null } | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const mode = (data?.communication_mode as CommunicationMode) || "not_set";
  const whatsappNumber = data?.whatsapp_number || null;

  const mutation = useMutation({
    mutationFn: async ({ newMode, number }: { newMode: "whatsapp" | "hufmanager"; number?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload: Record<string, unknown> = {
        communication_mode: newMode,
      };
      if (newMode === "whatsapp" && number) {
        payload.whatsapp_number = number;
      }

      if (existing) {
        const { error } = await supabase
          .from("business_settings")
          .update(payload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert({ user_id: user.id, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communication-mode", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["business-settings", user?.id] });
    },
  });

  const setMode = async (newMode: "whatsapp" | "hufmanager", number?: string) => {
    await mutation.mutateAsync({ newMode, number });
  };

  const getWhatsAppLink = (phone: string, text?: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const base = `https://wa.me/${cleanPhone}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  };

  return {
    mode,
    whatsappNumber,
    isWhatsApp: mode === "whatsapp",
    isHufManager: mode === "hufmanager",
    isNotSet: mode === "not_set",
    isLoading,
    getWhatsAppLink,
    setMode,
  };
}
