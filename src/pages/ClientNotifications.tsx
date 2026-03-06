import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpTip } from "@/components/ui/HelpTip";
import { ClientBottomNav } from "@/components/client/ClientBottomNav";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { Bell, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientNotifications() {
  const { user } = useAuth();
  const [preference, setPreference] = useState("push");
  const [language, setLanguage] = useState("de");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notification_preference, notification_language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPreference((data as any).notification_preference || "push");
          setLanguage((data as any).notification_language || "de");
        }
        setLoading(false);
      });
  }, [user]);

  const save = async (field: string, value: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
    if (!error) toast.success("Einstellung gespeichert");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Benachrichtigungen</h1>
          <HelpTip id="client.notifications" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Push toggle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Push-Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PushNotificationToggle />
            <p className="text-xs text-muted-foreground">
              Erhalte Echtzeit-Updates wenn dein Hufpfleger unterwegs ist.
            </p>
          </CardContent>
        </Card>

        {/* Granular push preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Benachrichtigungskanal</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={preference}
              onValueChange={(v) => {
                setPreference(v);
                save("notification_preference", v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push">Nur Push</SelectItem>
                <SelectItem value="email">Nur E-Mail</SelectItem>
                <SelectItem value="both">Push + E-Mail</SelectItem>
                <SelectItem value="none">Keine</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Sprache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={language}
              onValueChange={(v) => {
                setLanguage(v);
                save("notification_language", v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                <SelectItem value="at">🇦🇹 Österreichisch</SelectItem>
                <SelectItem value="ch">🇨🇭 Schweizerdeutsch</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <ClientBottomNav />
    </div>
  );
}
