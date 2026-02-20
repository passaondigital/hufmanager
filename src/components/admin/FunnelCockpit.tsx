import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Plus, Search, UserPlus, Calendar, CheckCircle2, 
  Phone, Mail, MapPin, Building2, Loader2, 
  TrendingUp, Users, Target, ArrowRight, Trash2, Edit2
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LeadStatus = "neu" | "kontaktiert" | "demo_gebucht" | "demo_durchgeführt" | "angebot" | "gewonnen" | "verloren";

interface FunnelLead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  demo_booked_at: string | null;
  demo_completed_at: string | null;
  converted_at: string | null;
  postal_code: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
  neu: { label: "Neu", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: UserPlus },
  kontaktiert: { label: "Kontaktiert", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Phone },
  demo_gebucht: { label: "Demo gebucht", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Calendar },
  demo_durchgeführt: { label: "Demo ✓", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: CheckCircle2 },
  angebot: { label: "Angebot", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Target },
  gewonnen: { label: "Gewonnen", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: TrendingUp },
  verloren: { label: "Verloren", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Trash2 },
};

const SOURCES = ["website", "empfehlung", "social_media", "messe", "direkt", "partner", "sonstige"];

export function FunnelCockpit() {
  const [leads, setLeads] = useState<FunnelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<FunnelLead | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    source: "website",
    status: "neu" as LeadStatus,
    notes: "",
    postal_code: "",
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("funnel_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Fehler beim Laden der Leads");
    } else {
      setLeads((data as FunnelLead[]) || []);
    }
    setLoading(false);
  };

  const openNewLead = () => {
    setEditingLead(null);
    setForm({ full_name: "", email: "", phone: "", company_name: "", source: "website", status: "neu", notes: "", postal_code: "" });
    setDialogOpen(true);
  };

  const openEditLead = (lead: FunnelLead) => {
    setEditingLead(lead);
    setForm({
      full_name: lead.full_name,
      email: lead.email || "",
      phone: lead.phone || "",
      company_name: lead.company_name || "",
      source: lead.source || "website",
      status: lead.status as LeadStatus,
      notes: lead.notes || "",
      postal_code: lead.postal_code || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      company_name: form.company_name || null,
      source: form.source,
      status: form.status,
      notes: form.notes || null,
      postal_code: form.postal_code || null,
      demo_booked_at: form.status === "demo_gebucht" && !editingLead?.demo_booked_at ? new Date().toISOString() : editingLead?.demo_booked_at || null,
      demo_completed_at: form.status === "demo_durchgeführt" && !editingLead?.demo_completed_at ? new Date().toISOString() : editingLead?.demo_completed_at || null,
      converted_at: form.status === "gewonnen" && !editingLead?.converted_at ? new Date().toISOString() : editingLead?.converted_at || null,
    };

    let error;
    if (editingLead) {
      ({ error } = await supabase.from("funnel_leads").update(payload).eq("id", editingLead.id));
    } else {
      ({ error } = await supabase.from("funnel_leads").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success(editingLead ? "Lead aktualisiert" : "Lead erstellt");
      setDialogOpen(false);
      fetchLeads();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("funnel_leads").delete().eq("id", id);
    if (error) toast.error("Fehler: " + error.message);
    else {
      toast.success("Lead gelöscht");
      fetchLeads();
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = !search || 
      lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "alle" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === "neu").length;
  const demosBooked = leads.filter(l => ["demo_gebucht", "demo_durchgeführt", "angebot", "gewonnen"].includes(l.status)).length;
  const converted = leads.filter(l => l.status === "gewonnen").length;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Gesamt Leads", value: totalLeads, icon: Users, color: "text-primary" },
          { label: "Neue Leads", value: newLeads, icon: UserPlus, color: "text-blue-500" },
          { label: "Demos gebucht", value: demosBooked, icon: Calendar, color: "text-purple-500" },
          { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-green-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNewLead} className="gap-2">
          <Plus className="h-4 w-4" /> Lead
        </Button>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Keine Leads gefunden</p>
            <Button variant="outline" className="mt-3" onClick={openNewLead}>Ersten Lead anlegen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => {
            const statusCfg = STATUS_CONFIG[lead.status as LeadStatus] || STATUS_CONFIG.neu;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={lead.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEditLead(lead)}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{lead.full_name}</p>
                        <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                        {lead.postal_code && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.postal_code}</span>}
                        {lead.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company_name}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(lead.created_at), "dd.MM.yy", { locale: de })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle>{editingLead ? "Lead bearbeiten" : "Neuer Lead"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="p-4 sm:p-6 pt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">E-Mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Telefon</Label>
                  <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Betrieb</Label>
                  <Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">PLZ</Label>
                  <Input value={form.postal_code} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quelle</Label>
                  <Select value={form.source} onValueChange={(v) => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <cfg.icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Notizen</Label>
                <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>

              {/* Timeline badges for existing leads */}
              {editingLead && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {editingLead.demo_booked_at && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Demo: {format(new Date(editingLead.demo_booked_at), "dd.MM.yy")}
                    </Badge>
                  )}
                  {editingLead.converted_at && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Konvertiert: {format(new Date(editingLead.converted_at), "dd.MM.yy")}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 sm:p-6 pt-0 flex gap-2">
            {editingLead && (
              <Button variant="destructive" size="sm" onClick={() => { handleDelete(editingLead.id); setDialogOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
