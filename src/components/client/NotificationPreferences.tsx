import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpTip } from "@/components/ui/HelpTip";
import { Bell, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preference, setPreference] = useState("push");
  const [language, setLanguage] = useState("de");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    setSaving(false);
    if (!error) toast.success("Einstellung gespeichert");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Benachrichtigungen
          <HelpTip id="client.benachrichtigungen" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Push toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Push-Benachrichtigungen</Label>
          <PushNotificationToggle />
          <p className="text-xs text-muted-foreground">
            Erhalte Echtzeit-Updates wenn dein Hufpfleger unterwegs ist.
          </p>
        </div>

        {/* Preference */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Benachrichtigungskanal</Label>
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
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" />
            Sprache der Benachrichtigungen
          </Label>
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
              <SelectItem value="de">🇩🇪 Deutsch (DE)</SelectItem>
              <SelectItem value="at">🇦🇹 Deutsch (AT)</SelectItem>
              <SelectItem value="ch">🇨🇭 Deutsch (CH)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
