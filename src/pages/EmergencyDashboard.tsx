import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Copy, Loader2, Search, LifeBuoy, Camera,
  Send, MessageCircle, HelpCircle, Shield, Phone,
  ChevronDown, ChevronUp, CheckCircle2, Users, Lock,
  KeyRound, UserX, RefreshCw, Link2, Unlink, Bug
} from "lucide-react";
import html2canvas from "html2canvas";

interface ClientInfo {
  client_id: string;
  client_readable_id: string;
  client_email: string | null;
  client_name: string | null;
}

interface ProviderInfo {
  id: string;
  full_name: string | null;
}

// ─────────────────────────────────────────────
// SOS Support Component (shared across all roles)
// ─────────────────────────────────────────────
function SOSSupportSection() {
  const { user, role } = useAuth();
  const [sosOpen, setSosOpen] = useState(false);
  const [sosMessage, setSosMessage] = useState("");
  const [sosScreenshot, setSosScreenshot] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setSosOpen(false);
    await new Promise(r => setTimeout(r, 400));
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true, allowTaint: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        logging: false, backgroundColor: null,
        ignoreElements: (el) =>
          el.hasAttribute("data-radix-portal") || el.getAttribute("role") === "dialog",
      });
      setSosScreenshot(canvas.toDataURL("image/png"));
    } catch {
      toast({ title: "Screenshot fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsCapturing(false);
      setSosOpen(true);
    }
  }, []);

  useEffect(() => {
    if (sosScreenshot && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        const maxW = Math.min(600, window.innerWidth - 80);
        const scale = maxW / img.width;
        canvasRef.current!.width = img.width * scale;
        canvasRef.current!.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      };
      img.src = sosScreenshot;
    }
  }, [sosScreenshot]);

  const handleSubmit = async () => {
    if (!sosMessage.trim()) {
      toast({ title: "Bitte beschreibe dein Problem", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      let screenshotUrl = null;
      if (canvasRef.current && sosScreenshot) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const bytes = atob(base64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: "image/png" });
        const fileName = `sos/${Date.now()}_${user?.id || "anon"}.png`;
        const { data: upData, error: upErr } = await supabase.storage
          .from("feedback-screenshots")
          .upload(fileName, blob, { contentType: "image/png" });
        if (!upErr && upData) {
          const { data: { publicUrl } } = supabase.storage
            .from("feedback-screenshots").getPublicUrl(upData.path);
          screenshotUrl = publicUrl;
        }
      }
      const { error } = await supabase.from("feedback_reports").insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_role: role || null,
        page_url: window.location.href,
        description: `[SOS SUPPORT] ${sosMessage.trim()}`,
        screenshot_url: screenshotUrl,
        browser_info: JSON.stringify({
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          route: window.location.pathname,
        }),
        status: "open",
      });
      if (error) throw error;
      toast({ title: "Meldung gesendet!", description: "Wir kümmern uns schnellstmöglich darum." });
      setSosOpen(false);
      setSosMessage("");
      setSosScreenshot(null);
    } catch (err) {
      console.error("SOS submit error:", err);
      toast({ title: "Fehler beim Senden", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            SOS Support
          </CardTitle>
          <CardDescription>
            Etwas funktioniert nicht? Schreib uns – gerne mit Screenshot. Wir helfen schnell.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setSosOpen(true)} className="w-full gap-2" variant="default" size="lg">
            <MessageCircle className="h-5 w-5" />
            Problem melden
          </Button>
        </CardContent>
      </Card>

      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Problem melden
            </DialogTitle>
            <DialogDescription>
              Beschreibe kurz, was nicht klappt. Ein Screenshot hilft uns enorm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sos-msg">Was ist das Problem?</Label>
              <Textarea
                id="sos-msg"
                placeholder="z.B. Kunde kann sich nicht einloggen, Pferd erscheint nicht in der Liste..."
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>
            <div className="space-y-2">
              <Label>Screenshot (optional)</Label>
              {sosScreenshot ? (
                <div className="space-y-2">
                  <canvas ref={canvasRef} className="w-full rounded-lg border" />
                  <Button variant="outline" size="sm" onClick={() => setSosScreenshot(null)}>
                    Screenshot entfernen
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={captureScreenshot} disabled={isCapturing}>
                  <Camera className="h-4 w-4" />
                  {isCapturing ? "Wird erstellt..." : "Screenshot aufnehmen"}
                </Button>
              )}
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              📧 Deine Meldung geht direkt an das Hufi-Team.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSosOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={isSending} className="gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? "Wird gesendet..." : "Absenden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────
// Collapsible Help Section
// ─────────────────────────────────────────────
function HelpSection({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 text-sm text-muted-foreground space-y-2">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// Numbered Step
// ─────────────────────────────────────────────
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
        {n}
      </span>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function EmergencyDashboard() {
  const { user, role } = useAuth();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [filtered, setFiltered] = useState<ClientInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<ClientInfo | null>(null);

  const [otp, setOtp] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<number>(0);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(user?.id || "");

  const [escalationReason, setEscalationReason] = useState("");
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingEscalation, setLoadingEscalation] = useState(false);

  // Load providers for partner
  useEffect(() => {
    if (role === "partner") {
      (async () => {
        const { data: providerRoles } = await supabase
          .from("user_roles").select("user_id").eq("role", "provider");
        if (providerRoles?.length) {
          const { data } = await supabase
            .from("profiles").select("id, full_name")
            .in("id", providerRoles.map(r => r.user_id))
            .is("deleted_at", null);
          if (data) {
            setProviders(data as ProviderInfo[]);
            if (!selectedProviderId && data.length) setSelectedProviderId(data[0].id);
          }
        }
      })();
    }
  }, [role, selectedProviderId]);

  // Fetch clients
  useEffect(() => {
    if (!selectedProviderId || role === "client") return;
    (async () => {
      const { data, error } = await supabase.rpc("get_provider_clients", { _provider_id: selectedProviderId });
      if (error) toast({ title: "Fehler beim Laden der Kunden", variant: "destructive" });
      else setClients((data as ClientInfo[]) || []);
    })();
  }, [selectedProviderId, role]);

  // Filter
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) { setFiltered(clients); return; }
    setFiltered(clients.filter(c =>
      c.client_email?.toLowerCase().includes(term) ||
      c.client_readable_id?.toLowerCase().includes(term) ||
      c.client_name?.toLowerCase().includes(term)
    ));
  }, [searchTerm, clients]);

  // OTP countdown
  useEffect(() => {
    if (!otpExpiry) { setRemaining(0); return; }
    const iv = setInterval(() => {
      const diff = otpExpiry.getTime() - Date.now();
      if (diff <= 0) { setRemaining(0); clearInterval(iv); } else setRemaining(Math.ceil(diff / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [otpExpiry]);

  const requestOtp = async () => {
    if (!selected || !user) return;
    setLoadingOtp(true);
    const { data, error } = await supabase.rpc("create_emergency_otp", {
      _provider_id: selectedProviderId, _client_id: selected.client_id,
    });
    setLoadingOtp(false);
    if (error) toast({ title: "OTP konnte nicht erstellt werden", variant: "destructive" });
    else { setOtp(data as string); setOtpExpiry(new Date(Date.now() + 30 * 60 * 1000)); }
  };

  const copyOtp = () => {
    if (otp) { navigator.clipboard.writeText(otp); toast({ title: "Kopiert!" }); }
  };

  const submitEscalation = async () => {
    if (!selected || !user) return;
    setLoadingEscalation(true);
    const { error } = await supabase.from("emergency_escalations").insert({
      provider_id: user.id,
      client_readable_id: selected.client_readable_id,
      escalation_reason: escalationReason || null,
    });
    setLoadingEscalation(false);
    if (error) toast({ title: "Fehlgeschlagen", description: error.message, variant: "destructive" });
    else { toast({ title: "Eskaliert", description: "Admin wurde benachrichtigt" }); setEscalationReason(""); setEscalationOpen(false); }
  };

  // ═══════════════════════════════════════════
  // ADMIN VIEW
  // ═══════════════════════════════════════════
  if (role === "admin") {
    return (
      <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">1. Hilfe Kunden Center (Admin)</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eskalationen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Eingehende Meldungen findest du unter{" "}
              <Button variant="link" className="p-0 h-auto text-primary" onClick={() => window.location.href = "/admin/mission-control?tab=escalations"}>
                Mission Control → Eskalationen
              </Button>.
            </p>
          </CardContent>
        </Card>
        <SOSSupportSection />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // CLIENT VIEW (vereinfacht)
  // ═══════════════════════════════════════════
  if (role === "client") {
    return (
      <div className="space-y-5 animate-fade-in max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Hilfe & Support</h1>
        </div>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              Hier findest du Hilfe, wenn etwas nicht funktioniert – z.B. wenn du dich nicht einloggen kannst, 
              dein Pferd nicht angezeigt wird oder du deinen Hufbearbeiter nicht findest.
            </p>
          </CardContent>
        </Card>

        {/* Direct contact */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Deinen Hufbearbeiter kontaktieren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Die schnellste Lösung: Schreib deinem Hufbearbeiter direkt im Chat. Er kann dir bei den meisten Problemen sofort helfen.
            </p>
            <Button className="w-full gap-2" size="lg" onClick={() => window.location.href = "/client-chat"}>
              <Send className="h-5 w-5" />
              Chat öffnen
            </Button>
          </CardContent>
        </Card>

        {/* Common issues */}
        <div className="space-y-2">
          <p className="text-sm font-medium px-1">Häufige Probleme & Lösungen</p>

          <HelpSection icon={KeyRound} title="Passwort vergessen?" defaultOpen>
            <p>Auf der Login-Seite findest du den Link <strong>„Passwort vergessen"</strong>. 
            Du bekommst eine E-Mail mit einem Link zum Zurücksetzen.</p>
            <p>Falls die E-Mail nicht ankommt, bitte deinen Hufbearbeiter, dir ein <strong>Einmal-Passwort (OTP)</strong> zu erstellen – 
            das geht über sein Notfall-Dashboard.</p>
          </HelpSection>

          <HelpSection icon={UserX} title="Pferd wird nicht angezeigt?">
            <p>Das kann passieren, wenn dein Pferd noch nicht mit deinem Konto verknüpft ist.</p>
            <Step n={1}>Gehe auf <strong>„Meine Pferde"</strong> und prüfe, ob das Pferd dort aufgelistet ist.</Step>
            <Step n={2}>Falls nicht, schreib deinem Hufbearbeiter im Chat – er kann die Zuordnung korrigieren.</Step>
          </HelpSection>

          <HelpSection icon={Unlink} title="Kein Hufbearbeiter zugewiesen?">
            <p>Falls du keinen Hufbearbeiter siehst, wurde dein Konto noch nicht verknüpft.</p>
            <Step n={1}>Frag deinen Hufbearbeiter nach seinem <strong>Einladungslink</strong>.</Step>
            <Step n={2}>Öffne den Link – die Verbindung wird automatisch hergestellt.</Step>
          </HelpSection>
        </div>

        {/* SOS */}
        <SOSSupportSection />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // EMPLOYEE VIEW
  // ═══════════════════════════════════════════
  if (role === "employee") {
    return (
      <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Hilfe & Support</h1>
        </div>

        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              Hier findest du Hilfe bei Problemen mit der App, deiner Tour oder Kundenzuordnungen.
              Bei dringenden Fragen kontaktiere deinen Chef direkt.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chef kontaktieren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={() => window.location.href = "/chat"}>
              <Send className="h-4 w-4" />
              Nachricht schreiben
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <p className="text-sm font-medium px-1">Häufige Probleme</p>

          <HelpSection icon={UserX} title="Kunde/Pferd falsch zugewiesen?">
            <p>Falsche Zuordnungen kann nur dein Chef korrigieren.</p>
            <Step n={1}>Notiere dir den Namen des Kunden und des Pferdes.</Step>
            <Step n={2}>Schreib deinem Chef über den Chat oben.</Step>
            <Step n={3}>Er kann die Zuordnung im Kunden-Bereich ändern.</Step>
          </HelpSection>

          <HelpSection icon={RefreshCw} title="App lädt nicht richtig?">
            <p>Versuche folgendes:</p>
            <Step n={1}>Schließe die App komplett und öffne sie neu.</Step>
            <Step n={2}>Prüfe deine Internetverbindung.</Step>
            <Step n={3}>Falls es weiterhin nicht geht, melde das Problem über den SOS-Button unten.</Step>
          </HelpSection>
        </div>

        <SOSSupportSection />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PROVIDER / PARTNER VIEW
  // ═══════════════════════════════════════════
  if (role !== "provider" && role !== "partner") {
    return (
      <Card><CardHeader><CardTitle>Nicht verfügbar</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">Diese Seite ist nicht für deine Rolle verfügbar.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">1. Hilfe Kunden Center</h1>
      </div>

      {/* What is this */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="text-sm">
            <strong>Wozu ist das?</strong> Hier löst du die häufigsten Probleme deiner Kunden:
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p><strong>Login-Probleme:</strong> Erstelle ein Einmal-Passwort (OTP), damit dein Kunde sich sofort einloggen kann.</p>
            </div>
            <div className="flex items-start gap-2">
              <Link2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p><strong>Falsche Zuordnung:</strong> Kunde oder Pferd falsch verknüpft? → Gehe zu <Button variant="link" className="p-0 h-auto text-xs text-primary" onClick={() => window.location.href = "/kunden"}>Kunden</Button> und korrigiere es dort.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              <p><strong>Nichts hilft?</strong> Eskaliere an den Admin – oder nutze den SOS-Button unten.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOS Support */}
      <SOSSupportSection />

      <Separator />

      {/* Partner: Provider selector */}
      {role === "partner" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Provider auswählen
            </CardTitle>
            <CardDescription>
              Für welchen Hufbearbeiter möchtest du ein Problem lösen?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              <option value="">-- Bitte wählen --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || "Unbekannt"}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Customer OTP Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Kunden-Login reparieren
          </CardTitle>
          <CardDescription>
            Wenn ein Kunde sein Passwort vergessen hat oder sich nicht einloggen kann, 
            kannst du hier ein Einmal-Passwort erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Kunde suchen</Label>
            <Input
              placeholder="Name, E-Mail oder #KID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filtered.length === 0 && searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Kein Kunde gefunden.</p>
            )}
            {filtered.length === 0 && !searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Gib einen Namen oder eine E-Mail ein.</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.client_id}
                onClick={() => { setSelected(c); setOtp(null); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected?.client_id === c.client_id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{c.client_name || "(unbenannt)"}</span>
                  {c.client_readable_id && (
                    <Badge variant="outline" className="text-xs ml-auto">#{c.client_readable_id}</Badge>
                  )}
                </div>
                {c.client_email && (
                  <div className="text-xs text-muted-foreground mt-0.5">{c.client_email}</div>
                )}
              </button>
            ))}
          </div>

          {/* OTP Actions */}
          {selected && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Ausgewählt: {selected.client_name || selected.client_readable_id}
              </div>

              <Button onClick={requestOtp} disabled={loadingOtp || !!otp} className="w-full gap-2" variant="outline">
                {loadingOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                <KeyRound className="h-4 w-4" />
                Einmal-Passwort erstellen
              </Button>

              {otp && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-mono text-2xl tracking-[0.2em] font-bold text-center mb-2">
                    {otp}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Noch {Math.floor(remaining / 60)}:{("0" + (remaining % 60)).slice(-2)} gültig – teile den Code per Telefon oder SMS.
                  </p>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={copyOtp}>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escalation */}
      {selected && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Problem eskalieren
            </CardTitle>
            <CardDescription>
              Wenn du das Problem selbst nicht lösen kannst, informiere den Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setEscalationOpen(true)} variant="destructive" className="w-full gap-2">
              <AlertTriangle className="w-4 h-4" />
              An Admin eskalieren
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help guides */}
      <div className="space-y-2">
        <p className="text-sm font-medium px-1">Anleitungen</p>

        <HelpSection icon={KeyRound} title="So funktioniert das Einmal-Passwort (OTP)">
          <Step n={1}>Suche oben den betroffenen Kunden.</Step>
          <Step n={2}>Klicke auf <strong>„Einmal-Passwort erstellen"</strong> – ein 6-stelliger Code wird erzeugt.</Step>
          <Step n={3}>Teile den Code mit dem Kunden (Telefon, SMS, WhatsApp).</Step>
          <Step n={4}>Der Kunde gibt den Code auf der Login-Seite ein und ist sofort drin.</Step>
          <p className="text-xs italic">Der Code ist 30 Minuten gültig. Jede Nutzung wird protokolliert.</p>
        </HelpSection>

        <HelpSection icon={Link2} title="Kunde oder Pferd falsch zugeordnet?">
          <Step n={1}>Gehe zu <strong>Kunden</strong> → öffne den betroffenen Kunden.</Step>
          <Step n={2}>Unter <strong>„Pferde"</strong> kannst du Zuordnungen ändern oder entfernen.</Step>
          <Step n={3}>Um einen Kunden einem anderen Provider zuzuweisen, nutze den <strong>Netzwerk</strong>-Bereich.</Step>
          <p className="text-xs italic">Bei komplexen Fällen nutze den SOS-Button – wir helfen dir.</p>
        </HelpSection>

        <HelpSection icon={UserX} title="Kunde hat keinen Zugang erhalten?">
          <p>Mögliche Ursachen:</p>
          <Step n={1}>E-Mail-Adresse falsch geschrieben → Prüfe unter <strong>Kunden → Profil</strong>.</Step>
          <Step n={2}>Einladungslink abgelaufen → Erstelle einen neuen unter <strong>Kunden → Einladen</strong>.</Step>
          <Step n={3}>Kunde hat die E-Mail nicht erhalten → Prüfe Spam-Ordner oder erstelle ein OTP (oben).</Step>
        </HelpSection>

        <HelpSection icon={Bug} title="Technisches Problem mit der App?">
          <p>Nutze den <strong>SOS-Button</strong> oben – am besten mit Screenshot. Wir sehen dann genau, was schief läuft und können schneller helfen.</p>
        </HelpSection>
      </div>

      {/* Escalation Dialog */}
      <Dialog open={escalationOpen} onOpenChange={setEscalationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Problem eskalieren
            </DialogTitle>
            <DialogDescription>
              Der Admin wird sofort benachrichtigt und kümmert sich um das Problem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Betroffener Kunde</Label>
            <p className="text-sm font-medium">{selected?.client_name || selected?.client_readable_id}</p>
          </div>
          <div className="space-y-2">
            <Label>Was ist das Problem? (optional)</Label>
            <Textarea
              placeholder="z.B. Kunde kann sich trotz OTP nicht einloggen..."
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalationOpen(false)}>Abbrechen</Button>
            <Button onClick={submitEscalation} disabled={loadingEscalation} variant="destructive" className="gap-2">
              {loadingEscalation && <Loader2 className="w-4 h-4 animate-spin" />}
              Jetzt eskalieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
