import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Link2, Users, Mail, Search, RefreshCw, Loader2, TrendingUp,
  UserPlus, CheckCircle, Clock, XCircle, Send
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ConnectionData {
  id: string;
  provider_id: string;
  client_id: string;
  status: string;
  is_active: boolean | null;
  granted_at: string;
  partner_name: string | null;
  partner_email: string | null;
  can_view_basic: boolean | null;
  can_view_medical: boolean | null;
  can_create_appointments: boolean | null;
  provider_name?: string;
  client_name?: string;
  provider_readable_id?: string;
  client_readable_id?: string;
}

interface InvitationData {
  id: string;
  invited_by: string;
  invited_email: string;
  invited_name: string | null;
  invite_role: string;
  personal_message?: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  inviter_name?: string;
  inviter_readable_id?: string;
}

interface ConnectStats {
  totalConnections: number;
  activeConnections: number;
  pendingConnections: number;
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  expiredInvitations: number;
  invitationsThisWeek: number;
}

export function AdminConnections() {
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [stats, setStats] = useState<ConnectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connectionsRes, invitationsRes] = await Promise.all([
        supabase
          .from("access_grants")
          .select("id, provider_id, client_id, status, is_active, granted_at, partner_name, partner_email, can_view_basic, can_view_medical, can_create_appointments")
          .order("granted_at", { ascending: false })
          .limit(500),
        supabase
          .from("hm_connect_invitations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      let enrichedConnections: ConnectionData[] = [];
      if (connectionsRes.data) {
        const providerIds = [...new Set(connectionsRes.data.map(c => c.provider_id))];
        const clientIds = [...new Set(connectionsRes.data.map(c => c.client_id))];
        const allIds = [...new Set([...providerIds, ...clientIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, readable_id")
          .in("id", allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        enrichedConnections = connectionsRes.data.map(c => ({
          ...c,
          provider_name: profileMap.get(c.provider_id)?.full_name || "–",
          client_name: profileMap.get(c.client_id)?.full_name || "–",
          provider_readable_id: profileMap.get(c.provider_id)?.readable_id || "",
          client_readable_id: profileMap.get(c.client_id)?.readable_id || "",
        }));
      }

      let enrichedInvitations: InvitationData[] = [];
      if (invitationsRes.data) {
        const inviterIds = [...new Set(invitationsRes.data.map(i => i.invited_by).filter(Boolean))];
        const { data: inviterProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, readable_id")
          .in("id", inviterIds);

        const inviterMap = new Map(inviterProfiles?.map(p => [p.id, p]) || []);

        enrichedInvitations = invitationsRes.data.map(i => ({
          ...i,
          inviter_name: inviterMap.get(i.invited_by)?.full_name || "–",
          inviter_readable_id: inviterMap.get(i.invited_by)?.readable_id || "",
        }));
      }

      // Calculate stats
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const computedStats: ConnectStats = {
        totalConnections: enrichedConnections.length,
        activeConnections: enrichedConnections.filter(c => c.is_active && c.status === "active").length,
        pendingConnections: enrichedConnections.filter(c => c.status === "pending").length,
        totalInvitations: enrichedInvitations.length,
        pendingInvitations: enrichedInvitations.filter(i => i.status === "pending").length,
        acceptedInvitations: enrichedInvitations.filter(i => i.status === "accepted").length,
        expiredInvitations: enrichedInvitations.filter(i => i.status === "expired").length,
        invitationsThisWeek: enrichedInvitations.filter(i => new Date(i.created_at) >= oneWeekAgo).length,
      };

      setConnections(enrichedConnections);
      setInvitations(enrichedInvitations);
      setStats(computedStats);
    } catch (err) {
      console.error("Error fetching connections:", err);
      toast.error("Fehler beim Laden der Verbindungsdaten");
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = useMemo(() => {
    return connections.filter(c => {
      const matchesSearch = !search || 
        c.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.provider_readable_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.client_readable_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.partner_email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [connections, search, statusFilter]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter(i => {
      const matchesSearch = !search ||
        i.invited_email?.toLowerCase().includes(search.toLowerCase()) ||
        i.invited_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.inviter_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.inviter_readable_id?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invitations, search, statusFilter]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Aktiv</Badge>;
      case "accepted": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Angenommen</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Ausstehend</Badge>;
      case "expired": return <Badge className="bg-muted text-muted-foreground">Abgelaufen</Badge>;
      case "revoked": return <Badge variant="destructive">Widerrufen</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            HM Connect · Netzwerk-Übersicht
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Alle Verbindungen und Einladungen plattformweit
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-xs text-muted-foreground">Aktive Verbindungen</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeConnections}</p>
            <p className="text-xs text-muted-foreground">von {stats.totalConnections} gesamt</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              <span className="text-xs text-muted-foreground">Ausstehend</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pendingConnections}</p>
            <p className="text-xs text-muted-foreground">Verbindungsanfragen</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Send className="w-5 h-5" />
              <span className="text-xs text-muted-foreground">Einladungen</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalInvitations}</p>
            <p className="text-xs text-muted-foreground">{stats.acceptedInvitations} angenommen · {stats.pendingInvitations} offen</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs text-muted-foreground">Diese Woche</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.invitationsThisWeek}</p>
            <p className="text-xs text-muted-foreground">neue Einladungen</p>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Name, E-Mail oder #ID suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="accepted">Angenommen</SelectItem>
            <SelectItem value="expired">Abgelaufen</SelectItem>
            <SelectItem value="revoked">Widerrufen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tables */}
      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections" className="gap-1.5">
            <Users className="w-4 h-4" />
            Verbindungen ({filteredConnections.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-1.5">
            <Mail className="w-4 h-4" />
            Einladungen ({filteredInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Client / Partner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Berechtigungen</TableHead>
                  <TableHead>Verbunden seit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Keine Verbindungen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnections.slice(0, 100).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.provider_name}</p>
                          <p className="text-xs text-muted-foreground">#{c.provider_readable_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.partner_name || c.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.partner_email || `#${c.client_readable_id}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {c.can_view_basic && <Badge variant="outline" className="text-[10px]">Basis</Badge>}
                          {c.can_view_medical && <Badge variant="outline" className="text-[10px]">Medizin</Badge>}
                          {c.can_create_appointments && <Badge variant="outline" className="text-[10px]">Termine</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(c.granted_at), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Eingeladen von</TableHead>
                  <TableHead>Eingeladene Person</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gesendet am</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Keine Einladungen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvitations.slice(0, 100).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{i.inviter_name}</p>
                          <p className="text-xs text-muted-foreground">#{i.inviter_readable_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{i.invited_name || "–"}</p>
                          <p className="text-xs text-muted-foreground">{i.invited_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {i.invite_role === "provider" ? "Hufbearbeiter" : i.invite_role === "client" ? "Kunde" : "Partner"}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(i.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(i.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
