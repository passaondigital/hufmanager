import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Overlay for business clients whose verification is pending.
 * Read-only access: can explore but not create content.
 */
export function PendingVerificationOverlay() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["verification-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_status, verification_status, business_name")
        .eq("id", user!.id)
        .single();
      return data;
    },
    staleTime: 60_000,
  });

  if (!profile) return null;

  const status = (profile as any).account_status;
  const vStatus = (profile as any).verification_status;

  if (status === "pending_verification") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verifizierung läuft</h2>
          <p className="text-muted-foreground text-sm">
            Dein Gewerbe-Account „{(profile as any).business_name}" wird gerade geprüft.
            Wir melden uns innerhalb von 24 Stunden per E-Mail.
          </p>
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>Prüfung durch das Hufi-Team</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "verification_rejected") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Verifizierung abgelehnt</h2>
          <p className="text-muted-foreground text-sm">
            Dein Gewerbe-Nachweis konnte nicht verifiziert werden. 
            Bitte prüfe deine Benachrichtigungen für weitere Details oder lade einen neuen Nachweis hoch.
          </p>
          <Button onClick={() => window.location.href = "/client-profile"}>
            Zum Profil
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
