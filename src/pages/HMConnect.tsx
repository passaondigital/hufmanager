import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { UniversalSearch } from "@/components/hm-connect/UniversalSearch";
import { InviteToHufManager } from "@/components/hm-connect/InviteToHufManager";
import { MyQRCode } from "@/components/hm-connect/MyQRCode";
import { ConnectionPermissions } from "@/components/hm-connect/ConnectionPermissions";
import { EquidPermissionManager } from "@/components/hm-connect/EquidPermissionManager";
import { EquidChat } from "@/components/hm-connect/EquidChat";
import { CommunicationMatrix } from "@/components/shared/CommunicationMatrix";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Link2,
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  Check,
  X,
  Loader2,
  Crown,
  UserPlus,
  QrCode,
  Eye,
  MessageCircle,
} from "lucide-react";

// Connection overview component
function MyConnections() {
  const { user } = useAuth();

  const { data: connections = [], isLoading, refetch } = useQuery({
    queryKey: ["hm-connect-connections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("access_grants")
        .select(`
          id, status, is_active, granted_at, requested_at, requested_by, request_message,
          client_id, provider_id
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("granted_at", { ascending: false });

      if (error) throw error;

      const otherIds = (data || []).map(g =>
        g.client_id === user.id ? g.provider_id : g.client_id
      );
      const uniqueIds = [...new Set(otherIds)];

      if (uniqueIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, readable_id, role")
        .in("id", uniqueIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(g => {
        const otherId = g.client_id === user.id ? g.provider_id : g.client_id;
        const profile = profileMap.get(otherId);
        return {
          ...g,
          other_id: otherId,
          other_name: profile?.full_name || "Unbekannt",
          other_avatar: profile?.avatar_url,
          other_readable_id: profile?.readable_id,
          other_role: profile?.role || "unknown",
          is_incoming: g.requested_by !== user.id,
          my_role: g.client_id === user.id ? "client" : "provider",
        };
      });
    },
    enabled: !!user?.id,
  });

  const handleAccept = async (grantId: string) => {
    const { error } = await supabase
      .from("access_grants")
      .update({
        status: "active",
        is_active: true,
        granted_at: new Date().toISOString(),
      })
      .eq("id", grantId);

    if (error) {
      toast({ title: "Fehler", variant: "destructive" });
    } else {
      toast({ title: "Verbindung angenommen!" });
      refetch();
    }
  };

  const handleReject = async (grantId: string) => {
    const { error } = await supabase
      .from("access_grants")
      .update({
        status: "rejected",
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", grantId);

    if (error) {
      toast({ title: "Fehler", variant: "destructive" });
    } else {
      toast({ title: "Anfrage abgelehnt" });
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pending = connections.filter(c => c.status === "pending");
  const active = connections.filter(c => c.status === "active" && c.is_active);
  const inactive = connections.filter(c => c.status !== "pending" && !(c.status === "active" && c.is_active));

  const roleLabels: Record<string, string> = {
    provider: "Hufpfleger",
    client: "Besitzer",
    partner: "Fachpartner",
    employee: "Mitarbeiter",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{active.length}</p>
          <p className="text-xs text-muted-foreground">Aktiv</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Ausstehend</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{inactive.length}</p>
          <p className="text-xs text-muted-foreground">Inaktiv</p>
        </Card>
      </div>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Loader2 className="h-4 w-4" />
            Ausstehende Anfragen ({pending.length})
          </h3>
          {pending.map(conn => (
            <Card key={conn.id} className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conn.other_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conn.other_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conn.other_name}</p>
                    <div className="flex items-center gap-2">
                      {conn.other_readable_id && (
                        <Badge variant="outline" className="font-mono text-xs">#{conn.other_readable_id}</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[conn.other_role] || conn.other_role}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-600">
                        {conn.is_incoming ? "Eingehend" : "Gesendet"}
                      </Badge>
                    </div>
                    {conn.request_message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{conn.request_message}"</p>
                    )}
                  </div>
                  {conn.is_incoming ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAccept(conn.id)}>
                        <Check className="h-4 w-4 mr-1" /> Annehmen
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(conn.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">Warte auf Antwort...</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Connections */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-emerald-500" />
          Aktive Verbindungen ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Noch keine aktiven Verbindungen.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nutze <strong>Suchen</strong>, <strong>QR-Code</strong> oder <strong>Einladen</strong> um dich zu vernetzen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map(conn => (
              <Card key={conn.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conn.other_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conn.other_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conn.other_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {conn.other_readable_id && (
                          <Badge variant="outline" className="font-mono text-xs">#{conn.other_readable_id}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {roleLabels[conn.other_role] || conn.other_role}
                        </Badge>
                        <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">
                          Verbunden
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive / Rejected */}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserX className="h-4 w-4" />
            Inaktiv ({inactive.length})
          </h3>
          {inactive.map(conn => (
            <div key={conn.id} className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{conn.other_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-sm truncate flex-1">{conn.other_name}</p>
              <Badge variant="secondary" className="text-xs">{conn.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HMConnect() {
  const { plan } = useSubscription();
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("connections");

  // Auto-open search if ?id= param is present (from QR scan)
  const prefilledId = searchParams.get("id");
  useEffect(() => {
    if (prefilledId) {
      setActiveTab("search");
    }
  }, [prefilledId]);

  // Plan gate: Clients can always use HM Connect for free
  const isClient = role === "client";
  const isAdmin = role === "admin";
  const isPlanAllowed = plan === "pro" || plan === "duo" || plan === "team";

  if (!isClient && !isPlanAllowed && !isAdmin) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <Crown className="h-16 w-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">HM Connect</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Vernetze dich DSGVO-konform mit anderen Profis, Kunden und Pferden über ihre #ID.
              <br />Dieses Feature ist ab dem <strong>Pro-Plan</strong> verfügbar.
            </p>
            <Button onClick={() => window.location.href = "/management/abo"}>
              <Crown className="h-4 w-4 mr-2" />
              Auf Pro upgraden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Link2 className="h-7 w-7 text-primary" />
          HM Connect
        </h1>
        <p className="text-muted-foreground mt-1">
          Dein Netzwerk — Suchen, Verbinden, Verwalten. Alles DSGVO-konform.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">5 Wege zur Vernetzung</p>
            <p className="text-muted-foreground mt-1">
              <strong>🔍 Suchen</strong> — Name, PLZ, E-Mail, Beruf oder #ID. 
              <strong> 📱 QR-Code</strong> — Scannen oder teilen. 
              <strong> ✉️ Einladen</strong> — Per E-Mail einladen.
              <strong> 🐴 Equid-Rechte</strong> — Pro Pferd granular steuern.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-7 gap-1">
            <TabsTrigger value="connections" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Verbindungen</span>
              <span className="sm:hidden">Netzwerk</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <Search className="h-3.5 w-3.5" />
              Suchen
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <QrCode className="h-3.5 w-3.5" />
              QR
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <UserPlus className="h-3.5 w-3.5" />
              Einladen
            </TabsTrigger>
            <TabsTrigger value="equid" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              🐴
              <span className="hidden sm:inline">Equid-Rechte</span>
              <span className="sm:hidden">Rechte</span>
            </TabsTrigger>
            <TabsTrigger value="equid-chat" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Equid-Chat</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs whitespace-nowrap px-2.5">
              <Eye className="h-3.5 w-3.5" />
              Info
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="connections" className="mt-6">
          <MyConnections />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <UniversalSearch onConnectionRequested={() => setActiveTab("connections")} />
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          <MyQRCode />
        </TabsContent>

        <TabsContent value="invite" className="mt-6">
          <InviteToHufManager />
        </TabsContent>

        <TabsContent value="equid" className="mt-6">
          <EquidPermissionManager />
        </TabsContent>

        <TabsContent value="equid-chat" className="mt-6">
          <EquidChat />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6 space-y-6">
          <ConnectionPermissions viewerRole={role || "provider"} targetRole={isClient ? "provider" : "client"} />
          <CommunicationMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
