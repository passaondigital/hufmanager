import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionSearch } from "@/components/network/ConnectionSearch";
import { InviteToHufManager } from "@/components/hm-connect/InviteToHufManager";
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
  ArrowRight,
  Check,
  X,
  Loader2,
  Info,
  Crown,
  UserPlus,
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

      // Fetch profile info for the other party
      const otherIds = (data || []).map(g =>
        g.client_id === user.id ? g.provider_id : g.client_id
      );
      const uniqueIds = [...new Set(otherIds)];

      if (uniqueIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, readable_id")
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

  return (
    <div className="space-y-6">
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
                Nutze die <strong>#ID-Suche</strong>, um dich mit anderen zu vernetzen.
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
                      <div className="flex items-center gap-2">
                        {conn.other_readable_id && (
                          <Badge variant="outline" className="font-mono text-xs">#{conn.other_readable_id}</Badge>
                        )}
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
  const [activeTab, setActiveTab] = useState("search");

  // Pro plan gate
  const isPlanAllowed = plan === "pro" || plan === "duo" || plan === "team";
  const isAdmin = role === "admin";

  if (!isPlanAllowed && !isAdmin) {
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
            <Button onClick={() => window.location.href = "/management?tab=subscription"}>
              <Crown className="h-4 w-4 mr-2" />
              Auf Pro upgraden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const searchTypes = role === "client"
    ? [{ key: "provider" as const, label: "Hufbearbeiter finden", prefix: "#PID" }]
    : [
        { key: "client" as const, label: "Kunde finden", prefix: "#KID" },
        { key: "provider" as const, label: "Profi finden", prefix: "#PID" },
        { key: "horse" as const, label: "Pferd finden", prefix: "#EQID" },
      ];

  return (
    <div className="container max-w-4xl py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Link2 className="h-7 w-7 text-primary" />
            HM Connect
          </h1>
          <p className="text-muted-foreground mt-1">
            Vernetze dich DSGVO-konform mit Profis, Kunden & Pferden über ihre #ID.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">So funktioniert HM Connect</p>
            <p className="text-muted-foreground mt-1">
              Jeder Nutzer hat eine einzigartige #ID (z.B. <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">#PID-123456</code>). 
              Gib die #ID ein, um eine Verbindungsanfrage zu senden. 
              Daten werden erst nach beidseitiger Bestätigung geteilt.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Suchen & Verbinden
          </TabsTrigger>
          <TabsTrigger value="invite" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Einladen
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-2">
            <Users className="h-4 w-4" />
            Verbindungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6 space-y-4">
          {searchTypes.map(st => (
            <ConnectionSearch
              key={st.key}
              searchType={st.key}
              onConnectionRequested={() => setActiveTab("connections")}
            />
          ))}
        </TabsContent>

        <TabsContent value="invite" className="mt-6">
          <InviteToHufManager />
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <MyConnections />
        </TabsContent>
      </Tabs>
    </div>
  );
}
