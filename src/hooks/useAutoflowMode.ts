import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type AutoflowMode = "basis" | "plus" | "premium";

const MODE_LABELS: Record<AutoflowMode, string> = {
  basis: "Basis",
  plus: "Plus",
  premium: "Premium",
};

const MODE_DESCRIPTIONS: Record<AutoflowMode, string> = {
  basis: "Neukunden-Automatisierung",
  plus: "Bestandskunden-Management",
  premium: "All-inkl. Vollautomatik",
};

export function useAutoflowMode() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AutoflowMode>("basis");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("autoflow_settings")
        .select("autoflow_mode")
        .eq("provider_id", user.id)
        .maybeSingle();

      if (data?.autoflow_mode) {
        setMode(data.autoflow_mode as AutoflowMode);
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const updateMode = async (newMode: AutoflowMode) => {
    if (!user?.id) return;

    const prev = mode;
    setMode(newMode);

    const { error } = await supabase
      .from("autoflow_settings")
      .upsert(
        { provider_id: user.id, autoflow_mode: newMode },
        { onConflict: "provider_id" }
      );

    if (error) {
      setMode(prev);
      toast({
        title: "Fehler",
        description: "AutoFlow-Modus konnte nicht geändert werden.",
        variant: "destructive",
      });
    } else {
      toast({
        title: `AutoFlow ${MODE_LABELS[newMode]}`,
        description: MODE_DESCRIPTIONS[newMode],
      });
    }
  };

  return { mode, updateMode, loading, MODE_LABELS, MODE_DESCRIPTIONS };
}
