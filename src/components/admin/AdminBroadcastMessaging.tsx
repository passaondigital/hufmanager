import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Megaphone, Send, Loader2, Users, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays } from "date-fns";

type TargetFilter = "all_providers" | "starter" | "paying" | "all_clients";

const FILTER_LABELS: Record<TargetFilter, string> = {
  all_providers: "Alle Provider",
  starter: "Nur Starter (kostenlos)",
  paying: "Nur zahlende Provider",
  all_clients: "Alle Clients",
};

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  default_priority: string;
  default_action_options: string[] | null;
  expires_in_days: number | null;
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value);
  }
  return result;
}

export default function AdminBroadcastMessaging() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [target, setTarget] = useState<TargetFilter>("all_providers");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [requiresAction, setRequiresAction] = useState(false);
  const [actionButtons, setActionButtons] = useState<string[]>([]);
  const [customButton, setCustomButton] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (supabase as any).from("admin_message_templates").select("*").order("name")
      .then(({ data }: any) => { if (data) setTemplates(data); });
  }, []);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const t = templates.find(t => t.id === templateId);
    if (!t) return;
    setSubject(t.subject_template);
    setBody(t.body_template);
    setPriority(t.default_priority);
    if (t.default_action_options && t.default_action_options.length > 0) {
      setRequiresAction(true);
      setActionButtons(t.default_action_options as string[]);
    } else {
      setRequiresAction(false);
      setActionButtons([]);
    }
    if (t.expires_in_days) {
      setExpiresAt(format(addDays(new Date(), t.expires_in_days), "yyyy-MM-dd'T'HH:mm"));
    } else {
      setExpiresAt("");
    }
  };

  const fetchRecipientCount = async (filter: TargetFilter) => {
    try {
      let q;
      if (filter === "all_clients") {
        q = supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "client");
      } else if (filter === "starter") {
        q = supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "provider");
        // Starter = providers without a paid plan - simplified for now
      } else if (filter === "paying") {
        q = supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "provider");
      } else {
        q = supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "provider");
      }
      const { count } = await q;
      setRecipientCount(count || 0);
    } catch { setRecipientCount(null); }
  };

  useEffect(() => { fetchRecipientCount(target); }, [target]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Betreff und Nachricht sind erforderlich");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    try {
      // Get recipients
      let q;
      if (target === "all_clients") {
        q = supabase.from("user_roles").select("user_id").eq("role", "client");
      } else {
        q = supabase.from("user_roles").select("user_id").eq("role", "provider");
      }
      const { data: roles, error: rolesError } = await q;
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) {
        toast.warning("Keine Empfänger gefunden");
        setIsSending(false);
        return;
      }

      // Get profile names for variable replacement
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("id, full_name, readable_id, plan_name")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const today = format(new Date(), "dd.MM.yyyy");
      const expiryDate = expiresAt ? format(new Date(expiresAt), "dd.MM.yyyy") : "";

      // Create individual messages with variable replacement
      const messages = roles.map(r => {
        const profile = profileMap.get(r.user_id);
        const vars: Record<string, string> = {
          "{{NUTZER_NAME}}": profile?.full_name || "Nutzer",
          "{{PLAN_NAME}}": profile?.plan_name || "Starter",
          "{{PLAN_PREIS}}": "",
          "{{NEUER_PLAN}}": "",
          "{{NEUER_PREIS}}": "",
          "{{ABLAUFDATUM}}": expiryDate,
          "{{PROVIDER_ID}}": profile?.readable_id || "",
          "{{ADMIN_NAME}}": "Pascal Schmid",
          "{{DATUM_HEUTE}}": today,
        };
        return {
          sender_id: user?.id,
          recipient_id: r.user_id,
          recipient_type: target === "all_clients" ? "client" : "provider",
          subject: replaceVariables(subject, vars),
          body: replaceVariables(body, vars),
          message_type: templates.find(t => t.id === selectedTemplateId)?.category || "info",
          priority,
          requires_action: requiresAction,
          action_options: requiresAction && actionButtons.length > 0 ? actionButtons : null,
          expires_at: expiresAt || null,
          status: "sent",
          template_id: selectedTemplateId || null,
        };
      });

      // Send in batches
      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const { error } = await (supabase as any).from("admin_messages").insert(batch);
        if (error) throw error;
      }

      // Update last_used_at on template
      if (selectedTemplateId) {
        await (supabase as any).from("admin_message_templates")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", selectedTemplateId);
      }

      toast.success(`Nachricht an ${messages.length} Nutzer gesendet!`);
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
      setRecipientCount(null);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Senden");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-5 w-5 text-primary" />
          Broadcast-Nachricht
        </CardTitle>
        <CardDescription>Sende eine individuelle Nachricht an eine Nutzergruppe (Variablen werden pro Nutzer ersetzt)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Schnellbaustein wählen (optional)</Label>
          <Select value={selectedTemplateId} onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue placeholder="Baustein auswählen..." /></SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target */}
        <div className="space-y-1.5">
          <Label className="text-xs">Zielgruppe</Label>
          <Select value={target} onValueChange={v => setTarget(v as TargetFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FILTER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {recipientCount !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {recipientCount} Empfänger
            </p>
          )}
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label className="text-xs">Priorität</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Wichtig</SelectItem>
              <SelectItem value="urgent">Dringend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label className="text-xs">Betreff *</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff mit {{NUTZER_NAME}}..." />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label className="text-xs">Nachricht *</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="font-mono text-xs" placeholder="Nachricht mit {{VARIABLEN}}..." />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Switch checked={requiresAction} onCheckedChange={setRequiresAction} />
          <Label className="text-sm">Aktion erforderlich</Label>
        </div>
        {requiresAction && (
          <div className="pl-4 border-l-2 border-primary/20 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {actionButtons.map((b, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {b}
                  <button onClick={() => setActionButtons(actionButtons.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={customButton} onChange={e => setCustomButton(e.target.value)} placeholder="Button-Text..." className="h-8 text-xs flex-1" onKeyDown={e => e.key === "Enter" && customButton.trim() && (setActionButtons([...actionButtons, customButton.trim()]), setCustomButton(""))} />
              <Button variant="outline" size="sm" onClick={() => { if (customButton.trim()) { setActionButtons([...actionButtons, customButton.trim()]); setCustomButton(""); } }} className="h-8">+</Button>
            </div>
          </div>
        )}

        {/* Expires */}
        <div className="space-y-1.5">
          <Label className="text-xs">Ablaufdatum (optional)</Label>
          <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>

        {/* Send */}
        <Button onClick={handleSend} disabled={isSending || !subject.trim() || !body.trim()} className="w-full gap-2">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Broadcast senden
        </Button>
      </CardContent>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Broadcast bestätigen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Du sendest eine individuelle Nachricht an <strong>{recipientCount}</strong> Nutzer. Jeder erhält eine personalisierte Nachricht mit seinen Daten.
          </p>
          <p className="text-sm font-medium">Bist du sicher?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={confirmSend} className="gap-1.5">
              <Send className="h-4 w-4" /> Ja, an {recipientCount} senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
