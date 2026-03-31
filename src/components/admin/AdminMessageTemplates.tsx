import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Loader2, Save, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  default_priority: string;
  default_action_options: string[] | null;
  expires_in_days: number | null;
  last_used_at: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  info: "ℹ️ Info",
  offer: "🎁 Angebot",
  warning: "⚠️ Warnung",
  request: "📋 Anfrage",
  document: "📄 Dokument",
};

const VARIABLES = [
  "{{NUTZER_NAME}}", "{{PLAN_NAME}}", "{{PLAN_PREIS}}", "{{NEUER_PLAN}}",
  "{{NEUER_PREIS}}", "{{ABLAUFDATUM}}", "{{PROVIDER_ID}}",
  "{{ADMIN_NAME}}", "{{DATUM_HEUTE}}",
];

export default function AdminMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "info",
    subject_template: "",
    body_template: "",
    default_priority: "normal",
    default_action_options: [] as string[],
    has_actions: false,
    expires_in_days: "",
    custom_action: "",
  });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("admin_message_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEditor = (t?: MessageTemplate) => {
    if (t) {
      setEditId(t.id);
      const actions = Array.isArray(t.default_action_options) ? t.default_action_options : [];
      setForm({
        name: t.name,
        category: t.category,
        subject_template: t.subject_template,
        body_template: t.body_template,
        default_priority: t.default_priority,
        default_action_options: actions,
        has_actions: actions.length > 0,
        expires_in_days: t.expires_in_days?.toString() || "",
        custom_action: "",
      });
    } else {
      setEditId(null);
      setForm({
        name: "", category: "info", subject_template: "", body_template: "",
        default_priority: "normal", default_action_options: [], has_actions: false,
        expires_in_days: "", custom_action: "",
      });
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject_template.trim() || !form.body_template.trim()) {
      toast.error("Name, Betreff und Text sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        subject_template: form.subject_template.trim(),
        body_template: form.body_template.trim(),
        default_priority: form.default_priority,
        default_action_options: form.has_actions && form.default_action_options.length > 0
          ? form.default_action_options : null,
        expires_in_days: form.expires_in_days ? parseInt(form.expires_in_days) : null,
      };
      if (editId) {
        const { error } = await (supabase as any).from("admin_message_templates").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Baustein aktualisiert");
      } else {
        const { error } = await (supabase as any).from("admin_message_templates").insert(payload);
        if (error) throw error;
        toast.success("Baustein erstellt");
      }
      setEditorOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const addAction = () => {
    const val = form.custom_action.trim();
    if (val && !form.default_action_options.includes(val)) {
      setForm(p => ({ ...p, default_action_options: [...p.default_action_options, val], custom_action: "" }));
    }
  };

  const insertVariable = (v: string) => {
    setForm(p => ({ ...p, body_template: p.body_template + v }));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Schnellbausteine</h2>
          <Badge variant="secondary">{templates.length}</Badge>
        </div>
        <Button size="sm" onClick={() => openEditor()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Neuer Baustein
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Noch keine Bausteine vorhanden.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Priorität</TableHead>
                  <TableHead>Aktionen</TableHead>
                  <TableHead>Zuletzt verwendet</TableHead>
                  <TableHead className="text-right">Bearbeiten</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openEditor(t)}>
                    <TableCell className="font-medium text-sm">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.default_priority === "urgent" ? "destructive" : t.default_priority === "important" ? "default" : "outline"} className="text-xs capitalize">
                        {t.default_priority === "urgent" ? "Dringend" : t.default_priority === "important" ? "Wichtig" : "Normal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.default_action_options ? (t.default_action_options as string[]).join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.last_used_at ? format(new Date(t.last_used_at), "dd.MM.yy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditor(t); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Baustein bearbeiten" : "Neuer Schnellbaustein"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Plan-Upgrade Angebot" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategorie</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="offer">🎁 Angebot</SelectItem>
                    <SelectItem value="warning">⚠️ Warnung</SelectItem>
                    <SelectItem value="request">📋 Anfrage</SelectItem>
                    <SelectItem value="document">📄 Dokument</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Standard-Priorität</Label>
                <Select value={form.default_priority} onValueChange={v => setForm(p => ({ ...p, default_priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Wichtig</SelectItem>
                    <SelectItem value="urgent">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ablauf in Tagen (optional)</Label>
                <Input type="number" value={form.expires_in_days} onChange={e => setForm(p => ({ ...p, expires_in_days: e.target.value }))} placeholder="z.B. 14" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Betreff-Vorlage *</Label>
              <Input value={form.subject_template} onChange={e => setForm(p => ({ ...p, subject_template: e.target.value }))} placeholder="z.B. Upgrade für {{NUTZER_NAME}}" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Text-Vorlage *</Label>
              <Textarea value={form.body_template} onChange={e => setForm(p => ({ ...p, body_template: e.target.value }))} rows={8} className="font-mono text-xs" placeholder="Nachrichtentext mit {{VARIABLEN}}..." />
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map(v => (
                  <button key={v} onClick={() => insertVariable(v)} className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch checked={form.has_actions} onCheckedChange={v => setForm(p => ({ ...p, has_actions: v }))} />
                <Label className="text-sm">Standard-Aktionen definieren</Label>
              </div>
              {form.has_actions && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {form.default_action_options.map((b, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        {b}
                        <button onClick={() => setForm(p => ({ ...p, default_action_options: p.default_action_options.filter((_, j) => j !== i) }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={form.custom_action} onChange={e => setForm(p => ({ ...p, custom_action: e.target.value }))} placeholder="Button-Text..." className="h-8 text-xs flex-1" onKeyDown={e => e.key === "Enter" && addAction()} />
                    <Button variant="outline" size="sm" onClick={addAction} className="h-8">+</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { type MessageTemplate, VARIABLES };
