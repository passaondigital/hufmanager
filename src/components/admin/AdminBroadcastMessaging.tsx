import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Megaphone, Send, Loader2, Users, AlertTriangle, X, User, Search } from "lucide-react";
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

interface ProfileResult {
  id: string;
  full_name: string | null;
  email: string | null;
  readable_id: string | null;
}

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
  const [mode, setMode] = useState<"single" | "broadcast">("single");
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

  // Single recipient search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<ProfileResult | null>(null);

  useEffect(() => {
    (supabase as any).from("admin_message_templates").select("*").order("name")
      .then(({ data }: any) => { if (data) setTemplates(data); });
  }, []);

  // Debounced search
  const searchProfiles = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const term = q.trim();
      let query = (supabase as any).from("profiles")
        .select("id, full_name, email, readable_id")
        .is("deleted_at", null)
        .limit(10);

      // Check if searching by ID prefix
      if (term.startsWith("#") || /^(PID|KID|PRID|EID|EQID)/i.test(term)) {
        const cleanId = term.replace(/^#/, "");
        query = query.ilike("readable_id", `%${cleanId}%`);
      } else if (term.includes("@")) {
        query = query.ilike("email", `%${term}%`);
      } else {
        query = query.or(`full_name.ilike.%${term}%,readable_id.ilike.%${term}%,email.ilike.%${term}%`);
      }

      const { data } = await query;
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchProfiles(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchProfiles]);

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
    if (mode === "single") {
      if (!selectedRecipient) {
        toast.error("Bitte wähle einen Empfänger aus");
        return;
      }
      await sendSingleMessage();
    } else {
      setConfirmOpen(true);
    }
  };

  const sendSingleMessage = async () => {
    if (!selectedRecipient || !user) return;
    setIsSending(true);
    try {
      const today = format(new Date(), "dd.MM.yyyy");
      const expiryDate = expiresAt ? format(new Date(expiresAt), "dd.MM.yyyy") : "";
      const vars: Record<string, string> = {
        "{{NUTZER_NAME}}": selectedRecipient.full_name || "Nutzer",
        "{{PLAN_NAME}}": "",
        "{{PLAN_PREIS}}": "",
        "{{NEUER_PLAN}}": "",
        "{{NEUER_PREIS}}": "",
        "{{ABLAUFDATUM}}": expiryDate,
        "{{PROVIDER_ID}}": selectedRecipient.readable_id || "",
        "{{ADMIN_NAME}}": "Pascal Schmid",
        "{{DATUM_HEUTE}}": today,
      };

      const { error } = await (supabase as any).from("admin_messages").insert({
        sender_id: user.id,
        recipient_id: selectedRecipient.id,
        recipient_type: selectedRecipient.readable_id?.startsWith("KID") ? "client" : "provider",
        subject: replaceVariables(subject, vars),
        body: replaceVariables(body, vars),
        message_type: templates.find(t => t.id === selectedTemplateId)?.category || "info",
        priority,
        requires_action: requiresAction,
        action_options: requiresAction && actionButtons.length > 0 ? actionButtons : null,
        expires_at: expiresAt || null,
        status: "sent",
        template_id: selectedTemplateId || null,
      });
      if (error) throw error;

      if (selectedTemplateId) {
        await (supabase as any).from("admin_message_templates")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", selectedTemplateId);
      }

      toast.success(`Nachricht an ${selectedRecipient.full_name || selectedRecipient.email} gesendet!`);
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
      setSelectedRecipient(null);
      setSearchQuery("");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Senden");
    } finally {
      setIsSending(false);
    }
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    try {
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

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await (supabase as any).from("profiles")
        .select("id, full_name, readable_id")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const today = format(new Date(), "dd.MM.yyyy");
      const expiryDate = expiresAt ? format(new Date(expiresAt), "dd.MM.yyyy") : "";

      const messages = roles.map(r => {
        const profile = profileMap.get(r.user_id) as any;
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

      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const { error } = await (supabase as any).from("admin_messages").insert(batch);
        if (error) throw error;
      }

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

  // Shared form fields
  const renderMessageForm = () => (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-1.5">
        <Label className="text-xs">Schnellbaustein (optional)</Label>
        <Select value={selectedTemplateId} onValueChange={applyTemplate}>
          <SelectTrigger><SelectValue placeholder="Baustein auswählen..." /></SelectTrigger>
          <SelectContent>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div className="space-y-1.5">
        <Label className="text-xs">Betreff *</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff mit {{NUTZER_NAME}}..." />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Nachricht *</Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="font-mono text-xs" placeholder="Nachricht mit {{VARIABLEN}}..." />
      </div>

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

      <div className="space-y-1.5">
        <Label className="text-xs">Ablaufdatum (optional)</Label>
        <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-5 w-5 text-primary" />
          Nachricht senden
        </CardTitle>
        <CardDescription>Einzelnachricht oder Broadcast an Nutzergruppen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={v => setMode(v as "single" | "broadcast")}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1 gap-1.5">
              <User className="h-3.5 w-3.5" /> Einzelnachricht
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="flex-1 gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Broadcast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            {/* Recipient Search */}
            <div className="space-y-1.5">
              <Label className="text-xs">Empfänger suchen (Name, E-Mail, #PID, #KID...)</Label>
              {selectedRecipient ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedRecipient.full_name || "Unbenannt"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedRecipient.readable_id && <span className="font-mono mr-2">{selectedRecipient.readable_id}</span>}
                      {selectedRecipient.email}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setSelectedRecipient(null); setSearchQuery(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="#PID-001, Max Mustermann, max@..."
                    className="pl-9"
                  />
                  {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  {searchResults.length > 0 && !selectedRecipient && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedRecipient(p); setSearchResults([]); setSearchQuery(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm transition-colors"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{p.full_name || "Unbenannt"}</span>
                            {p.readable_id && <Badge variant="outline" className="ml-2 text-[10px] font-mono">{p.readable_id}</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{p.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                      Kein Nutzer gefunden
                    </div>
                  )}
                </div>
              )}
            </div>

            {renderMessageForm()}

            <Button
              onClick={handleSend}
              disabled={isSending || !subject.trim() || !body.trim() || !selectedRecipient}
              className="w-full gap-2"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              An {selectedRecipient?.full_name || "..."} senden
            </Button>
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-4 mt-4">
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

            {renderMessageForm()}

            <Button onClick={handleSend} disabled={isSending || !subject.trim() || !body.trim()} className="w-full gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Broadcast senden
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirm Dialog (broadcast only) */}
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
