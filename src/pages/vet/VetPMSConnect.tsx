import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Link2, CheckCircle, AlertTriangle, Clock, ExternalLink, Upload } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";

const PMS_SYSTEMS = [
  {
    key: "ezyvet",
    name: "ezyVet",
    tier: 1,
    logo: "🔬",
    description: "REST API, OAuth 2.0 – Vollständige Synchronisation",
    apiStatus: "available",
    features: ["Patienten", "Befunde", "Impfungen", "Rezepte", "Laborergebnisse"],
  },
  {
    key: "provet",
    name: "Provet Cloud",
    tier: 1,
    logo: "☁️",
    description: "REST API, Token-basiert – EU/DSGVO-konform",
    apiStatus: "available",
    features: ["Patienten", "Konsultationen", "Rechnungen", "Webhooks"],
  },
  {
    key: "vetera",
    name: "Vetera.net",
    tier: 2,
    logo: "🏥",
    description: "Swagger API – Partnervertrag erforderlich",
    apiStatus: "partner_required",
    features: ["Patienten", "Befunde", "IDEXX-Labor", "DATEV"],
  },
  {
    key: "vet7",
    name: "VET7.well",
    tier: 2,
    logo: "🇦🇹",
    description: "Österreich-Leader – API auf Anfrage",
    apiStatus: "partner_required",
    features: ["Patienten", "KI-Dokumentation", "Labor"],
  },
  {
    key: "debevet",
    name: "debevet",
    tier: 3,
    logo: "💻",
    description: "Cloud-basiert – Nur CSV-Import möglich",
    apiStatus: "csv_only",
    features: ["CSV-Export"],
  },
  {
    key: "inbehandlung",
    name: "inBehandlung",
    tier: 3,
    logo: "🩺",
    description: "400+ Praxen – Nur CSV-Import möglich",
    apiStatus: "csv_only",
    features: ["CSV-Export"],
  },
  {
    key: "easyvet",
    name: "easyVET",
    tier: 3,
    logo: "📋",
    description: "WDT-Ökosystem – Geschlossenes System, CSV möglich",
    apiStatus: "csv_only",
    features: ["CSV-Export"],
  },
];

export default function VetPMSConnect() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections } = useQuery({
    queryKey: ["vet-sync-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vet_sync_connections")
        .select("id, provider_type, status, last_sync_at, error_message")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const connectMutation = useMutation({
    mutationFn: async (providerType: string) => {
      const pms = PMS_SYSTEMS.find((p) => p.key === providerType);
      if (pms?.apiStatus === "csv_only") {
        // Redirect to CSV import
        window.location.href = "/vet/csv-import";
        return;
      }
      if (pms?.apiStatus === "partner_required") {
        toast.info(`${pms.name} erfordert einen Partnervertrag. Kontaktiere uns unter info@hufmanager.de`);
        return;
      }

      // For Tier 1 (ezyVet, Provet) - create pending connection
      const { error } = await supabase
        .from("vet_sync_connections")
        .upsert({
          user_id: user!.id,
          provider_type: providerType,
          status: "pending",
        }, { onConflict: "user_id,provider_type" });
      if (error) throw error;
      toast.success(`${pms?.name} Verbindung wird eingerichtet. OAuth-Flow kommt in Kürze.`);
      // TODO: Redirect to OAuth flow when available
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vet-sync-connections"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fehler beim Verbinden");
    },
  });

  if (!user) return <Navigate to="/auth" replace />;

  const getConnectionStatus = (key: string) => {
    return connections?.find((c: any) => c.provider_type === key);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Software verbinden</h1>
            <p className="text-xs text-muted-foreground">Praxisverwaltungssoftware mit HufManager synchronisieren</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Info Banner */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
              🔄 1-Click PMS-Synchronisation
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Verbinde deine Praxissoftware und synchronisiere Befunde, Impfungen und Rezepte automatisch
              mit den Pferdeakten deiner Patienten. Kein doppeltes Eintippen mehr.
            </p>
          </CardContent>
        </Card>

        {/* Tier 1: Direct API */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            ⭐ Direkte API-Integration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PMS_SYSTEMS.filter((p) => p.tier === 1).map((pms) => {
              const conn = getConnectionStatus(pms.key);
              return (
                <PMSCard
                  key={pms.key}
                  pms={pms}
                  connection={conn}
                  onConnect={() => connectMutation.mutate(pms.key)}
                  loading={connectMutation.isPending}
                />
              );
            })}
          </div>
        </div>

        {/* Tier 2: Partner Required */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            🤝 Partnervertrag erforderlich
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PMS_SYSTEMS.filter((p) => p.tier === 2).map((pms) => {
              const conn = getConnectionStatus(pms.key);
              return (
                <PMSCard
                  key={pms.key}
                  pms={pms}
                  connection={conn}
                  onConnect={() => connectMutation.mutate(pms.key)}
                  loading={connectMutation.isPending}
                />
              );
            })}
          </div>
        </div>

        {/* Tier 3: CSV Only */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            📄 CSV-Import
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PMS_SYSTEMS.filter((p) => p.tier === 3).map((pms) => (
              <PMSCard
                key={pms.key}
                pms={pms}
                connection={null}
                onConnect={() => connectMutation.mutate(pms.key)}
                loading={false}
              />
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
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" /> CSV importieren
              </Button>
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
          {pms.features.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>
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
              <span className="text-muted-foreground ml-1">
                · Letzter Sync: {new Date(connection.last_sync_at).toLocaleDateString("de-DE")}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
