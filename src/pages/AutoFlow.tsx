import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  CalendarClock,
  FileText,
  Star,
  Bell,
  CalendarCheck,
  Loader2,
  Save,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Power,
  PowerOff,
  Wand2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AutoFlowSetupWizard } from "@/components/autoflow/AutoFlowSetupWizard";

interface AutoFlowSettings {
  id?: string;
  provider_id: string;
  auto_schedule_enabled: boolean;
  auto_schedule_mode: string;
  preferred_slot_days: number;
  group_by_plz: boolean;
  auto_invoice_enabled: boolean;
  auto_invoice_trigger: string;
  default_service_id: string | null;
  auto_feedback_enabled: boolean;
  feedback_delay_hours: number;
  feedback_channel: string;
  auto_reminder_enabled: boolean;
  reminder_hours_before: number;
  monthly_checkin_enabled: boolean;
  last_checkin_at: string | null;
  next_checkin_at: string | null;
  autoflow_mode: string;
}

interface AutoFlowLogEntry {
  id: string;
  action_type: string;
  entity_type: string | null;
  status: string;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  lead_to_appointment: "Lead → Termin",
  auto_invoice: "Auto-Rechnung",
  feedback_sent: "Feedback-Erinnerung",
  checkin_sent: "Monatlicher Check-In",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-primary" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
  pending: <Clock className="h-4 w-4 text-accent-foreground" />,
};

