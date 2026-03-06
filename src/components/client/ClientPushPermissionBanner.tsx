import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isDemoEmail } from "@/lib/demo-accounts";
import { resolveProviderDisplayName } from "@/lib/pushNotificationService";

/**
 * Personalized push permission banner for client first login.
 * Shows provider name dynamically: "Möchtest du benachrichtigt werden wenn [Name] unterwegs ist?"
 */
export function ClientPushPermissionBanner() {
  const { isSupported, isSubscribed, permission, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const wasDismissed = localStorage.getItem("client-push-permission-dismissed");
    if (wasDismissed === "true") setDismissed(true);
  }, []);

  // Resolve connected provider name
  useEffect(() => {
    if (!user?.id) return;

    const resolve = async () => {
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (grant?.provider_id) {
        const name = await resolveProviderDisplayName(grant.provider_id);
        setProviderName(name);
      }
    };
    resolve();
  }, [user?.id]);

  if (isDemoEmail(user?.email)) return null;
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("client-push-permission-dismissed", "true");
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) setDismissed(true);
  };

  const displayName = providerName || "dein Hufpfleger";

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">
              Benachrichtigungen aktivieren?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Möchtest du benachrichtigt werden, wenn {displayName} unterwegs ist?
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={loading}
                className="gap-1.5 min-h-[44px]"
              >
                <Bell className="h-4 w-4" />
                {loading ? "Wird aktiviert..." : "Ja, gerne"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="min-h-[44px]"
              >
                Später
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
