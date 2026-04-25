import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Globe, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface EcosystemApp {
  key: string;
  name: string;
  description: string;
  idPrefix: string;
  url: string;
  icon: string;
}

interface EcosystemLink {
  id: string;
  app_key: string;
  external_id: string | null;
  status: string | null;
  data_sharing_enabled: boolean | null;
  connected_at: string | null;
}

const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    key: "hufmanager",
    name: "HufManager",
    description: "Professionelle Hufbearbeiter-Software",
    idPrefix: "#pid",
    url: "https://hufiapp.de",
    icon: "🐴",
  },
  {
    key: "hufiai",
    name: "HufiAi",
    description: "KI-gestützte Hufanalyse",
    idPrefix: "#kid",
    url: "https://hufiapp.de",
    icon: "🤖",
  },
  {
    key: "hufiapp",
    name: "HufiApp",
    description: "Mobile App für Pferdebesitzer",
    idPrefix: "#eqid",
    url: "https://hufiapp.de",
    icon: "📱",
  },
  {
    key: "memberhorse",
    name: "MemberHorse",
    description: "Community & Mitgliedschaft",
    idPrefix: "#mid",
    url: "https://memberhorse.de",
    icon: "👥",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  connected: { label: "Verbunden", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  not_connected: { label: "Nicht verbunden", className: "bg-muted text-muted-foreground border-border" },
  update_required: { label: "Update nötig", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};

export function EcosystemConnect() {
  const { user } = useAuth();
  const [links, setLinks] = useState<EcosystemLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchLinks();
  }, [user]);

  const fetchLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ecosystem_links")
      .select("id, app_key, external_id, status, data_sharing_enabled, connected_at")
      .eq("user_id", user!.id);

    if (!error && data) {
      setLinks(data as EcosystemLink[]);
    }
    setLoading(false);
  };

  const getLink = (appKey: string) => links.find((l) => l.app_key === appKey);

  const handleConnect = async (app: EcosystemApp) => {
    if (!user) return;
    setConnecting(app.key);

    try {
      // Check if link exists
      const existing = getLink(app.key);

      if (existing?.status === "connected") {
        // Open manage page
        window.open(app.url, "_blank");
        setConnecting(null);
        return;
      }

      // Try to check ecosystem status via edge function
      try {
        const { data: statusData } = await supabase.functions.invoke("check-ecosystem", {
          body: { app_key: app.key, action: "check_status" },
        });

        if (statusData?.connected) {
          // Upsert link as connected
          await supabase.from("ecosystem_links").upsert(
            {
              user_id: user.id,
              app_key: app.key,
              external_id: statusData.external_id || null,
              status: "connected",
              connected_at: new Date().toISOString(),
              global_id: user.id,
            },
            { onConflict: "user_id,app_key" }
          );

          toast({ title: "Verbunden!", description: `${app.name} wurde erfolgreich verbunden.` });
          fetchLinks();
          setConnecting(null);
          return;
        }
      } catch {
        // Edge function not reachable or no external check available
      }

      // No existing connection - redirect to registration
      window.open(app.url, "_blank");

      // Create a pending link
      await supabase.from("ecosystem_links").upsert(
        {
          user_id: user.id,
          app_key: app.key,
          status: "not_connected",
          global_id: user.id,
        },
        { onConflict: "user_id,app_key" }
      );

      toast({
        title: "Weiterleitung",
        description: `Bitte registriere dich bei ${app.name} und verbinde dann erneut.`,
      });
      fetchLinks();
    } catch (err) {
      console.error("Connect error:", err);
      toast({ title: "Fehler", description: "Verbindung fehlgeschlagen.", variant: "destructive" });
    }

    setConnecting(null);
  };

  const handleToggleSharing = async (app: EcosystemApp, enabled: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from("ecosystem_links")
      .update({ data_sharing_enabled: enabled })
      .eq("user_id", user.id)
      .eq("app_key", app.key);

    if (error) {
      toast({ title: "Fehler", description: "Einstellung konnte nicht gespeichert werden.", variant: "destructive" });
      return;
    }

    setLinks((prev) =>
      prev.map((l) => (l.app_key === app.key ? { ...l, data_sharing_enabled: enabled } : l))
    );

    toast({
      title: enabled ? "Datenaustausch aktiviert" : "Datenaustausch deaktiviert",
      description: `${app.idPrefix} Daten werden ${enabled ? "jetzt" : "nicht mehr"} mit ${app.name} geteilt.`,
    });
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ecosystem Connect</h3>
          <p className="text-muted-foreground mb-4">
            Melde dich an, um deine Apps zu verbinden.
          </p>
          <Button onClick={() => (window.location.href = "/auth")}>Anmelden</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ecosystem Connect</h2>
          <p className="text-muted-foreground">
            Verbinde deine Pascal Schmid App-Familie für nahtlose Integration.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLinks} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ECOSYSTEM_APPS.map((app) => {
          const link = getLink(app.key);
          const status = link?.status || "not_connected";
          const config = statusConfig[status] || statusConfig.not_connected;
          const isConnected = status === "connected";
          const isConnecting = connecting === app.key;

          return (
            <Card key={app.key} className="relative overflow-hidden transition-shadow hover:shadow-md">
              {isConnected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-copper-light" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{app.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* External ID display */}
                {link?.external_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">ID:</span>
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                      {link.external_id}
                    </code>
                  </div>
                )}

                {/* Data sharing toggle */}
                {isConnected && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Share {app.idPrefix} data
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Datenaustausch mit {app.name}
                      </p>
                    </div>
                    <Switch
                      checked={link?.data_sharing_enabled ?? false}
                      onCheckedChange={(checked) => handleToggleSharing(app, checked)}
                    />
                  </div>
                )}

                {/* Connected at */}
                {link?.connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Verbunden seit{" "}
                    {new Date(link.connected_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                )}

                {/* Action button */}
                <Button
                  className="w-full"
                  variant={isConnected ? "outline" : "default"}
                  onClick={() => handleConnect(app)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  {isConnected ? "Verwalten" : "Verbinden"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
