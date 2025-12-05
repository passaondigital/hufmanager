import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface ReminderSettings {
  reminder_custom_text: string | null;
  reminder_intervals: string[];
}

const REMINDER_OPTIONS = [
  { id: "evening_before", label: "Am Vorabend (18:00)", description: "Erinnerung am Abend vor dem Termin" },
  { id: "6_hours", label: "6 Stunden vorher", description: "Erinnerung 6 Stunden vor dem Termin" },
  { id: "1_hour", label: "1 Stunde vorher", description: "Letzte Erinnerung kurz vor dem Termin" },
];

export function ReminderSettingsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [customText, setCustomText] = useState("");
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(["evening_before"]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings-reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("id, reminder_custom_text, reminder_intervals")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setCustomText(settings.reminder_custom_text || "");
      const intervals = settings.reminder_intervals as string[] | null;
      setSelectedIntervals(intervals || ["evening_before"]);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const updateData = {
        reminder_custom_text: customText || null,
        reminder_intervals: selectedIntervals,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update(updateData)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert({ user_id: user.id, ...updateData });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-reminders"] });
      toast({ title: "Gespeichert", description: "Erinnerungseinstellungen wurden aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const toggleInterval = (intervalId: string) => {
    setSelectedIntervals((prev) =>
      prev.includes(intervalId)
        ? prev.filter((id) => id !== intervalId)
        : [...prev, intervalId]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Termin-Kommunikation
        </CardTitle>
        <CardDescription>
          Konfigurieren Sie automatische Terminerinnerungen per E-Mail und In-App-Benachrichtigung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reminder Intervals */}
        <div className="space-y-4">
          <Label className="text-base">Erinnerungszeitpunkte</Label>
          <p className="text-sm text-muted-foreground">
            Wählen Sie, wann Ihre Kunden automatisch an bevorstehende Termine erinnert werden sollen.
          </p>
          <div className="space-y-3">
            {REMINDER_OPTIONS.map((option) => (
              <div
                key={option.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={option.id}
                  checked={selectedIntervals.includes(option.id)}
                  onCheckedChange={() => toggleInterval(option.id)}
                />
                <div className="flex-1">
                  <label
                    htmlFor={option.id}
                    className="text-sm font-medium cursor-pointer block"
                  >
                    {option.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Text */}
        <div className="space-y-2">
          <Label htmlFor="custom-text">Individueller Hinweis (optional)</Label>
          <Textarea
            id="custom-text"
            placeholder="z.B. Absagen unter 24 Stunden werden gemäß unseren AGB in Rechnung gestellt."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Dieser Text wird in jeder Erinnerungs-E-Mail angezeigt.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
