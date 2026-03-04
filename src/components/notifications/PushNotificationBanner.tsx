import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";

export function PushNotificationBanner() {
  const { isSupported, isSubscribed, permission, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();

  // Check if the user previously dismissed this banner
  useEffect(() => {
    const wasDismissed = localStorage.getItem("push-banner-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Track login count for real users
  useEffect(() => {
    if (user?.id && !isDemoEmail(user.email)) {
      const key = `hm_login_count_${user.id}`;
      const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
      localStorage.setItem(key, String(count));
    }
  }, [user?.id]);

  // Don't show for demo users
  if (isDemoEmail(user?.email)) return null;

  // Don't show before second login
  const loginCount = parseInt(localStorage.getItem(`hm_login_count_${user?.id}`) || "0", 10);
  if (loginCount < 2) return null;

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission denied
  // - User dismissed it
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">Push-Benachrichtigungen aktivieren</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Erhalte wichtige Termine und Nachrichten direkt auf dein Gerät – auch wenn die App geschlossen ist.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleEnable}
                disabled={loading}
              >
                {loading ? "Aktivieren..." : "Jetzt aktivieren"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDismiss}
              >
                Später
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
