import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RoleComparisonTable } from "@/components/shared/RoleComparisonTable";
import { CommunicationMatrix } from "@/components/shared/CommunicationMatrix";
import { DataAccessMatrix } from "@/components/shared/DataAccessMatrix";
import { Loader2, Users, Shield, Link, Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
}

interface GrantRow {
  id: string;
  provider_id: string;
  client_id: string;
  status: string;
  is_active: boolean | null;
  granted_at: string;
  provider_name: string | null;
  client_name: string | null;
}

export default function AdminRoles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");
  const [grantSearch, setGrantSearch] = useState("");

  // Tab 2: Aktive Nutzer nach Rolle
  const { data: roleCounts, isLoading: countsLoading } = useQuery({
    queryKey: ["admin-role-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      const counts: Record<string, number> = { provider: 0, client: 0, partner: 0, employee: 0, admin: 0 };
      data?.forEach((r) => { counts[r.role] = (counts[r.role] || 0) + 1; });
      return counts;
    },
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-all-users", roleFilter],
    queryFn: async () => {
      let query = supabase.from("user_roles").select("user_id, role");
      if (roleFilter !== "all") query = query.eq("role", roleFilter as any);
      const { data: roles } = await query;
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .in("id", userIds)
        .is("deleted_at", null);

      return (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        last_sign_in_at: null,
        role: roleMap.get(p.id) || "unknown",
      })) as UserRow[];
    },
  });

  // Tab 3: Freigaben
  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ["admin-grants-overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("access_grants")
        .select("id, provider_id, client_id, status, is_active, granted_at")
        .order("granted_at", { ascending: false })
        .limit(200);

      if (!data?.length) return [];
      
      const allIds = [...new Set([...data.map((g) => g.provider_id), ...data.map((g) => g.client_id)])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      
      return data.map((g) => ({
        ...g,
        provider_name: nameMap.get(g.provider_id) || "—",
        client_name: nameMap.get(g.client_id) || "—",
      })) as GrantRow[];
    },
  });

  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
  });

  const filteredGrants = grants.filter((g) => {
    if (!grantSearch) return true;
    const s = grantSearch.toLowerCase();
    return (g.provider_name?.toLowerCase().includes(s) || g.client_name?.toLowerCase().includes(s));
  });

  const ROLE_BADGES: Record<string, string> = {
    provider: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    client: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    partner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    employee: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mission-control")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rollen & Berechtigungen</h1>
            <p className="text-muted-foreground text-sm">Zentrale Übersicht über alle Nutzerrechte und Freigaben</p>
          </div>
        </div>

        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="comparison">Übersicht</TabsTrigger>
            <TabsTrigger value="users">Nutzer</TabsTrigger>
            <TabsTrigger value="grants">Freigaben</TabsTrigger>
            <TabsTrigger value="matrices">Matrizen</TabsTrigger>
          </TabsList>

          {/* Tab 1: Comparison Table */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Berechtigungstabelle
                </CardTitle>
                <CardDescription>Vollständige Übersicht aller Rollen und deren Rechte</CardDescription>
              </CardHeader>
              <CardContent>
                <RoleComparisonTable />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Aktive Nutzer */}
          <TabsContent value="users" className="space-y-4">
            {/* Role Counts */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { role: "provider", label: "Provider", icon: "🔧" },
                { role: "client", label: "Pferdebesitzer", icon: "🐴" },
                { role: "partner", label: "Partner", icon: "🤝" },
                { role: "employee", label: "Mitarbeiter", icon: "👷" },
                { role: "admin", label: "Admins", icon: "👑" },
              ].map((r) => (
                <Card key={r.role} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setRoleFilter(r.role)}>
                  <CardContent className="p-4 text-center">
                    <span className="text-2xl">{r.icon}</span>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {countsLoading ? "—" : (roleCounts?.[r.role] || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Nutzerliste
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Suchen..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9 w-48" />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Rollen</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="client">Besitzer</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="employee">Mitarbeiter</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Registriert</TableHead>
                        <TableHead>Letzter Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.slice(0, 50).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ROLE_BADGES[u.role] || ""}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(u.created_at), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "dd.MM.yyyy HH:mm", { locale: de }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Freigaben */}
          <TabsContent value="grants">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" /> Aktive Freigaben
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Suchen..." value={grantSearch} onChange={(e) => setGrantSearch(e.target.value)} className="pl-9 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {grantsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktiv</TableHead>
                        <TableHead>Seit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrants.slice(0, 100).map((g) => {
                        const ageMs = Date.now() - new Date(g.granted_at).getTime();
                        const isOld = ageMs > 365 * 24 * 60 * 60 * 1000;
                        return (
                          <TableRow key={g.id} className={isOld ? "bg-orange-500/5" : ""}>
                            <TableCell className="font-medium">{g.provider_name}</TableCell>
                            <TableCell>{g.client_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={g.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}>
                                {g.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{g.is_active ? "✅" : "❌"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(g.granted_at), "dd.MM.yyyy", { locale: de })}
                              {isOld && <Badge variant="outline" className="ml-2 bg-orange-500/20 text-orange-400 text-[10px]">{'> 1 Jahr'}</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Communication & Data matrices */}
          <TabsContent value="matrices" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <CommunicationMatrix />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <DataAccessMatrix />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
