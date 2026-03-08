import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Building2, Eye, EyeOff, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "insurance", label: "Versicherung" },
  { value: "feed", label: "Futter" },
  { value: "equipment", label: "Equipment" },
  { value: "media", label: "Medien" },
  { value: "association", label: "Verband" },
  { value: "clinic", label: "Klinik" },
  { value: "pharma", label: "Pharma" },
  { value: "tech", label: "Technologie" },
  { value: "other", label: "Sonstiges" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-muted text-muted-foreground" },
  negotiating: { label: "In Verhandlung", color: "bg-yellow-500/10 text-yellow-600" },
  active: { label: "Aktiv", color: "bg-green-500/10 text-green-600" },
  paused: { label: "Pausiert", color: "bg-orange-500/10 text-orange-600" },
  terminated: { label: "Beendet", color: "bg-destructive/10 text-destructive" },
};

const VISIBILITY_MAP: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  hidden: { label: "Versteckt", icon: EyeOff },
  provider_only: { label: "Nur Provider", icon: Eye },
  public: { label: "Öffentlich", icon: Globe },
};

interface CooperationPartner {
  id: string;
  company_name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  status: string;
  visibility: string;
  badge_text: string | null;
  notes: string | null;
  created_at: string;
}

export function CooperationCenter() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<CooperationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [newPartner, setNewPartner] = useState({ company_name: "", category: "other", contact_name: "", contact_email: "", description: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data }, { data: settings }] = await Promise.all([
      supabase.from("cooperation_partners").select("*").order("priority", { ascending: false }),
      supabase.from("admin_settings").select("key, value").eq("key", "cooperation_module_enabled").maybeSingle(),
    ]);
    setPartners((data as any[]) || []);
    setModuleEnabled(settings?.value === true || settings?.value === "true");
    setLoading(false);
  };

  const toggleModule = async (enabled: boolean) => {
    setModuleEnabled(enabled);
    await supabase.from("admin_settings").update({ value: enabled, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("key", "cooperation_module_enabled");
    toast.success(enabled ? "Kooperations-Modul aktiviert" : "Kooperations-Modul deaktiviert");
  };

  const handleAdd = async () => {
    if (!newPartner.company_name || !newPartner.category) { toast.error("Name und Kategorie erforderlich"); return; }
    const { error } = await supabase.from("cooperation_partners").insert({
      company_name: newPartner.company_name,
      category: newPartner.category,
      contact_name: newPartner.contact_name || null,
      contact_email: newPartner.contact_email || null,
      description: newPartner.description || null,
      status: "prospect",
      visibility: "hidden",
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Partner hinzugefügt");
    setShowAddDialog(false);
    setNewPartner({ company_name: "", category: "other", contact_name: "", contact_email: "", description: "" });
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("cooperation_partners").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Status aktualisiert");
    fetchAll();
  };

  const updateVisibility = async (id: string, visibility: string) => {
    await supabase.from("cooperation_partners").update({ visibility, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Sichtbarkeit aktualisiert");
    fetchAll();
  };

  const filtered = filterCategory === "all" ? partners : partners.filter(p => p.category === filterCategory);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🏢 Kooperations Center</h2>
          <p className="text-muted-foreground">Partner & Kooperationen verwalten</p>
        </div>
        <div className="flex items-center gap-4">
          <ModuleToggle label="Kooperations-Modul" enabled={moduleEnabled} onToggle={toggleModule} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Partner hinzufügen</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuen Kooperationspartner anlegen</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Firma *</Label><Input value={newPartner.company_name} onChange={e => setNewPartner(p => ({ ...p, company_name: e.target.value }))} /></div>
                <div><Label>Kategorie *</Label>
                  <Select value={newPartner.category} onValueChange={v => setNewPartner(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Ansprechpartner</Label><Input value={newPartner.contact_name} onChange={e => setNewPartner(p => ({ ...p, contact_name: e.target.value }))} /></div>
                <div><Label>E-Mail</Label><Input value={newPartner.contact_email} onChange={e => setNewPartner(p => ({ ...p, contact_email: e.target.value }))} /></div>
                <div><Label>Beschreibung</Label><Textarea value={newPartner.description} onChange={e => setNewPartner(p => ({ ...p, description: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={handleAdd}>Anlegen</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filterCategory === "all" ? "default" : "outline"} onClick={() => setFilterCategory("all")}>Alle</Button>
        {CATEGORIES.map(c => (
          <Button key={c.value} size="sm" variant={filterCategory === c.value ? "default" : "outline"} onClick={() => setFilterCategory(c.value)}>{c.label}</Button>
        ))}
      </div>

      {/* Partner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => {
          const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.prospect;
          const visInfo = VISIBILITY_MAP[p.visibility] || VISIBILITY_MAP.hidden;
          const VisIcon = visInfo.icon;
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {p.company_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{CATEGORIES.find(c => c.value === p.category)?.label || p.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    <Badge variant="outline" className="text-xs"><VisIcon className="w-3 h-3 mr-1" />{visInfo.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.contact_name && <p className="text-sm">👤 {p.contact_name}</p>}
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                <div className="flex gap-2 pt-2">
                  <Select value={p.status} onValueChange={v => updateStatus(p.id, v)}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={p.visibility} onValueChange={v => updateVisibility(p.id, v)}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(VISIBILITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-muted-foreground">Keine Kooperationspartner in dieser Kategorie</div>}
      </div>
    </div>
  );
}

function ModuleToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <span className="text-sm font-medium">{label}:</span>
      {!enabled ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogTrigger asChild><Button size="sm" variant="outline">Aktivieren</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Modul aktivieren?</AlertDialogTitle><AlertDialogDescription>Provider werden dieses Modul ab sofort sehen.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={() => onToggle(true)}>Ja, aktivieren</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => onToggle(false)}>Deaktivieren</Button>
      )}
      <Badge variant={enabled ? "default" : "outline"}>{enabled ? "AN" : "AUS"}</Badge>
    </div>
  );
}
