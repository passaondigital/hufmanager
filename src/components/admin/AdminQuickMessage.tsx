import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface AdminQuickMessageProps {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientReadableId?: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  subject_template: string;
  body_template: string;
  default_priority: string;
  default_action_options: string[] | null;
  expires_in_days: number | null;
}

function replaceVars(text: string, vars: Record<string, string>): string {
  let r = text;
  for (const [k, v] of Object.entries(vars)) r = r.split(k).join(v);
  return r;
}

export function AdminQuickMessage({ recipientId, recipientName, recipientEmail, recipientReadableId }: AdminQuickMessageProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [requiresAction, setRequiresAction] = useState(false);
  const [actionButtons, setActionButtons] = useState<string[]>([]);
  const [customButton, setCustomButton] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && templates.length === 0) {
      (supabase as any).from("admin_message_templates").select("id, name, subject_template, body_template, default_priority, default_action_options, expires_in_days").order("name")
        .then(({ data }: any) => { if (data) setTemplates(data); });
    }
  }, [open]);

  const getVars = (): Record<string, string> => ({
    "{{NUTZER_NAME}}": recipientName || "Nutzer",
    "{{PROVIDER_ID}}": recipientReadableId || recipientId.slice(0, 8),
    "{{ADMIN_NAME}}": "Pascal Schmid",
    "{{DATUM_HEUTE}}": format(new Date(), "dd.MM.yyyy"),
    "{{PLAN_NAME}}": "",
    "{{PLAN_PREIS}}": "",
    "{{NEUER_PLAN}}": "",
    "{{NEUER_PREIS}}": "",
    "{{ABLAUFDATUM}}": "",
  });

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const t = templates.find(t => t.id === templateId);
    if (!t) return;
    const vars = getVars();
    setSubject(replaceVars(t.subject_template, vars));
    setBody(replaceVars(t.body_template, vars));
    setPriority(t.default_priority);
    if (t.default_action_options && t.default_action_options.length > 0) {
      setRequiresAction(true);
      setActionButtons(t.default_action_options as string[]);
    } else {
      setRequiresAction(false);
      setActionButtons([]);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !user?.id) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("admin_messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject: subject.trim(),
        body: body.trim(),
        priority,
        requires_action: requiresAction,
        action_options: requiresAction && actionButtons.length > 0 ? actionButtons : null,
        status: "sent",
      });
      if (error) throw error;
      toast.success("Nachricht gesendet");
      setSubject("");
      setBody("");
      setPriority("normal");
      setRequiresAction(false);
      setActionButtons([]);
      setSelectedTemplateId("");
      setOpen(false);
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "Unbekannt"));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" />
        Nachricht senden
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-primary" />
          Nachricht an {recipientName || "Nutzer"}
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Template selector */}
      <Select value={selectedTemplateId} onValueChange={applyTemplate}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Schnellbaustein wählen…" />
        </SelectTrigger>
        <SelectContent>
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Betreff"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        className="h-8 text-xs"
      />

      <Textarea
        placeholder="Nachricht…"
        value={body}
        onChange={e => setBody(e.target.value)}
        className="min-h-[80px] text-xs resize-none"
      />

      <div className="flex items-center gap-3">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal" className="text-xs">Normal</SelectItem>
            <SelectItem value="important" className="text-xs">Wichtig</SelectItem>
            <SelectItem value="urgent" className="text-xs">Dringend</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Switch checked={requiresAction} onCheckedChange={setRequiresAction} className="scale-75" />
          <Label className="text-[10px] text-muted-foreground">Aktion nötig</Label>
        </div>
      </div>

      {requiresAction && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {actionButtons.map((b, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setActionButtons(prev => prev.filter((_, j) => j !== i))}>
                {b} <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              placeholder="Button hinzufügen"
              value={customButton}
              onChange={e => setCustomButton(e.target.value)}
              className="h-7 text-xs flex-1"
              onKeyDown={e => {
                if (e.key === "Enter" && customButton.trim()) {
                  setActionButtons(prev => [...prev, customButton.trim()]);
                  setCustomButton("");
                }
              }}
            />
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => {
              if (customButton.trim()) {
                setActionButtons(prev => [...prev, customButton.trim()]);
                setCustomButton("");
              }
            }}>+</Button>
          </div>
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-8 text-xs gap-1.5"
        disabled={!subject.trim() || !body.trim() || sending}
        onClick={handleSend}
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Senden
      </Button>
    </div>
  );
}
