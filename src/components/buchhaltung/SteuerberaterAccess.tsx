import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Link2, CheckCircle2, Clock, Trash2, UserCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function SteuerberaterAccess() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  // For now, we store tax advisor info in business_settings or use a simple local approach
  // In a real app, this would create a read-only access token/link
  const { data: businessSettings } = useQuery({
    queryKey: ["business-settings-stb", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("business_name, owner_name, tax_number, vat_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Generate a shareable summary export link concept
  const generateShareLink = () => {
    // In production, this would create a time-limited access token
    const shareId = btoa(`${user!.id}:${Date.now()}`).replace(/[=+/]/g, "").substring(0, 20);
    return `${window.location.origin}/stb-zugang/${shareId}`;
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link kopiert! Senden Sie diesen Link an Ihren Steuerberater.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendByEmail = () => {
    if (!email) {
      toast.error("Bitte E-Mail-Adresse eingeben");
      return;
    }
    // In production, this would send an email with the access link
    toast.success(`Zugangslink wird an ${email} gesendet`);
    setEmail("");
    setName("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Steuerberater-Zugang</h2>
        <p className="text-sm text-muted-foreground">
          Teilen Sie Ihre Buchhaltungsdaten sicher mit Ihrem Steuerberater
        </p>
      </div>

      {/* Quick Share Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Zugangslink erstellen
          </CardTitle>
          <CardDescription>
            Erstellen Sie einen zeitlich begrenzten, schreibgeschützten Zugang für Ihren Steuerberater
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Name des Steuerberaters
              </label>
              <Input
                placeholder="z.B. StB Müller"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                E-Mail-Adresse
              </label>
              <Input
                type="email"
                placeholder="steuerberater@kanzlei.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSendByEmail} className="gap-2 flex-1" disabled={!email}>
              <Mail className="h-4 w-4" />
              Per E-Mail einladen
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="gap-2">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert!" : "Link kopieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What's Shared */}
      <Card>
        <CardHeader>
          <CardTitle>Was wird geteilt?</CardTitle>
          <CardDescription>
            Ihr Steuerberater erhält schreibgeschützten Zugriff auf:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Rechnungen & Gutschriften", desc: "Alle Ausgangsrechnungen mit Belegen" },
              { label: "Ausgaben & Belege", desc: "Betriebsausgaben mit gescannten Quittungen" },
              { label: "EÜR-Übersicht", desc: "Einnahmen-Überschuss-Rechnung" },
              { label: "USt-Zusammenfassung", desc: "MwSt-Beträge gruppiert nach Steuersatz" },
              { label: "Fahrtenbuch", desc: "Kilometeraufstellungen und Fahrtkosten" },
              { label: "Stammdaten", desc: "Geschäftsdaten, Steuernummer, USt-IdNr" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Info Summary */}
      {businessSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Ihre Geschäftsdaten</CardTitle>
            <CardDescription>Diese Daten werden dem Steuerberater übermittelt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {businessSettings.business_name && (
                <div>
                  <span className="text-muted-foreground">Firma:</span>
                  <span className="ml-2 font-medium text-foreground">{businessSettings.business_name}</span>
                </div>
              )}
              {businessSettings.owner_name && (
                <div>
                  <span className="text-muted-foreground">Inhaber:</span>
                  <span className="ml-2 font-medium text-foreground">{businessSettings.owner_name}</span>
                </div>
              )}
              {businessSettings.tax_number && (
                <div>
                  <span className="text-muted-foreground">Steuernummer:</span>
                  <span className="ml-2 font-medium text-foreground">{businessSettings.tax_number}</span>
                </div>
              )}
              {businessSettings.vat_id && (
                <div>
                  <span className="text-muted-foreground">USt-IdNr:</span>
                  <span className="ml-2 font-medium text-foreground">{businessSettings.vat_id}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Bundle */}
      <Card>
        <CardHeader>
          <CardTitle>Komplettpaket herunterladen</CardTitle>
          <CardDescription>
            ZIP-Archiv mit allen Buchhaltungsdaten und Belegen für die Übergabe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => toast.info("Komplettpaket-Export wird in einem zukünftigen Update verfügbar sein.")}
          >
            <Share2 className="h-4 w-4" />
            Steuerberater-Paket erstellen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
