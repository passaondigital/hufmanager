import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminTemplateManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    type: "nutzungsvertrag",
    plan: "all",
    version: "1.0",
    content_html: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("contract_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEditor = (template?: any) => {
    if (template) {
      setEditTemplate(template);
      setForm({
        name: template.name,
        type: template.type,
        plan: template.plan || "all",
        version: template.version,
        content_html: template.content_html,
        is_active: template.is_active,
      });
    } else {
      setEditTemplate(null);
      setForm({ name: "", type: "nutzungsvertrag", plan: "all", version: "1.0", content_html: "", is_active: true });
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.content_html) { toast.error("Name und Inhalt sind Pflicht"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        plan: form.plan === "all" ? null : form.plan,
        version: form.version,
        content_html: form.content_html,
        is_active: form.is_active,
      };
      if (editTemplate) {
        const { error } = await supabase.from("contract_templates").update(payload).eq("id", editTemplate.id);
        if (error) throw error;
        toast.success("Vorlage aktualisiert");
      } else {
        const { error } = await supabase.from("contract_templates").insert(payload);
        if (error) throw error;
        toast.success("Vorlage erstellt");
      }
      setShowEditor(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEditor()}><Plus className="h-4 w-4 mr-1.5" /> Neue Vorlage</Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Noch keine Vorlagen vorhanden.</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="secondary">{t.type}</Badge></TableCell>
                  <TableCell>{t.plan || "Alle"}</TableCell>
                  <TableCell>{t.version}</TableCell>
                  <TableCell>
                    <Badge className={t.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {t.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditor(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Template Editor Modal */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Nutzungsvertrag Pro 2026" />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nutzungsvertrag">Nutzungsvertrag</SelectItem>
                    <SelectItem value="partnervertrag">Partnervertrag</SelectItem>
                    <SelectItem value="avv">AVV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(p => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="duo">Duo</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Aktiv</Label>
            </div>
            <div className="space-y-2">
              <Label>HTML-Inhalt (mit {"{{Variablen}}"})</Label>
              <Textarea value={form.content_html} onChange={e => setForm(p => ({ ...p, content_html: e.target.value }))} rows={15} className="font-mono text-xs" placeholder="<h1>Nutzungsvertrag {{PLAN_NAME}}</h1>..." />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
