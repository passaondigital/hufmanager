import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ClipboardList, Plus, Loader2, Target, TrendingUp } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  paused: "Pausiert",
  cancelled: "Abgebrochen",
};

export default function PartnerTreatmentPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    horse_id: "", title: "", description: "", diagnosis: "", goals: "",
    recommended_frequency: "", start_date: "", end_date: "",
    visible_to_pid: true, visible_to_kid: true,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["partner-treatment-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_plans")
        .select("*, horses:horse_id (name)")
        .eq("partner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: horses = [] } = useQuery({
    queryKey: ["partner-horses-for-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((d: any) => d.horses).filter(Boolean);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partner_treatment_plans").insert({
        partner_id: user!.id,
        horse_id: form.horse_id,
        title: form.title,
        description: form.description || null,
        diagnosis: form.diagnosis || null,
        goals: form.goals || null,
        recommended_frequency: form.recommended_frequency || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        visible_to_pid: form.visible_to_pid,
        visible_to_kid: form.visible_to_kid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Behandlungsplan erstellt");
      queryClient.invalidateQueries({ queryKey: ["partner-treatment-plans"] });
      setCreateOpen(false);
      setForm({ horse_id: "", title: "", description: "", diagnosis: "", goals: "", recommended_frequency: "", start_date: "", end_date: "", visible_to_pid: true, visible_to_kid: true });
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const updates: any = { progress_percent: progress };
      if (progress >= 100) updates.status = "completed";
      const { error } = await supabase.from("partner_treatment_plans").update(updates).eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-treatment-plans"] });
    },
  });

  const activePlans = plans.filter((p: any) => p.status === "active");
  const completedPlans = plans.filter((p: any) => p.status !== "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">Behandlungspläne <HelpTip id="partner.behandlungsplaene" /></h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Neuer Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Keine Behandlungspläne vorhanden</p>
            <p className="text-sm text-muted-foreground mt-1">Erstellen Sie strukturierte Therapiepläne mit Diagnose, Zielen und Fortschrittsverfolgung.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activePlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Aktive Pläne
                <Badge variant="default" className="text-xs">{activePlans.length}</Badge>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {activePlans.map((plan: any) => (
                  <Card key={plan.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{plan.title}</p>
                          <p className="text-xs text-muted-foreground">🐴 {plan.horses?.name}</p>
                        </div>
                        <Badge variant="default" className="text-[10px]">{STATUS_LABELS[plan.status]}</Badge>
                      </div>
                      {plan.diagnosis && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Diagnose</p>
                          <p className="text-sm">{plan.diagnosis}</p>
                        </div>
                      )}
                      {plan.goals && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Ziele</p>
                          <p className="text-sm">{plan.goals}</p>
                        </div>
                      )}
                      {plan.recommended_frequency && (
                        <p className="text-xs text-muted-foreground">📅 {plan.recommended_frequency}</p>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Fortschritt</span>
                          <span className="font-medium text-foreground">{plan.progress_percent}%</span>
                        </div>
                        <Progress value={plan.progress_percent} className="h-2" />
                        <Slider
                          value={[plan.progress_percent]}
                          max={100}
                          step={5}
                          onValueCommit={(v) => updateProgress.mutate({ id: plan.id, progress: v[0] })}
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Abgeschlossene & Pausierte
                <Badge variant="secondary" className="text-xs">{completedPlans.length}</Badge>
              </h2>
              <div className="grid gap-2">
                {completedPlans.map((plan: any) => (
                  <Card key={plan.id} className="opacity-75">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">🐴 {plan.horses?.name}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[plan.status]}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Behandlungsplan</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="z.B. Reha nach Sehnenverletzung" required />
            </div>
            <div>
              <Label>Pferd *</Label>
              <Select value={form.horse_id} onValueChange={v => setForm(p => ({ ...p, horse_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pferd auswählen" /></SelectTrigger>
                <SelectContent>
                  {horses.map((h: any) => <SelectItem key={h.id} value={h.id}>🐴 {h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Diagnose</Label>
              <Textarea value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Befund und Diagnose..." rows={2} />
            </div>
            <div>
              <Label>Therapieziele</Label>
              <Textarea value={form.goals} onChange={e => setForm(p => ({ ...p, goals: e.target.value }))} placeholder="Konkrete Behandlungsziele..." rows={2} />
            </div>
            <div>
              <Label>Empfohlene Frequenz</Label>
              <Input value={form.recommended_frequency} onChange={e => setForm(p => ({ ...p, recommended_frequency: e.target.value }))} placeholder="z.B. alle 4-6 Wochen, nach Bedarf" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>Ende (geplant)</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-sm font-medium">Sichtbarkeit</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Für Hufbearbeiter sichtbar</Label>
                <Switch checked={form.visible_to_pid} onCheckedChange={v => setForm(p => ({ ...p, visible_to_pid: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Für Pferdebesitzer sichtbar</Label>
                <Switch checked={form.visible_to_kid} onCheckedChange={v => setForm(p => ({ ...p, visible_to_kid: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={createMutation.isPending || !form.title || !form.horse_id}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
