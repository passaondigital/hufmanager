import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wheat, Plus, Trash2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PferdeakteUserRole } from "./types";

interface Props {
  horseId: string;
  userRole: PferdeakteUserRole;
  horseName?: string;
}

const MEAL_OPTIONS = ["Morgens", "Mittags", "Abends", "Zusatz"] as const;
const FEED_TYPES = ["Heu", "Heulage", "Kraftfutter", "Müsli", "Mineralfutter", "Saftfutter", "Mash", "Öl", "Sonstiges"] as const;

interface FeedPlan {
  id: string;
  meal_name: string;
  feed_type: string;
  product_name: string | null;
  amount: string | null;
  notes: string | null;
  is_active: boolean;
  shared_with_stall: boolean;
  sort_order: number;
}

export function PferdeakteFutter({ horseId, userRole, horseName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ meal_name: "Morgens", feed_type: "Heu", product_name: "", amount: "", notes: "" });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["horse-feed-plans", horseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("horse_feed_plans")
        .select("*")
        .eq("horse_id", horseId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as FeedPlan[];
    },
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("horse_feed_plans").insert({
        horse_id: horseId,
        created_by: user!.id,
        meal_name: form.meal_name,
        feed_type: form.feed_type,
        product_name: form.product_name || null,
        amount: form.amount || null,
        notes: form.notes || null,
        sort_order: plans.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-feed-plans", horseId] });
      setShowForm(false);
      setForm({ meal_name: "Morgens", feed_type: "Heu", product_name: "", amount: "", notes: "" });
      toast.success("Futter hinzugefügt");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("horse_feed_plans").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-feed-plans", horseId] });
      toast.success("Entfernt");
    },
  });

  const toggleShare = useMutation({
    mutationFn: async ({ id, shared }: { id: string; shared: boolean }) => {
      const { error } = await (supabase as any).from("horse_feed_plans").update({ shared_with_stall: shared }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horse-feed-plans", horseId] });
      toast.success("Freigabe aktualisiert");
    },
  });

  const grouped = MEAL_OPTIONS.reduce((acc, meal) => {
    acc[meal] = plans.filter(p => p.meal_name === meal && p.is_active);
    return acc;
  }, {} as Record<string, FeedPlan[]>);

  const canEdit = userRole === "client" || userRole === "provider";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wheat className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-semibold text-foreground">Futterplan</h3>
          <Badge variant="secondary" className="text-xs">{plans.filter(p => p.is_active).length} Einträge</Badge>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mahlzeit</Label>
                <Select value={form.meal_name} onValueChange={v => setForm(f => ({ ...f, meal_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Futterart</Label>
                <Select value={form.feed_type} onValueChange={v => setForm(f => ({ ...f, feed_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEED_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Produkt (optional)</Label>
                <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="z.B. Agrobs AlpenHeu" />
              </div>
              <div>
                <Label className="text-xs">Menge</Label>
                <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="z.B. 2kg" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notizen</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. gewässert" />
            </div>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              Hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([meal, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={meal}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{meal}</p>
            <div className="space-y-2">
              {items.map(item => (
                <Card key={item.id} className="border-border/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{item.feed_type}</span>
                          {item.amount && <Badge variant="outline" className="text-xs">{item.amount}</Badge>}
                          {item.shared_with_stall && <Share2 className="h-3 w-3 text-primary" />}
                        </div>
                        {item.product_name && <p className="text-xs text-muted-foreground mt-0.5">{item.product_name}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{item.notes}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleShare.mutate({ id: item.id, shared: !item.shared_with_stall })} title={item.shared_with_stall ? "Stall-Freigabe aufheben" : "Mit Stall teilen"}>
                            <Share2 className={cn("h-3.5 w-3.5", item.shared_with_stall ? "text-primary" : "text-muted-foreground")} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {plans.filter(p => p.is_active).length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Wheat className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Noch kein Futterplan hinterlegt</p>
          {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Erstelle einen Plan, um die Fütterung zu dokumentieren</p>}
        </div>
      )}
    </div>
  );
}
