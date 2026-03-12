import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Syringe, Bug, Plus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logHorseAction } from "@/utils/auditLog";
import { differenceInDays } from "date-fns";

interface TabImpfungEntwurmungProps {
  horseId: string;
}

interface Vaccination {
  id: string;
  vaccine_type: string;
  vaccine_name: string | null;
  vaccination_date: string;
  next_due_date: string | null;
  batch_number: string | null;
  administered_by: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
}

interface Deworming {
  id: string;
  product_name: string;
  active_substance: string | null;
  deworming_date: string;
  next_due_date: string | null;
  dosage_ml: number | null;
  weight_at_time_kg: number | null;
  administered_by: string | null;
  fecal_egg_count: number | null;
  notes: string | null;
  created_at: string;
}

function getStatusColor(nextDueDate: string | null): { color: string; label: string } {
  if (!nextDueDate) return { color: "bg-muted text-muted-foreground", label: "Kein Datum" };
  const days = differenceInDays(new Date(nextDueDate), new Date());
  if (days < 0) return { color: "bg-destructive text-destructive-foreground", label: "Überfällig" };
  if (days < 30) return { color: "bg-yellow-500 text-white", label: "Bald fällig" };
  return { color: "bg-green-500 text-white", label: "Aktuell" };
}

function getStatusDot(nextDueDate: string | null): string {
  if (!nextDueDate) return "⚪";
  const days = differenceInDays(new Date(nextDueDate), new Date());
  if (days < 0) return "🔴";
  if (days < 30) return "🟡";
  return "🟢";
}