const AutoFlow = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  const defaultSettings: AutoFlowSettings = {
    provider_id: user?.id || "",
    auto_schedule_enabled: false,
    auto_schedule_mode: "suggest",
    preferred_slot_days: 7,
    group_by_plz: true,
    auto_invoice_enabled: false,
    auto_invoice_trigger: "after_signature",
    default_service_id: null,
    auto_feedback_enabled: true,
    feedback_delay_hours: 24,
    feedback_channel: "push",
    auto_reminder_enabled: true,
    reminder_hours_before: 24,
    monthly_checkin_enabled: true,
    last_checkin_at: null,
    next_checkin_at: null,
    autoflow_mode: "basis",
  };

  const [settings, setSettings] = useState<AutoFlowSettings>(defaultSettings);

  // Fetch settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["autoflow-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("autoflow_settings")
        .select("*")
        .eq("provider_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch log
  const { data: logs = [] } = useQuery({
    queryKey: ["autoflow-log", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("autoflow_log")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as AutoFlowLogEntry[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings as AutoFlowSettings);
    } else if (user?.id) {
      setSettings({ ...defaultSettings, provider_id: user.id });
    }
  }, [savedSettings, user?.id]);

  // Show wizard on first visit (no saved settings)
  useEffect(() => {
    if (!isLoading && !savedSettings && user?.id) {
      setWizardOpen(true);
    }
  }, [isLoading, savedSettings, user?.id]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (s: AutoFlowSettings) => {
      if (!user?.id) throw new Error("Not authenticated");
      const payload = {
        provider_id: user.id,
        auto_schedule_enabled: s.auto_schedule_enabled,
        auto_schedule_mode: s.auto_schedule_mode,
        preferred_slot_days: s.preferred_slot_days,
        group_by_plz: s.group_by_plz,
        auto_invoice_enabled: s.auto_invoice_enabled,
        auto_invoice_trigger: s.auto_invoice_trigger,
        default_service_id: s.default_service_id,
        auto_feedback_enabled: s.auto_feedback_enabled,
        feedback_delay_hours: s.feedback_delay_hours,
        feedback_channel: s.feedback_channel,
        auto_reminder_enabled: s.auto_reminder_enabled,
        reminder_hours_before: s.reminder_hours_before,
        monthly_checkin_enabled: s.monthly_checkin_enabled,
        autoflow_mode: s.autoflow_mode || "basis",
      };

      if (s.id) {
        const { error } = await supabase
          .from("autoflow_settings")
          .update(payload)
          .eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("autoflow_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoflow-settings"] });
      toast({ title: "AutoFlow gespeichert", description: "Deine Automatisierungseinstellungen wurden aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    },
  });

  // Deactivate all
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const deactivated = {
        auto_schedule_enabled: false,
        auto_invoice_enabled: false,
        auto_feedback_enabled: false,
        auto_reminder_enabled: false,
        monthly_checkin_enabled: false,
      };
      
      if (settings.id) {
        const { error } = await supabase
          .from("autoflow_settings")
          .update(deactivated)
          .eq("id", settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoflow-settings"] });
      toast({ title: "AutoFlow deaktiviert", description: "Alle Automatisierungen wurden pausiert." });
    },
    onError: () => {
      toast({ title: "Fehler", variant: "destructive" });
    },
  });

  const update = (partial: Partial<AutoFlowSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const enabledCount = [
    settings.auto_schedule_enabled,
    settings.auto_invoice_enabled,
    settings.auto_feedback_enabled,
    settings.auto_reminder_enabled,
  ].filter(Boolean).length;

  const isActive = enabledCount > 0;

  const handleWizardComplete = (wizardSettings: any) => {
    const merged = { ...settings, ...wizardSettings };
    setSettings(merged);
    saveMutation.mutate(merged);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AutoFlow</h1>
            <p className="text-muted-foreground text-sm">
              {enabledCount}/4 Automatisierungen aktiv
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <Wand2 className="h-4 w-4 mr-1.5" />
            Assistent
          </Button>
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <PowerOff className="h-4 w-4 mr-1.5" />
              Deaktivieren
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWizardOpen(true)}
            >
              <Power className="h-4 w-4 mr-1.5" />
              Aktivieren
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Inactive Banner */}
      {!isActive && savedSettings && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <PowerOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AutoFlow ist pausiert</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Alle Automatisierungen sind deaktiviert. Starte den Assistenten um AutoFlow wieder zu aktivieren.
              </p>
            </div>
            <Button onClick={() => setWizardOpen(true)}>
              <Wand2 className="h-4 w-4 mr-2" />
              Einrichtungsassistent starten
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settings Cards - show when active or no saved settings yet */}
      {(isActive || !savedSettings) && (
        <>
          {/* 1. Lead → Termin */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Lead → Termin</CardTitle>
                    <CardDescription>Neukundenanfragen automatisch in Termine umwandeln</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_schedule_enabled}
                  onCheckedChange={(v) => update({ auto_schedule_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.auto_schedule_enabled && (
              <CardContent className="space-y-4 pt-0">
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Modus</Label>
                    <Select value={settings.auto_schedule_mode} onValueChange={(v) => update({ auto_schedule_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Voll-Automatisch (nächster freier Slot)</SelectItem>
                        <SelectItem value="suggest">Vorschläge (du bestätigst)</SelectItem>
                        <SelectItem value="manual">Client bucht selbst (Booking-Link)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Zeitfenster: {settings.preferred_slot_days} Tage</Label>
                    <Slider value={[settings.preferred_slot_days]} onValueChange={([v]) => update({ preferred_slot_days: v })} min={3} max={30} step={1} />
                    <p className="text-xs text-muted-foreground">Suche freie Termine in den nächsten {settings.preferred_slot_days} Tagen</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Nach PLZ gruppieren</Label>
                      <p className="text-xs text-muted-foreground">Termine in gleicher Gegend bündeln</p>
                    </div>
                    <Switch checked={settings.group_by_plz} onCheckedChange={(v) => update({ group_by_plz: v })} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 2. Auto-Rechnung */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Auto-Rechnung</CardTitle>
                    <CardDescription>Rechnungen automatisch erstellen und hinterlegen</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_invoice_enabled}
                  onCheckedChange={(v) => update({ auto_invoice_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.auto_invoice_enabled && (
              <CardContent className="space-y-4 pt-0">
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-sm">Auslöser</Label>
                  <Select value={settings.auto_invoice_trigger} onValueChange={(v) => update({ auto_invoice_trigger: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_completion">Bei Termin-Abschluss ("Erledigt")</SelectItem>
                      <SelectItem value="after_signature">Nach digitaler Unterschrift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 3. Feedback-Erinnerung */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Feedback-Erinnerung</CardTitle>
                    <CardDescription>Kunden automatisch zur Bewertung einladen</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_feedback_enabled}
                  onCheckedChange={(v) => update({ auto_feedback_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.auto_feedback_enabled && (
              <CardContent className="space-y-4 pt-0">
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-sm">Verzögerung: {settings.feedback_delay_hours} Stunden</Label>
                  <Slider value={[settings.feedback_delay_hours]} onValueChange={([v]) => update({ feedback_delay_hours: v })} min={1} max={72} step={1} />
                  <p className="text-xs text-muted-foreground">Feedback-Erinnerung {settings.feedback_delay_hours}h nach Termin-Abschluss</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Kanal</Label>
                  <Select value={settings.feedback_channel} onValueChange={(v) => update({ feedback_channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push-Benachrichtigung</SelectItem>
                      <SelectItem value="email">E-Mail</SelectItem>
                      <SelectItem value="both">Beides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 4. Termin-Erinnerungen */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Termin-Erinnerungen</CardTitle>
                    <CardDescription>Automatische Erinnerungen an Kunden</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_reminder_enabled}
                  onCheckedChange={(v) => update({ auto_reminder_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.auto_reminder_enabled && (
              <CardContent className="space-y-4 pt-0">
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-sm">Vorlauf: {settings.reminder_hours_before} Stunden</Label>
                  <Slider value={[settings.reminder_hours_before]} onValueChange={([v]) => update({ reminder_hours_before: v })} min={1} max={72} step={1} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 5. Monatlicher Check-In */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Monatlicher Check-In</CardTitle>
                    <CardDescription>System fragt: "Passen deine AutoFlow-Einstellungen noch?"</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.monthly_checkin_enabled}
                  onCheckedChange={(v) => update({ monthly_checkin_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.monthly_checkin_enabled && settings.next_checkin_at && (
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <p className="text-xs text-muted-foreground">
                  Nächster Check-In: {format(new Date(settings.next_checkin_at), "dd. MMMM yyyy", { locale: de })}
                </p>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Activity Log */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Aktivitätsprotokoll</CardTitle>
                <CardDescription>Letzte automatische Aktionen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {STATUS_ICONS[log.status] || STATUS_ICONS.pending}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ACTION_LABELS[log.action_type] || log.action_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    </div>
                    <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Setup Wizard */}
      <AutoFlowSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleWizardComplete}
        initialSettings={{ ...settings, autoflow_mode: (settings.autoflow_mode as "basis" | "plus" | "premium") || "basis" }}
      />
    </div>
  );
};

export default AutoFlow;
