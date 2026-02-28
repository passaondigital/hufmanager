import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Send,
  Mail,
  Copy,
  Check,
  Clock,
  UserPlus,
  Loader2,
  X,
  Share2,
  Sparkles,
} from "lucide-react";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255),
  name: z.string().trim().max(100).optional(),
  message: z.string().trim().max(500).optional(),
  role: z.enum(["provider", "client", "partner"]),
});

interface InviteFormData {
  email: string;
  name: string;
  message: string;
  role: "provider" | "client" | "partner";
}

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  provider: { label: "Hufbearbeiter / Profi", description: "Ein Hufbearbeiter, Therapeut oder Trainer" },
  client: { label: "Pferdebesitzer", description: "Ein Pferdebesitzer als Kunde" },
  partner: { label: "Fachpartner", description: "Ein Tierarzt, Physio, Osteopath etc." },
};

export function InviteToHufManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<InviteFormData>({
    email: "",
    name: "",
    message: "",
    role: "provider",
  });

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["hm-connect-invitations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("hm_connect_invitations")
        .select("*")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSend = async () => {
    if (!user) return;

    const parsed = inviteSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Fehler", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    // Check if already invited
    const existing = invitations.find(
      i => i.invited_email === form.email.toLowerCase().trim() && i.status === "pending"
    );
    if (existing) {
      toast({ title: "Bereits eingeladen", description: "Diese E-Mail hat bereits eine offene Einladung.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from("hm_connect_invitations")
        .insert({
          invited_by: user.id,
          invited_email: form.email.toLowerCase().trim(),
          invited_name: form.name.trim() || null,
          invite_message: form.message.trim() || null,
          invite_role: form.role,
        });

      if (error) throw error;

      toast({
        title: "Einladung erstellt! 🎉",
        description: "Teile den Einladungslink mit deinem Kontakt.",
      });

      setForm({ email: "", name: "", message: "", role: "provider" });
      queryClient.invalidateQueries({ queryKey: ["hm-connect-invitations"] });
    } catch (err: any) {
      console.error("Invite error:", err);
      const msg = err.message?.includes("Zu viele")
        ? "Maximal 10 Einladungen pro Tag."
        : "Einladung konnte nicht erstellt werden.";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    toast({ title: "Link kopiert!", description: "Du kannst ihn jetzt per Chat, E-Mail oder SMS teilen." });
    setTimeout(() => setCopied(null), 3000);
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase
      .from("hm_connect_invitations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (!error) {
      toast({ title: "Einladung zurückgezogen" });
      queryClient.invalidateQueries({ queryKey: ["hm-connect-invitations"] });
    }
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Offen", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    accepted: { label: "Angenommen", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    expired: { label: "Abgelaufen", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "Zurückgezogen", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Zum HufManager einladen
          </CardTitle>
          <CardDescription>
            Lade Kollegen, Kunden oder Fachpartner ein. Wenn sie noch kein Konto haben, können sie sich über deinen Link registrieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-Mail-Adresse *</label>
              <Input
                type="email"
                placeholder="kollege@beispiel.de"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name (optional)</label>
              <Input
                placeholder="Max Mustermann"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Als welche Rolle einladen?</label>
            <Select value={form.role} onValueChange={(v: any) => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{val.label}</span>
                      <span className="text-xs text-muted-foreground">{val.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Persönliche Nachricht (optional)</label>
            <Textarea
              placeholder="Hey! Ich nutze HufManager für meine Hufbearbeitung – probier's mal aus..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.message.length}/500</p>
          </div>

          <Button onClick={handleSend} disabled={sending || !form.email} className="w-full gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Einladung erstellen & Link generieren
          </Button>
        </CardContent>
      </Card>

      {/* Tip Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Das Netzwerk wächst mit dir</p>
            <p className="text-muted-foreground mt-1">
              Jede Einladung stärkt das HufManager-Netzwerk. Eingeladene Nutzer werden automatisch mit dir verbunden – 
              sobald sie sich registriert haben. Später folgen Affiliate-Belohnungen & Listings auf deiner Landingpage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sent Invitations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gesendete Einladungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Noch keine Einladungen versendet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map(inv => {
                const config = statusConfig[inv.status] || statusConfig.pending;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {inv.invited_name || inv.invited_email}
                        </p>
                        <Badge variant="outline" className={`text-xs ${config.className}`}>
                          {config.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[inv.invite_role]?.label || inv.invite_role}
                        </Badge>
                      </div>
                      {inv.invited_name && (
                        <p className="text-xs text-muted-foreground truncate">{inv.invited_email}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(inv.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>

                    {inv.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInviteLink(inv.token)}
                          className="gap-1"
                        >
                          {copied === inv.token ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Link
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelInvite(inv.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
