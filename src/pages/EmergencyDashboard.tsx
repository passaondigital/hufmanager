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
  Send, MessageCircle, HelpCircle, Shield, Phone, BookOpen,
  ChevronDown, ChevronUp, CheckCircle2, Zap, Users, Lock
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
        useCORS: true,
        allowTaint: true,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        logging: false,
        backgroundColor: null,
        ignoreElements: (el) =>
          el.hasAttribute("data-radix-portal") ||
          el.getAttribute("role") === "dialog",
      });
      setSosScreenshot(canvas.toDataURL("image/png"));
    } catch {
      toast({ title: "Screenshot fehlgeschlagen", variant: "destructive" });
    } finally {
      setIsCapturing(false);
      setSosOpen(true);
    }
  }, []);

  // Paint screenshot on canvas
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
            .from("feedback-screenshots")
            .getPublicUrl(upData.path);
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

      toast({ title: "SOS-Meldung gesendet!", description: "Wir kümmern uns schnellstmöglich darum." });
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
            Problem mit der App? Schreib uns direkt – mit Screenshot. Wir helfen schnell.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setSosOpen(true)}
            className="w-full gap-2"
            variant="default"
            size="lg"
          >
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
              SOS Support – Problem melden
            </DialogTitle>
            <DialogDescription>
              Beschreibe kurz, was nicht funktioniert. Ein Screenshot hilft uns, schneller zu helfen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sos-msg">Was ist das Problem?</Label>
              <Textarea
                id="sos-msg"
                placeholder="z.B. Rechnung lässt sich nicht erstellen, Button reagiert nicht..."
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshot (optional, aber hilfreich)</Label>
              {sosScreenshot ? (
                <div className="space-y-2">
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded-lg border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSosScreenshot(null)}
                  >
                    Screenshot entfernen
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                >
                  <Camera className="h-4 w-4" />
                  {isCapturing ? "Wird erstellt..." : "Screenshot aufnehmen"}
                </Button>
              )}
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p>📧 Deine Meldung geht direkt an das HufManager-Team. Wir antworten so schnell wie möglich.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSosOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isSending} className="gap-2">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Wird gesendet..." : "Absenden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────
// Collapsible Info Section
// ─────────────────────────────────────────────
function InfoSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(!open)}
      >
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
// Main Component
// ─────────────────────────────────────────────
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

  // load providers if partner
  useEffect(() => {
    if (role === "partner") {
      const fetchProviders = async () => {
        const { data: providerRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "provider");
        if (providerRoles && providerRoles.length > 0) {
          const ids = providerRoles.map((r) => r.user_id);
          const { data } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids)
            .is("deleted_at", null);
          if (data) {
            setProviders(data as ProviderInfo[]);
            if (!selectedProviderId && data.length) setSelectedProviderId(data[0].id);
          }
        }
      };
      fetchProviders();
    }
  }, [role, selectedProviderId]);

  // fetch clients
  useEffect(() => {
    if (!selectedProviderId || role === "client") return;
    const fetchClients = async () => {
      const { data, error } = await supabase.rpc("get_provider_clients", {
        _provider_id: selectedProviderId,
      });
      if (error) {
        toast({ title: "Fehler beim Laden der Kunden", variant: "destructive" });
      } else {
        setClients((data as ClientInfo[]) || []);
      }
    };
    fetchClients();
  }, [selectedProviderId, role]);

  // filter
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFiltered(clients);
    } else {
      setFiltered(
        clients.filter(
          (c) =>
            c.client_email?.toLowerCase().includes(term) ||
            c.client_readable_id?.toLowerCase().includes(term) ||
            c.client_name?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, clients]);

  // OTP countdown
  useEffect(() => {
    if (!otpExpiry) { setRemaining(0); return; }
    const iv = setInterval(() => {
      const diff = otpExpiry.getTime() - Date.now();
      if (diff <= 0) { setRemaining(0); clearInterval(iv); }
      else setRemaining(Math.ceil(diff / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [otpExpiry]);

  const requestOtp = async () => {
    if (!selected || !user) return;
    setLoadingOtp(true);
    const { data, error } = await supabase.rpc("create_emergency_otp", {
      _provider_id: selectedProviderId,
      _client_id: selected.client_id,
    });
    setLoadingOtp(false);
    if (error) {
      toast({ title: "OTP konnte nicht angefordert werden", variant: "destructive" });
    } else {
      setOtp(data as string);
      setOtpExpiry(new Date(Date.now() + 30 * 60 * 1000));
    }
  };

  const copyOtp = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      toast({ title: "OTP in Zwischenablage kopiert" });
    }
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
    if (error) {
      toast({ title: "Eskalation fehlgeschlagen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Notfall eskaliert", description: "Admin wurde benachrichtigt" });
      setEscalationReason("");
      setEscalationOpen(false);
    }
  };

  // ═══════════════════════════════════════════
  // ADMIN VIEW
  // ═══════════════════════════════════════════
  if (role === "admin") {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">Notfall‑Dashboard (Admin)</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eskalationen & Notfälle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Alle eingehenden Notfälle und Eskalationen findest du unter{" "}
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
  // CLIENT VIEW (simplified)
  // ═══════════════════════════════════════════
  if (role === "client") {
    return (
      <div className="space-y-5 animate-fade-in max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">Hilfe & Notfall</h1>
        </div>

        {/* Emergency Contact */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-5 w-5 text-destructive" />
              Sofort-Hilfe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dein Pferd hat ein akutes Problem? Kontaktiere deinen Hufbearbeiter direkt per Chat.
            </p>
            <Button
              variant="destructive"
              className="w-full gap-2"
              size="lg"
              onClick={() => window.location.href = "/client-chat"}
            >
              <MessageCircle className="h-5 w-5" />
              Nachricht an Hufbearbeiter
            </Button>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Häufige Fragen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Termin absagen?</strong> Gehe auf deine Termine und tippe auf „Absagen".</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Pferdedaten ändern?</strong> Tippe auf dein Pferd → „Bearbeiten".</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p><strong>Rechnung nicht erhalten?</strong> Schreib deinem Hufbearbeiter im Chat.</p>
            </div>
          </CardContent>
        </Card>

        {/* SOS Support */}
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
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">Erste Hilfe & Support</h1>
        </div>

        {/* What is this */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="pt-5">
            <p className="text-sm">
              <strong>Was ist das?</strong> Hier findest du schnelle Hilfe bei Problemen auf der Tour oder in der App.
              Du kannst deinem Chef direkt ein Problem melden oder den HufManager-Support kontaktieren.
            </p>
          </CardContent>
        </Card>

        {/* Contact boss */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chef kontaktieren
            </CardTitle>
            <CardDescription>
              Bei Tour-Problemen, Unfällen oder dringenden Fragen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={() => window.location.href = "/chat"}>
              <Send className="h-4 w-4" />
              Nachricht schreiben
            </Button>
          </CardContent>
        </Card>

        {/* SOS */}
        <SOSSupportSection />

        {/* Info sections */}
        <InfoSection icon={Zap} title="Was tun bei einem Tour-Notfall?">
          <p>1. Sichere dich und das Pferd ab.</p>
          <p>2. Kontaktiere deinen Chef über den Chat oben.</p>
          <p>3. Dokumentiere den Vorfall (Fotos).</p>
          <p>4. Warte auf Anweisungen, bevor du die Tour fortsetzt.</p>
        </InfoSection>

        <InfoSection icon={HelpCircle} title="App funktioniert nicht richtig?">
          <p>Nutze den „Problem melden"-Button oben. Mach am besten einen Screenshot dazu – so können wir den Fehler schneller finden und beheben.</p>
        </InfoSection>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PROVIDER / PARTNER VIEW (full features)
  // ═══════════════════════════════════════════
  if (role !== "provider" && role !== "partner") {
    return (
      <Card>
        <CardHeader><CardTitle>Notfall-Dashboard</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Diese Seite ist nicht für deine Rolle verfügbar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold">Notfall‑Dashboard</h1>
      </div>

      {/* Explainer Card */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-5 space-y-2">
          <p className="text-sm font-medium">🛡️ Wozu ist das?</p>
          <p className="text-sm text-muted-foreground">
            Dieses Dashboard hilft dir in <strong>zwei Situationen</strong>:
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <p><strong>Kunde kann sich nicht einloggen?</strong> Erstelle ein Notfall-Passwort (OTP), das 30 Min. gültig ist.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              <p><strong>Dringender Notfall?</strong> Eskaliere direkt an den Admin – wir reagieren sofort.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOS Support — always visible */}
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
              Wähle den Hufbearbeiter, für den du den Notfall bearbeitest.
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
                <option key={p.id} value={p.id}>
                  {p.full_name || "Unbekannt"}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Client search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Kunden suchen
          </CardTitle>
          <CardDescription>
            Finde den betroffenen Kunden per Name, E-Mail oder #KID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nach Name, E-Mail oder #KID suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 && searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Keine Kunden gefunden.</p>
            )}
            {filtered.length === 0 && !searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Gib einen Suchbegriff ein, um Kunden zu finden.</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-colors ${
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
                  <div className="text-xs text-muted-foreground mt-1">{c.client_email}</div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions for selected customer */}
      {selected && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              {selected.client_name || selected.client_readable_id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* OTP Section */}
            <div>
              <h3 className="font-medium text-sm mb-1 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Notfall-Passwort (OTP)
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Erstellt ein einmaliges Passwort, das der Kunde zum Login nutzen kann. Gültig für 30 Minuten.
              </p>
              <Button
                onClick={requestOtp}
                disabled={loadingOtp || !!otp}
                className="w-full"
              >
                {loadingOtp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                OTP anfordern
              </Button>

              {otp && (
                <div className="mt-3 p-4 bg-background border-2 border-amber-300 rounded-lg">
                  <p className="font-mono text-2xl tracking-[0.2em] font-bold text-center mb-2">
                    {otp}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Noch {Math.floor(remaining / 60)}:{("0" + (remaining % 60)).slice(-2)} Minuten gültig
                  </p>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={copyOtp}>
                    <Copy className="h-4 w-4" />
                    In Zwischenablage kopieren
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Escalation Section */}
            <div>
              <h3 className="font-medium text-sm mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Notfall eskalieren
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Informiere den Admin über einen schwerwiegenden Notfall, der sofortige Aufmerksamkeit erfordert.
              </p>
              <Button
                onClick={() => setEscalationOpen(true)}
                variant="destructive"
                className="w-full gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Eskalieren & Admin benachrichtigen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Sections */}
      <div className="space-y-2">
        <InfoSection icon={HelpCircle} title="Wie funktioniert das Notfall-Passwort?">
          <p>1. Wähle den betroffenen Kunden oben aus.</p>
          <p>2. Klicke auf „OTP anfordern" – ein 6-stelliger Code wird generiert.</p>
          <p>3. Teile den Code mit dem Kunden (z.B. per Telefon).</p>
          <p>4. Der Kunde kann sich damit 30 Minuten lang einloggen.</p>
          <p className="text-xs italic mt-1">Hinweis: Jeder OTP-Vorgang wird protokolliert und ist nachvollziehbar.</p>
        </InfoSection>

        <InfoSection icon={BookOpen} title="Wann sollte ich eskalieren?">
          <p>Eskaliere nur bei <strong>echten Notfällen</strong>, z.B.:</p>
          <p>• Kunde wurde aus dem System ausgesperrt und braucht dringend Zugang.</p>
          <p>• Sicherheitsrelevantes Problem (Datenleck, unberechtigter Zugriff).</p>
          <p>• Systemausfall, der den Betrieb blockiert.</p>
          <p className="text-xs italic mt-1">Für normale Support-Fragen nutze bitte den SOS-Button oben.</p>
        </InfoSection>
      </div>

      {/* Escalation Dialog */}
      <Dialog open={escalationOpen} onOpenChange={setEscalationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Notfall eskalieren
            </DialogTitle>
            <DialogDescription>
              Der Admin wird sofort benachrichtigt. Beschreibe kurz, was passiert ist.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Was ist passiert? (optional)"
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalationOpen(false)}>
              Abbrechen
            </Button>
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
