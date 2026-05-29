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
import { toast } from "sonner";
import {
  Send, Mail, Copy, Check, Clock, UserPlus, Loader2, X,
  Share2, Sparkles, MessageCircle, ArrowRight, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { z } from "zod";
import { shareViaWhatsApp, waTextInvite } from "@/lib/whatsappTemplates";
import { motion, AnimatePresence } from "framer-motion";

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

const ROLE_LABELS: Record<string, { label: string; description: string; emoji: string }> = {
  provider: { label: "Hufbearbeiter / Profi", description: "Ein Hufbearbeiter, Therapeut oder Trainer", emoji: "🐴" },
  client: { label: "Pferdebesitzer", description: "Ein Pferdebesitzer als Kunde", emoji: "🏠" },
  partner: { label: "Fachpartner", description: "Ein Tierarzt, Physio, Osteopath etc.", emoji: "🩺" },
};

const NEXT_STEPS = [
  { icon: "📧", title: "Einladung teilen", desc: "Kopiere den Link oder teile ihn per WhatsApp" },
  { icon: "📱", title: "Registrierung", desc: "Dein Kontakt erstellt sich kostenlos ein Hufi-Konto" },
  { icon: "🔗", title: "Automatisch verbunden", desc: "Nach der Registrierung seid ihr sofort vernetzt" },
  { icon: "🐴", title: "Loslegen", desc: "Pferde teilen, Termine buchen, Befunde einsehen" },
];

export function InviteWithGuidedFlow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<{ token: string; name: string; role: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<InviteFormData>({
    email: "",
    name: "",
    message: "",
    role: "client",
  });

  // Fetch user's name for WhatsApp text
  const { data: profile } = useQuery({
    queryKey: ["my-profile-name", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
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
      toast.error(parsed.error.errors[0].message);
      return;
    }

    const existing = invitations.find(
      i => i.invited_email === form.email.toLowerCase().trim() && i.status === "pending"
    );
    if (existing) {
      toast.error("Diese E-Mail hat bereits eine offene Einladung.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("hm_connect_invitations")
        .insert({
          invited_by: user.id,
          invited_email: form.email.toLowerCase().trim(),
          invited_name: form.name.trim() || null,
          invite_message: form.message.trim() || null,
          invite_role: form.role,
        })
        .select("token")
        .single();

      if (error) throw error;

      setJustCreated({
        token: data.token,
        name: form.name || form.email,
        role: form.role,
      });

      toast.success("Einladung erstellt! 🎉");
      setForm({ email: "", name: "", message: "", role: "client" });
      queryClient.invalidateQueries({ queryKey: ["hm-connect-invitations"] });
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message?.includes("Zu viele")
        ? "Maximal 10 Einladungen pro Tag."
        : "Einladung konnte nicht erstellt werden.");
    } finally {
      setSending(false);
    }
  };

  const getInviteLink = (token: string) => `${window.location.origin}/auth?invite=${token}`;

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(getInviteLink(token));
    setCopied(token);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(null), 3000);
  };

  const shareWhatsApp = (token: string, name: string) => {
    const senderName = profile?.full_name || "Ein Pferdefreund";
    const text = `Hey ${name}! 🐴\n\nIch nutze Hufi für alles rund ums Pferd – Termine, Befunde, Dokumente.\n\nRegistriere dich kostenlos über meinen Einladungslink:\n${getInviteLink(token)}\n\nViele Grüße, ${senderName}`;
    shareViaWhatsApp(text);
  };

  const handleNativeShare = async (token: string, name: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Hufi Einladung",
          text: `Hey ${name}, ich lade dich zu Hufi ein – dem digitalen Betriebssystem für die Pferdewelt 🐴`,
          url: getInviteLink(token),
        });
      } catch {}
    } else {
      copyInviteLink(token);
    }
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase
      .from("hm_connect_invitations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (!error) {
      toast.success("Einladung zurückgezogen");
      queryClient.invalidateQueries({ queryKey: ["hm-connect-invitations"] });
      if (justCreated) setJustCreated(null);
    }
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Offen", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    accepted: { label: "Angenommen", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    expired: { label: "Abgelaufen", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "Zurückgezogen", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-4">
      {/* Success State with Guided Next Steps */}
      <AnimatePresence>
        {justCreated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Einladung für {justCreated.name} erstellt!</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_LABELS[justCreated.role]?.emoji} {ROLE_LABELS[justCreated.role]?.label}
                    </p>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    onClick={() => shareWhatsApp(justCreated.token, justCreated.name)}
                    className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyInviteLink(justCreated.token)}
                    className="gap-2"
                  >
                    {copied === justCreated.token ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied === justCreated.token ? "Kopiert!" : "Link kopieren"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleNativeShare(justCreated.token, justCreated.name)}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Teilen
                  </Button>
                </div>

                {/* Guided Next Steps */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground mb-3">So geht's weiter:</p>
                  <div className="space-y-3">
                    {NEXT_STEPS.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-sm flex-shrink-0">
                          {step.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                        {i < NEXT_STEPS.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 mt-2 hidden sm:block ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setJustCreated(null)}
                  className="w-full text-muted-foreground"
                >
                  Weitere Person einladen
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Form (hidden when just created) */}
      {!justCreated && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Zum Hufi einladen
            </CardTitle>
            <CardDescription>
              Lade Stallkollegen, Reitbeteiligungen oder Dienstleister ein. 
              Sie bekommen einen persönlichen Registrierungslink.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-Mail-Adresse *</label>
                <Input
                  type="email"
                  placeholder="name@beispiel.de"
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
              <label className="text-sm font-medium mb-1.5 block">Als was einladen?</label>
              <Select value={form.role} onValueChange={(v: any) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{val.emoji}</span>
                        <span>{val.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Persönliche Nachricht (optional)</label>
              <Textarea
                placeholder="Hey! Meld dich bei Hufi an, dann können wir uns dort vernetzen..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={2}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{form.message.length}/500</p>
            </div>

            <Button onClick={handleSend} disabled={sending || !form.email} className="w-full gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Einladung erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick WhatsApp Share (always visible) */}
      {!justCreated && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-[#25D366] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Schnelleinladung per WhatsApp</p>
              <p className="text-xs text-muted-foreground">Ohne E-Mail direkt per Nachricht einladen</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const name = profile?.full_name || "Ein Pferdefreund";
                shareViaWhatsApp(waTextInvite(name));
              }}
              className="gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Teilen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sent Invitations (collapsible) */}
      <Card>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Gesendete Einladungen ({invitations.length})
            </span>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4">
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
                  <div className="text-center py-6 text-muted-foreground">
                    <Share2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Noch keine Einladungen versendet.</p>
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
                                className="gap-1 h-8"
                              >
                                {copied === inv.token ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => shareWhatsApp(inv.token, inv.invited_name || "")}
                                className="h-8"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelInvite(inv.id)}
                                className="text-destructive hover:text-destructive h-8"
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
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
