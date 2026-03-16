import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Link2, CheckCircle, AlertTriangle, Clock, ExternalLink, Upload, Loader2, Globe } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

const PMS_SYSTEMS = [
  { key: "ezyvet", name: "ezyVet", tier: 1, logo: "🔬", description: "REST API, OAuth 2.0 – Vollständige Synchronisation", apiStatus: "available" as const, features: ["Patienten", "Befunde", "Impfungen", "Rezepte", "Labor"] },
  { key: "provet", name: "Provet Cloud", tier: 1, logo: "☁️", description: "REST API, Token-basiert – EU/DSGVO-konform", apiStatus: "available" as const, features: ["Patienten", "Konsultationen", "Rechnungen", "Webhooks"] },
  { key: "vetera", name: "Vetera.net", tier: 2, logo: "🏥", description: "Swagger API – Partnervertrag erforderlich", apiStatus: "partner_required" as const, features: ["Patienten", "Befunde", "IDEXX-Labor", "DATEV"] },
  { key: "vet7", name: "VET7.well", tier: 2, logo: "🇦🇹", description: "Österreich-Leader – API auf Anfrage", apiStatus: "partner_required" as const, features: ["Patienten", "KI-Dokumentation", "Labor"] },
  { key: "debevet", name: "debevet", tier: 3, logo: "💻", description: "Cloud-basiert – Nur CSV-Import möglich", apiStatus: "csv_only" as const, features: ["CSV-Export"] },
  { key: "inbehandlung", name: "inBehandlung", tier: 3, logo: "🩺", description: "400+ Praxen – Nur CSV-Import möglich", apiStatus: "csv_only" as const, features: ["CSV-Export"] },
  { key: "easyvet", name: "easyVET", tier: 3, logo: "📋", description: "WDT-Ökosystem – Geschlossenes System, CSV möglich", apiStatus: "csv_only" as const, features: ["CSV-Export"] },
];

