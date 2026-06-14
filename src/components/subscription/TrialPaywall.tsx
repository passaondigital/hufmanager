import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Sparkles } from "lucide-react";
import { useState } from "react";

/**
 * Nicht-blockierender Hinweis-Banner, wenn account_status 'expired' ist.
 * Trial-Ablauf = Downgrade auf Starter (Limits greifen automatisch über
 * feature_statuses), KEINE Sperre — gemäß Trial-Downgrade-Policy.
 * Echte Kündigungen laufen über subscription_status='cancelled' (separat).
 */
export function TrialPaywall() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-trial-status", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("account_status, trial_ends_at, full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  if (dismissed || !profile || (profile as any).account_status !== "expired") return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur shadow-lg px-4 py-3 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground flex-1 leading-snug">
          <span className="font-medium">Testzeitraum beendet</span> — Starter-Limits gelten jetzt.
          <span className="text-muted-foreground"> Jetzt upgraden für mehr.</span>
        </p>
        <Button
          size="sm"
          className="gap-1 shrink-0"
          onClick={() => window.open("https://hufiapp.de/#preise", "_blank")}
        >
          Upgraden <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          aria-label="Hinweis schließen"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
