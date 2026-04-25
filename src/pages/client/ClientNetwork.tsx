import { useState } from "react";
import { Users, UserPlus, Search, MessageSquare, Link2, Check, X, Clock, Building2, Heart, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Connection {
  id: string;
  requester_id: string;
  target_id: string;
  connection_type: string;
  status: string;
  message: string | null;
  created_at: string;
  responded_at: string | null;
}

const CONNECTION_TYPES = [
  { value: "general", label: "Reitfreund", icon: Heart },
  { value: "stall_einsteller", label: "Einsteller", icon: Building2 },
  { value: "riding_buddy", label: "Reitbeteiligung", icon: Users },
  { value: "breeder_buyer", label: "Zucht / Handel", icon: Briefcase },
];

export default function ClientNetwork() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("connections");

  const { data: connections = [] } = useQuery({
    queryKey: ["client-connections", user?.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("client_connections" as any)
        .select("*")
        .or(`requester_id.eq.${user!.id},target_id.eq.${user!.id}`)
        .order("created_at", { ascending: false }) as any);
      return (data || []) as Connection[];
    },
    enabled: !!user,
  });

  const respondToConnection = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await (supabase
        .from("client_connections" as any)
        .update({
          status: accept ? "accepted" : "declined",
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.accept ? "Verbindung akzeptiert!" : "Anfrage abgelehnt.");
      qc.invalidateQueries({ queryKey: ["client-connections"] });
    },
  });

  const activeConnections = connections.filter((c) => c.status === "accepted");
  const pendingIncoming = connections.filter((c) => c.status === "pending" && c.target_id === user?.id);
  const pendingOutgoing = connections.filter((c) => c.status === "pending" && c.requester_id === user?.id);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mein Netzwerk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verbinde dich mit Stallbetreibern, Reitfreunden und Geschäftspartnern
          </p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Einladen
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="connections">
            Verbindungen ({activeConnections.length})
          </TabsTrigger>
          <TabsTrigger value="incoming">
            Anfragen {pendingIncoming.length > 0 && (
              <span className="ml-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                {pendingIncoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover">Entdecken</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Verbindung suchen..." className="pl-10" />
          </div>

          {activeConnections.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Verbindungen</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Vernetze dich mit anderen Pferdebesitzern, Stallbetreibern oder Geschäftspartnern 
                  über Hufi Connect oder lade sie per E-Mail ein.
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Hufi Connect
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Per E-Mail einladen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeConnections.map((conn) => (
              <Card key={conn.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {conn.requester_id === user?.id ? conn.target_id : conn.requester_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CONNECTION_TYPES.find((t) => t.value === conn.connection_type)?.label || "Verbindung"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4 space-y-3">
          {pendingIncoming.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Keine ausstehenden Anfragen</p>
            </div>
          ) : (
            pendingIncoming.map((conn) => (
              <Card key={conn.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Neue Anfrage</p>
                      <p className="text-xs text-muted-foreground">
                        {CONNECTION_TYPES.find((t) => t.value === conn.connection_type)?.label}
                      </p>
                    </div>
                  </div>
                  {conn.message && (
                    <p className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded-lg">
                      „{conn.message}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => respondToConnection.mutate({ id: conn.id, accept: true })}
                    >
                      <Check className="h-3.5 w-3.5" /> Annehmen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => respondToConnection.mutate({ id: conn.id, accept: false })}
                    >
                      <X className="h-3.5 w-3.5" /> Ablehnen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Pferdemenschen finden</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Suche nach Stallbetreibern, Reitbeteiligungen oder Geschäftspartnern in deiner Nähe.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {CONNECTION_TYPES.map((type) => (
                  <Button key={type.value} variant="outline" className="gap-2 h-auto py-3 flex-col">
                    <type.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
