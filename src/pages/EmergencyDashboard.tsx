import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Copy, Loader2, Search } from "lucide-react";

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

  // load providers if partner so they can pick one
  useEffect(() => {
    if (role === "partner") {
      const fetch = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,full_name")
          .eq("role", "provider");
        if (error) {
          console.error(error);
        } else if (data) {
          setProviders(data as ProviderInfo[]);
          if (!selectedProviderId && data.length) {
            setSelectedProviderId((data[0] as ProviderInfo).id);
          }
        }
      };
      fetch();
    }
  }, [role, selectedProviderId]);

  // fetch clients for selected provider/customer
  useEffect(() => {
    if (!selectedProviderId) return;
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
  }, [selectedProviderId]);

  // filter list
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFiltered(clients);
    } else {
      setFiltered(
        clients.filter(
          (c) =>
            c.client_email?.toLowerCase().includes(term) ||
            c.client_readable_id?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, clients]);

  // countdown for OTP
  useEffect(() => {
    if (!otpExpiry) {
      setRemaining(0);
      return;
    }
    const iv = setInterval(() => {
      const diff = otpExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        clearInterval(iv);
      } else {
        setRemaining(Math.ceil(diff / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [otpExpiry]);

  const requestOtp = async () => {
    if (!selected || !user) return;
    setLoadingOtp(true);
    const { data, error } = await supabase
      .rpc("create_emergency_otp", {
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

  // if not provider show a note
  if (role !== "provider" && role !== "partner") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notfall-Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Diese Seite ist nur für Hufbearbeiter und Fachpartner bestimmt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <h1 className="text-2xl font-bold">Notfall‑Dashboard</h1>
      </div>

      {/* Partner: Provider selector */}
      {role === "partner" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full border border-input rounded px-3 py-2 text-sm"
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
        <CardHeader>
          <CardTitle className="text-lg">Kunden suchen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Search className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <Input
              placeholder="Nach E-Mail, #KID oder Name suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.length === 0 && searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Keine Kunden gefunden.</p>
            )}
            {filtered.length === 0 && !searchTerm && (
              <p className="text-xs text-muted-foreground p-2">Keine Kunden geladen. Sind Sie mit Kunden verbunden?</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-3 rounded text-sm transition-colors ${
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
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {selected.client_name || selected.client_readable_id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OTP Section */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-3">Notfall-Passwort (OTP)</h3>
              <Button
                onClick={requestOtp}
                disabled={loadingOtp || !!otp}
                className="w-full"
              >
                {loadingOtp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                OTP anfordern
              </Button>

              {otp && (
                <div className="mt-3 p-4 bg-white border-2 border-amber-300 rounded relative">
                  <p className="font-mono text-2xl tracking-[0.2em] font-bold text-center mb-2 text-amber-900">
                    {otp}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    {Math.floor(remaining / 60)}:{("0" + (remaining % 60)).slice(-2)} Minuten gültig
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={copyOtp}
                  >
                    <Copy className="h-4 w-4" />
                    In Zwischenablage kopieren
                  </Button>
                </div>
              )}
            </div>

            {/* Escalation Section */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-3">Notfall melden</h3>
              <Button
                onClick={() => setEscalationOpen(true)}
                variant="destructive"
                className="w-full"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Eskalieren & Admin benachrichtigen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={escalationOpen} onOpenChange={setEscalationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notfall eskalieren</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Optionaler Kommentar"
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalationOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={submitEscalation} disabled={loadingEscalation}>
              {loadingEscalation && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