export function TabImpfungEntwurmung({ horseId }: TabImpfungEntwurmungProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVaccModal, setShowVaccModal] = useState(false);
  const [showDewormModal, setShowDewormModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vaccination form
  const [vaccForm, setVaccForm] = useState({
    vaccine_type: "", vaccine_name: "", vaccination_date: "",
    next_due_date: "", batch_number: "", administered_by: "", notes: "",
  });

  // Deworming form
  const [dewormForm, setDewormForm] = useState({
    product_name: "", active_substance: "", deworming_date: "",
    next_due_date: "", dosage_ml: "", weight_at_time_kg: "",
    administered_by: "", fecal_egg_count: "", notes: "",
  });

  useEffect(() => {
    fetchData();
    logHorseAction(horseId, "view_vaccinations");
  }, [horseId]);

  const fetchData = async () => {
    setLoading(true);
    const [vaccRes, dewormRes] = await Promise.all([
      supabase.from("horse_vaccinations")
        .select("id, vaccine_type, vaccine_name, vaccination_date, next_due_date, batch_number, administered_by, document_url, notes, created_at")
        .eq("horse_id", horseId)
        .order("vaccination_date", { ascending: false }),
      supabase.from("horse_deworming")
        .select("id, product_name, active_substance, deworming_date, next_due_date, dosage_ml, weight_at_time_kg, administered_by, fecal_egg_count, notes, created_at")
        .eq("horse_id", horseId)
        .order("deworming_date", { ascending: false }),
    ]);
    setVaccinations((vaccRes.data || []) as Vaccination[]);
    setDewormings((dewormRes.data || []) as Deworming[]);
    setLoading(false);
  };

  const saveVaccination = async () => {
    if (!vaccForm.vaccine_type || !vaccForm.vaccination_date) {
      toast.error("Impftyp und Datum sind erforderlich");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("horse_vaccinations").insert({
        horse_id: horseId,
        vaccine_type: vaccForm.vaccine_type,
        vaccine_name: vaccForm.vaccine_name || null,
        vaccination_date: vaccForm.vaccination_date,
        next_due_date: vaccForm.next_due_date || null,
        batch_number: vaccForm.batch_number || null,
        administered_by: vaccForm.administered_by || null,
        notes: vaccForm.notes || null,
      } as any);
      if (error) throw error;
      await logHorseAction(horseId, "add_vaccination", { vaccine_type: vaccForm.vaccine_type });
      toast.success("Impfung eingetragen");
      setShowVaccModal(false);
      setVaccForm({ vaccine_type: "", vaccine_name: "", vaccination_date: "", next_due_date: "", batch_number: "", administered_by: "", notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const saveDeworming = async () => {
    if (!dewormForm.product_name || !dewormForm.deworming_date) {
      toast.error("Produkt und Datum sind erforderlich");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("horse_deworming").insert({
        horse_id: horseId,
        product_name: dewormForm.product_name,
        active_substance: dewormForm.active_substance || null,
        deworming_date: dewormForm.deworming_date,
        next_due_date: dewormForm.next_due_date || null,
        dosage_ml: dewormForm.dosage_ml ? parseFloat(dewormForm.dosage_ml) : null,
        weight_at_time_kg: dewormForm.weight_at_time_kg ? parseFloat(dewormForm.weight_at_time_kg) : null,
        administered_by: dewormForm.administered_by || null,
        fecal_egg_count: dewormForm.fecal_egg_count ? parseInt(dewormForm.fecal_egg_count) : null,
        notes: dewormForm.notes || null,
      } as any);
      if (error) throw error;
      await logHorseAction(horseId, "add_deworming", { product: dewormForm.product_name });
      toast.success("Entwurmung eingetragen");
      setShowDewormModal(false);
      setDewormForm({ product_name: "", active_substance: "", deworming_date: "", next_due_date: "", dosage_ml: "", weight_at_time_kg: "", administered_by: "", fecal_egg_count: "", notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="impfpass">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="impfpass" className="flex items-center gap-1.5">
            <Syringe className="h-4 w-4" />
            Impfpass
          </TabsTrigger>
          <TabsTrigger value="entwurmung" className="flex items-center gap-1.5">
            <Bug className="h-4 w-4" />
            Entwurmung
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impfpass" className="space-y-3 mt-3">
          <Button size="sm" onClick={() => setShowVaccModal(true)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Impfung eintragen
          </Button>
          {vaccinations.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">Noch keine Impfungen eingetragen</CardContent></Card>
          ) : (
            vaccinations.map(v => {
              const status = getStatusColor(v.next_due_date);
              return (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getStatusDot(v.next_due_date)}</span>
                          <span className="font-semibold text-foreground">{v.vaccine_type}</span>
                          <span className="text-sm text-muted-foreground">
                            · {new Date(v.vaccination_date).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                        {v.vaccine_name && (
                          <p className="text-sm text-muted-foreground">
                            {v.vaccine_name}
                            {v.batch_number && <> · Ch: {v.batch_number}</>}
                          </p>
                        )}
                        {v.administered_by && (
                          <p className="text-sm text-muted-foreground">{v.administered_by}</p>
                        )}
                        {v.next_due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Nächste: {new Date(v.next_due_date).toLocaleDateString("de-DE")}
                          </p>
                        )}
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                    {v.document_url && (
                      <Button variant="ghost" size="sm" className="mt-2 text-xs" asChild>
                        <a href={v.document_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-3 w-3 mr-1" /> Dokument ansehen
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="entwurmung" className="space-y-3 mt-3">
          <Button size="sm" onClick={() => setShowDewormModal(true)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Entwurmung eintragen
          </Button>
          {dewormings.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">Noch keine Entwurmungen eingetragen</CardContent></Card>
          ) : (
            dewormings.map(d => {
              const status = getStatusColor(d.next_due_date);
              return (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getStatusDot(d.next_due_date)}</span>
                          <span className="font-semibold text-foreground">{d.product_name}</span>
                          <span className="text-sm text-muted-foreground">
                            · {new Date(d.deworming_date).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                        {d.active_substance && (
                          <p className="text-sm text-muted-foreground">Wirkstoff: {d.active_substance}</p>
                        )}
                        {d.administered_by && (
                          <p className="text-sm text-muted-foreground">{d.administered_by}</p>
                        )}
                        {d.fecal_egg_count != null && (
                          <p className="text-sm text-muted-foreground">Kotprobe: {d.fecal_egg_count} EPG</p>
                        )}
                        {d.next_due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Nächste: {new Date(d.next_due_date).toLocaleDateString("de-DE")}
                          </p>
                        )}
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Vaccination Modal */}
      <Dialog open={showVaccModal} onOpenChange={setShowVaccModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Impfung eintragen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Impftyp *</Label>
              <Input value={vaccForm.vaccine_type} onChange={e => setVaccForm(f => ({ ...f, vaccine_type: e.target.value }))} placeholder="z.B. Influenza, Herpes, Tetanus" />
            </div>
            <div>
              <Label>Impfstoff</Label>
              <Input value={vaccForm.vaccine_name} onChange={e => setVaccForm(f => ({ ...f, vaccine_name: e.target.value }))} placeholder="Handelsname" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Datum *</Label><Input type="date" value={vaccForm.vaccination_date} onChange={e => setVaccForm(f => ({ ...f, vaccination_date: e.target.value }))} /></div>
              <div><Label>Nächste fällig</Label><Input type="date" value={vaccForm.next_due_date} onChange={e => setVaccForm(f => ({ ...f, next_due_date: e.target.value }))} /></div>
            </div>
            <div><Label>Chargennummer</Label><Input value={vaccForm.batch_number} onChange={e => setVaccForm(f => ({ ...f, batch_number: e.target.value }))} /></div>
            <div><Label>Verabreicht durch</Label><Input value={vaccForm.administered_by} onChange={e => setVaccForm(f => ({ ...f, administered_by: e.target.value }))} placeholder="Name des Tierarztes" /></div>
            <div><Label>Notizen</Label><Textarea value={vaccForm.notes} onChange={e => setVaccForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVaccModal(false)}>Abbrechen</Button>
            <Button onClick={saveVaccination} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deworming Modal */}
      <Dialog open={showDewormModal} onOpenChange={setShowDewormModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Entwurmung eintragen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produkt *</Label><Input value={dewormForm.product_name} onChange={e => setDewormForm(f => ({ ...f, product_name: e.target.value }))} placeholder="z.B. Equest Pramox" /></div>
            <div><Label>Wirkstoff</Label><Input value={dewormForm.active_substance} onChange={e => setDewormForm(f => ({ ...f, active_substance: e.target.value }))} placeholder="z.B. Ivermectin" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Datum *</Label><Input type="date" value={dewormForm.deworming_date} onChange={e => setDewormForm(f => ({ ...f, deworming_date: e.target.value }))} /></div>
              <div><Label>Nächste fällig</Label><Input type="date" value={dewormForm.next_due_date} onChange={e => setDewormForm(f => ({ ...f, next_due_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Dosierung (ml)</Label><Input type="number" step="0.1" value={dewormForm.dosage_ml} onChange={e => setDewormForm(f => ({ ...f, dosage_ml: e.target.value }))} /></div>
              <div><Label>Gewicht (kg)</Label><Input type="number" step="0.1" value={dewormForm.weight_at_time_kg} onChange={e => setDewormForm(f => ({ ...f, weight_at_time_kg: e.target.value }))} /></div>
            </div>
            <div><Label>Kotprobe (EPG)</Label><Input type="number" value={dewormForm.fecal_egg_count} onChange={e => setDewormForm(f => ({ ...f, fecal_egg_count: e.target.value }))} placeholder="Eier pro Gramm" /></div>
            <div><Label>Verabreicht durch</Label><Input value={dewormForm.administered_by} onChange={e => setDewormForm(f => ({ ...f, administered_by: e.target.value }))} /></div>
            <div><Label>Notizen</Label><Textarea value={dewormForm.notes} onChange={e => setDewormForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDewormModal(false)}>Abbrechen</Button>
            <Button onClick={saveDeworming} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