export default function VetPMSConnect() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [ezyvetUrl, setEzyvetUrl] = useState("");
  const [showEzyvetSetup, setShowEzyvetSetup] = useState(false);

  const { data: connections } = useQuery({
    queryKey: ["vet-sync-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vet_sync_connections")
        .select("id, provider_type, status, last_sync_at, error_message, clinic_url, connection_name, auto_sync")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const connectMutation = useMutation({
    mutationFn: async ({ providerType, clinicUrl }: { providerType: string; clinicUrl?: string }) => {
      const pms = PMS_SYSTEMS.find(p => p.key === providerType);
      if (pms?.apiStatus === "csv_only") {
        window.location.href = "/vet/csv-import";
        return;
      }
      if (pms?.apiStatus === "partner_required") {
        toast.info(`${pms.name} erfordert einen Partnervertrag. Kontaktiere uns unter info@hufmanager.de`);
        return;
      }

      const { error } = await supabase
        .from("vet_sync_connections")
        .upsert({
          user_id: user!.id,
          provider_type: providerType,
          status: "pending",
          clinic_url: clinicUrl || null,
          connection_name: pms?.name || providerType,
        }, { onConflict: "user_id,provider_type" });
      if (error) throw error;
      toast.success(`${pms?.name} Verbindung eingerichtet. OAuth-Flow wird in Kürze verfügbar sein.`);
      setShowEzyvetSetup(false);
      setConnectingKey(null);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vet-sync-connections"] }),
    onError: (err: any) => toast.error(err.message || "Fehler beim Verbinden"),
  });

  if (!user) return <Navigate to="/auth" replace />;

  const getConnection = (key: string) => connections?.find((c: any) => c.provider_type === key);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">🔗 Praxissoftware verbinden</h1>
            <p className="text-xs text-muted-foreground">Synchronisiere Befunde automatisch mit der HufManager Pferdeakte</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Info */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Verbinde deine Praxissoftware und synchronisiere Befunde, Impfungen und Rezepte automatisch.
              Du arbeitest weiter in deiner Software – HufManager holt die Daten automatisch.
            </p>
          </CardContent>
        </Card>

        {/* ezyVet Setup Modal */}
        {showEzyvetSetup && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">🔬 ezyVet verbinden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                  <Badge>1</Badge>
                  <p className="text-sm">Klinik-URL eingeben</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="meineklinik"
                    value={ezyvetUrl}
                    onChange={e => setEzyvetUrl(e.target.value)}
                    className="flex-1"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">.ezyvet.com</span>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                  <Badge variant="secondary">2</Badge>
                  <p className="text-sm text-muted-foreground">OAuth-Autorisierung (kommt in Kürze)</p>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                  <Badge variant="secondary">3</Badge>
                  <p className="text-sm text-muted-foreground">Pferde automatisch matchen</p>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                  <Badge variant="secondary">4</Badge>
                  <p className="text-sm text-muted-foreground">Sync starten</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEzyvetSetup(false)}>Abbrechen</Button>
                <Button
                  onClick={() => connectMutation.mutate({ providerType: "ezyvet", clinicUrl: `${ezyvetUrl}.ezyvet.com` })}
                  disabled={!ezyvetUrl || connectMutation.isPending}
                >
                  {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                  Verbindung anlegen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier 1 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">⭐ Direkte API-Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PMS_SYSTEMS.filter(p => p.tier === 1).map(pms => (
              <PMSCard
                key={pms.key}
                pms={pms}
                connection={getConnection(pms.key)}
                onConnect={() => {
                  if (pms.key === "ezyvet") {
                    setShowEzyvetSetup(true);
                  } else {
                    connectMutation.mutate({ providerType: pms.key });
                  }
                }}
                loading={connectMutation.isPending}
              />
            ))}
          </div>
        </div>

        {/* Tier 2 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">🤝 Partnervertrag erforderlich</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PMS_SYSTEMS.filter(p => p.tier === 2).map(pms => (
              <PMSCard key={pms.key} pms={pms} connection={getConnection(pms.key)} onConnect={() => connectMutation.mutate({ providerType: pms.key })} loading={connectMutation.isPending} />
            ))}
          </div>
        </div>

        {/* Tier 3 */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">📄 CSV-Import</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PMS_SYSTEMS.filter(p => p.tier === 3).map(pms => (
              <PMSCard key={pms.key} pms={pms} connection={null} onConnect={() => connectMutation.mutate({ providerType: pms.key })} loading={false} />
            ))}
          </div>
        </div>

        {/* CSV Fallback */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">📁</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Andere Software / Manuelle Eingabe</p>
              <p className="text-xs text-muted-foreground">CSV-Export aus deiner Software hochladen</p>
            </div>
            <Link to="/vet/csv-import">
              <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> CSV importieren</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function PMSCard({ pms, connection, onConnect, loading }: {
  pms: typeof PMS_SYSTEMS[0];
  connection: any;
  onConnect: () => void;
  loading: boolean;
}) {
  const statusIcon = connection?.status === "connected"
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : connection?.status === "error"
    ? <AlertTriangle className="h-4 w-4 text-destructive" />
    : connection?.status === "pending"
    ? <Clock className="h-4 w-4 text-amber-500" />
    : null;

  return (
    <Card className={connection?.status === "connected" ? "border-green-200" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pms.logo}</span>
            <div>
              <p className="text-sm font-semibold">{pms.name}</p>
              <p className="text-xs text-muted-foreground">{pms.description}</p>
            </div>
          </div>
          {statusIcon}
        </div>
        <div className="flex flex-wrap gap-1">
          {pms.features.map(f => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>
        {connection?.clinic_url && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3" /> {connection.clinic_url}
          </p>
        )}
        {!connection || connection.status !== "connected" ? (
          <Button
            size="sm"
            className="w-full"
            variant={pms.apiStatus === "csv_only" ? "outline" : "default"}
            onClick={onConnect}
            disabled={loading}
          >
            {pms.apiStatus === "csv_only" ? (
              <><Upload className="h-3 w-3 mr-1" /> CSV importieren</>
            ) : pms.apiStatus === "partner_required" ? (
              <><ExternalLink className="h-3 w-3 mr-1" /> Partnerschaft anfragen</>
            ) : (
              <><Link2 className="h-3 w-3 mr-1" /> Verbinden</>
            )}
          </Button>
        ) : (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Verbunden
            {connection.last_sync_at && (
              <span className="text-muted-foreground ml-1">· Letzter Sync: {new Date(connection.last_sync_at).toLocaleDateString("de-DE")}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
