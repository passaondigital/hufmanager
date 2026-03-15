import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Calendar, Euro } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  interval_weeks: number;
  price_monthly: number;
  max_horses: number;
  includes: string[];
  is_active: boolean;
}

export function SubscriptionPlansManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", interval_weeks: "8", price_monthly: "", max_horses: "1", includes: "",
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, interval_weeks, price_monthly, max_horses, includes, is_active")
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
    enabled: !!user?.id,
  });

  const { data: subCounts = {} } = useQuery({
    queryKey: ["subscription-counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select("plan_id, status")
        .eq("provider_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => { counts[s.plan_id] = (counts[s.plan_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subscription_plans").insert({
        provider_id: user!.id,
        name: form.name,
        description: form.description || null,
        interval_weeks: parseInt(form.interval_weeks),
        price_monthly: parseFloat(form.price_monthly),
        max_horses: parseInt(form.max_horses),
        includes: form.includes.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Abo-Modell erstellt");
      setOpen(false);
      setForm({ name: "", description: "", interval_weeks: "8", price_monthly: "", max_horses: "1", includes: "" });
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("subscription_plans").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Status aktualisiert");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Abo-Modelle</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Neues Abo-Modell</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neues Abo-Modell erstellen</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Barhuf Basis" /></div>
              <div><Label>Beschreibung</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Intervall (Wochen)</Label>
                  <Select value={form.interval_weeks} onValueChange={(v) => setForm({ ...form, interval_weeks: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 12].map((w) => (<SelectItem key={w} value={`${w}`}>{w} Wochen</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Preis/Monat (€)</Label><Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} placeholder="49" /></div>
              </div>
              <div><Label>Max. Pferde</Label><Input type="number" value={form.max_horses} onChange={(e) => setForm({ ...form, max_horses: e.target.value })} /></div>
              <div><Label>Enthaltene Leistungen (Komma-getrennt)</Label><Input value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} placeholder="barhuf, fotos, bericht" /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.name || !form.price_monthly || createMutation.isPending}>
                {createMutation.isPending ? "Erstelle..." : "Abo-Modell erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Laden...</p>}

      {plans.map((plan) => (
        <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{plan.name}</h3>
                {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{plan.interval_weeks} Wochen</span>
                  <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{plan.price_monthly}€/Monat</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{subCounts[plan.id] || 0} aktiv</span>
                </div>
                {plan.includes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plan.includes.map((i) => <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>)}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleMutation.mutate({ id: plan.id, is_active: !plan.is_active })}
              >
                {plan.is_active ? "Deaktivieren" : "Aktivieren"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!isLoading && plans.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Noch keine Abo-Modelle. Erstelle dein erstes Modell um Kunden regelmäßige Hufpflege anzubieten.
        </CardContent></Card>
      )}
    </div>
  );
}
