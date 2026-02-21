import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Plus, Loader2, Edit, Trash2, Clock, Euro } from "lucide-react";
import { toast } from "sonner";

export default function PartnerServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", base_price: "", duration: "", category: "", is_active: true });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["partner-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_services")
        .select("*")
        .eq("partner_id", user!.id)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        partner_id: user!.id,
        name: form.name,
        description: form.description || null,
        base_price: form.base_price ? parseFloat(form.base_price) : null,
        duration: form.duration ? parseInt(form.duration) : null,
        category: form.category || null,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from("partner_services").update(payload).eq("id", editId).eq("partner_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Leistung aktualisiert" : "Leistung erstellt");
      queryClient.invalidateQueries({ queryKey: ["partner-services"] });
      closeDialog();
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_services").delete().eq("id", id).eq("partner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leistung gelöscht");
      queryClient.invalidateQueries({ queryKey: ["partner-services"] });
    },
  });

  const openEdit = (service?: any) => {
    if (service) {
      setEditId(service.id);
      setForm({
        name: service.name, description: service.description || "",
        base_price: service.base_price?.toString() || "", duration: service.duration?.toString() || "",
        category: service.category || "", is_active: service.is_active,
      });
    } else {
      setEditId(null);
      setForm({ name: "", description: "", base_price: "", duration: "", category: "", is_active: true });
    }
    setEditOpen(true);
  };

  const closeDialog = () => { setEditOpen(false); setEditId(null); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leistungskatalog</h1>
        <Button onClick={() => openEdit()} className="gap-2">
          <Plus className="h-4 w-4" /> Neue Leistung
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : services.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Noch keine Leistungen definiert</p>
            <p className="text-sm text-muted-foreground mt-1">Erstellen Sie Ihren Leistungskatalog für schnellere Terminplanung und Rechnungserstellung.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((s: any) => (
            <Card key={s.id} className={`hover:shadow-sm transition-all ${!s.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>}
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {s.base_price && (
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Euro className="h-3 w-3" /> {Number(s.base_price).toFixed(2)}
                        </span>
                      )}
                      {s.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.duration} Min.
                        </span>
                      )}
                      {s.category && <Badge variant="outline" className="text-[10px]">{s.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Leistung bearbeiten" : "Neue Leistung"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><Label>Beschreibung</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preis (€)</Label><Input type="number" step="0.01" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} /></div>
              <div><Label>Dauer (Min.)</Label><Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
              <div><Label>Kategorie</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="z.B. Diagnostik" /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Abbrechen</Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.name}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
