import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, Radio, Mail, Bell, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RecipientFilter = "all" | "plan" | "manual_payment" | "copecart" | "partner";
type ActionType = "push" | "email" | "push_email";

export function AdminBroadcastManager() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [actionType, setActionType] = useState<ActionType>("push");

  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/management");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
    const providerIds = roles?.map((r) => r.user_id) || [];

    if (providerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, plan, readable_id")
        .in("id", providerIds)
        .is("deleted_at", null);

      // Get payment methods from contracts
      const { data: contracts } = await supabase
        .from("admin_contracts")
        .select("provider_id, payment_method")
        .in("provider_id", providerIds)
        .eq("status", "active");

      const contractMap = new Map<string, string>();
      contracts?.forEach((c) => contractMap.set(c.provider_id, c.payment_method || "copecart"));

      setProviders(
        (profiles || []).map((p) => ({
          ...p,
          payment_method: contractMap.get(p.id) || "copecart",
        }))
      );
    }
    setLoading(false);
  };

  const getFilteredRecipients = () => {
    switch (recipientFilter) {
      case "plan":
        return providers.filter((p) => p.plan === selectedPlan);
      case "manual_payment":
        return providers.filter((p) => p.payment_method === "bank_transfer");
      case "copecart":
        return providers.filter((p) => p.payment_method === "copecart");
      default:
        return providers;
    }
  };

  const handleSend = async () => {
    const recipients = getFilteredRecipients();
    if (recipients.length === 0) {
      toast.error("Keine Empfänger gefunden");
      return;
    }

    if ((actionType === "push" || actionType === "push_email") && (!pushTitle || !pushBody)) {
      toast.error("Push: Titel und Text erforderlich");
      return;
    }
    if ((actionType === "email" || actionType === "push_email") && (!emailSubject || !emailBody)) {
      toast.error("E-Mail: Betreff und Inhalt erforderlich");
      return;
    }

    setSending(true);
    let successCount = 0;

    try {
      for (const recipient of recipients) {
        // Send push
        if (actionType === "push" || actionType === "push_email") {
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: recipient.id,
                title: pushTitle,
                body: pushBody,
                url: pushUrl,
              },
            });
          } catch (e) {
            console.error("Push failed for", recipient.id, e);
          }
        }

        successCount++;
      }

      // Log broadcast
      await supabase.from("broadcast_logs").insert({
        sent_by: user!.id,
        channel: actionType,
        message_content: actionType.includes("push") ? `${pushTitle}: ${pushBody}` : emailBody,
        subject: actionType.includes("email") ? emailSubject : null,
        recipients_count: recipients.length,
        recipient_ids: recipients.map((r) => r.id),
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      // Activity log
      await supabase.from("admin_activity_log").insert({
        admin_id: user!.id,
        admin_email: user!.email,
        action_type: "bulk_action",
        target_type: "bulk",
        target_name: `Broadcast an ${recipients.length} Provider`,
        details: { channel: actionType, recipient_count: recipients.length },
      });

      toast.success(`Broadcast an ${successCount} Provider gesendet`);

      // Reset form
      setPushTitle("");
      setPushBody("");
      setEmailSubject("");
      setEmailBody("");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Senden");
    } finally {
      setSending(false);
    }
  };

  const filteredCount = getFilteredRecipients().length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Broadcast-Nachrichten</h3>
        <p className="text-sm text-muted-foreground">Push & E-Mail an alle oder gefilterte Provider</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Empfänger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={recipientFilter} onValueChange={(v) => setRecipientFilter(v as RecipientFilter)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Alle aktiven Provider</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="plan" id="plan" />
                <Label htmlFor="plan">Nur bestimmter Plan</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual_payment" id="manual" />
                <Label htmlFor="manual">Nur Überweisung</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="copecart" id="copecart" />
                <Label htmlFor="copecart">Nur CopeCart</Label>
              </div>
            </RadioGroup>

            {recipientFilter === "plan" && (
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="duo">Duo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{filteredCount} Empfänger</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="font-medium">Kanal</Label>
              <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="push" id="ch-push" />
                  <Label htmlFor="ch-push" className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" /> Push-Benachrichtigung
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="ch-email" />
                  <Label htmlFor="ch-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> E-Mail
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="push_email" id="ch-both" />
                  <Label htmlFor="ch-both" className="flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5" /> Push + E-Mail
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Right: Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nachricht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(actionType === "push" || actionType === "push_email") && (
              <>
                <div className="space-y-2">
                  <Label>Push-Titel (max 50 Zeichen)</Label>
                  <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value.slice(0, 50))} placeholder="z.B. Neues Feature verfügbar" />
                  <span className="text-xs text-muted-foreground">{pushTitle.length}/50</span>
                </div>
                <div className="space-y-2">
                  <Label>Push-Text (max 150 Zeichen)</Label>
                  <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value.slice(0, 150))} placeholder="Kurze Beschreibung..." rows={2} />
                  <span className="text-xs text-muted-foreground">{pushBody.length}/150</span>
                </div>
                <div className="space-y-2">
                  <Label>Deep Link (optional)</Label>
                  <Input value={pushUrl} onChange={(e) => setPushUrl(e.target.value)} placeholder="/management" />
                </div>
              </>
            )}

            {(actionType === "email" || actionType === "push_email") && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>E-Mail Betreff</Label>
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Betreff..." />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail Inhalt</Label>
                  <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Variablen: {{VORNAME}}, {{PLAN}}, {{PID}}" rows={5} />
                </div>
              </>
            )}

            <Button onClick={handleSend} disabled={sending || filteredCount === 0} className="w-full">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              An {filteredCount} Provider senden
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
