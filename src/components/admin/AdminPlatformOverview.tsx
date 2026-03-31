import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { isDemoEmail } from "@/lib/demo-accounts";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Users, Search, RefreshCw, Mail, Phone, Building2, Globe, MapPin,
  Link2, TrendingUp, UserPlus, Crown, Ban, CheckCircle, Clock, Shield,
  Loader2, Eye, MessageSquare, BarChart3, Briefcase,
} from "lucide-react";
import { AdminActivityFeed } from "./AdminActivityFeed";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, AreaChart, Area,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────
interface UserRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  city: string | null;
  zip_code: string | null;
  readable_id: string | null;
  is_suspended: boolean | null;
  plan_override: string | null;
  subscription_status: string | null;
  access_valid_until: string | null;
  roles: string[];
  horse_count: number;
  client_count: number;
  connection_count: number;
  business_name?: string | null;
  org_type?: string | null;
}

interface PlatformStats {
  totalUsers: number;
  providers: number;
  clients: number;
  partners: number;
  employees: number;
  admins: number;
  organizations: number;
  totalHorses: number;
  totalConnections: number;
  pendingConnections: number;
  clientConnections: number;
  stallAccess: number;
  registrationsPerMonth: { month: string; count: number }[];
  roleDistribution: { name: string; value: number }[];
  orgsByType: { name: string; value: number }[];
  growthTrend: { month: string; providers: number; clients: number }[];
}

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))',
];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

// ── KPI Tile ─────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent = "default" }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; accent?: "green" | "blue" | "amber" | "red" | "default";
}) {
  const accentMap = {
    green: "from-green-500/10 to-green-500/5 border-green-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    red: "from-red-500/10 to-red-500/5 border-red-500/20",
    default: "from-muted/50 to-muted/20 border-border",
  };
  const iconMap = {
    green: "text-green-500", blue: "text-blue-500", amber: "text-amber-500",
    red: "text-red-500", default: "text-muted-foreground",
  };
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-3.5 transition-all hover:shadow-md", accentMap[accent])}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-1.5 rounded-lg bg-background/80", iconMap[accent])}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export function AdminPlatformOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Parallel data fetch
      const [
        rolesRes, profilesRes, horsesRes, grantsRes, clientConRes,
        stallRes, orgsRes, bsRes,
      ] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, email, full_name, phone, created_at, city, zip_code, readable_id, is_suspended, plan_override, subscription_status, access_valid_until").is("deleted_at", null),
        supabase.from("horses").select("id, owner_id", { count: "exact" }).is("deleted_at", null),
        supabase.from("access_grants").select("provider_id, client_id, is_active, status"),
        supabase.from("client_connections").select("id, requester_id, target_id, status"),
        supabase.from("stall_horse_access").select("id"),
        supabase.from("organizations").select("id, name, type, is_active, owner_id, created_at, slug"),
        supabase.from("business_settings").select("user_id, business_name"),
      ]);

      const roles = rolesRes.data || [];
      const profiles = (profilesRes.data || []).filter(p => !isDemoEmail(p.email));
      const horses = horsesRes.data || [];
      const grants = grantsRes.data || [];
      const clientCons = clientConRes.data || [];
      const stallAccessCount = stallRes.data?.length || 0;
      const orgs = orgsRes.data || [];
      const bsMap = new Map((bsRes.data || []).map(b => [b.user_id, b.business_name]));

      // Role map
      const roleMap = new Map<string, string[]>();
      roles.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      // Horse count by owner
      const horsesByOwner = new Map<string, number>();
      horses.forEach(h => {
        if (h.owner_id) horsesByOwner.set(h.owner_id, (horsesByOwner.get(h.owner_id) || 0) + 1);
      });

      // Client count by provider (from grants)
      const clientsByProvider = new Map<string, Set<string>>();
      grants.forEach(g => {
        if (g.is_active) {
          if (!clientsByProvider.has(g.provider_id)) clientsByProvider.set(g.provider_id, new Set());
          clientsByProvider.get(g.provider_id)!.add(g.client_id);
        }
      });

      // Connection count per user
      const connectionMap = new Map<string, number>();
      grants.filter(g => g.is_active).forEach(g => {
        connectionMap.set(g.provider_id, (connectionMap.get(g.provider_id) || 0) + 1);
        connectionMap.set(g.client_id, (connectionMap.get(g.client_id) || 0) + 1);
      });
      clientCons.filter(c => c.status === "accepted").forEach(c => {
        connectionMap.set(c.requester_id, (connectionMap.get(c.requester_id) || 0) + 1);
        connectionMap.set(c.target_id, (connectionMap.get(c.target_id) || 0) + 1);
      });

      // Build user records
      const userRecords: UserRecord[] = profiles.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        city: p.city,
        zip_code: p.zip_code,
        readable_id: p.readable_id,
        is_suspended: p.is_suspended,
        plan_override: p.plan_override,
        subscription_status: p.subscription_status,
        access_valid_until: p.access_valid_until,
        roles: roleMap.get(p.id) || [],
        horse_count: horsesByOwner.get(p.id) || 0,
        client_count: clientsByProvider.get(p.id)?.size || 0,
        connection_count: connectionMap.get(p.id) || 0,
        business_name: bsMap.get(p.id) || null,
      }));

      // Role counts
      const providerCount = userRecords.filter(u => u.roles.includes("provider")).length;
      const clientCount = userRecords.filter(u => u.roles.includes("client")).length;
      const partnerCount = userRecords.filter(u => u.roles.includes("partner")).length;
      const employeeCount = userRecords.filter(u => u.roles.includes("employee")).length;
      const adminCount = userRecords.filter(u => u.roles.includes("admin")).length;

      // Registrations per month (last 12 months)
      const monthCounts: Record<string, number> = {};
      const providerMonthCounts: Record<string, number> = {};
      const clientMonthCounts: Record<string, number> = {};
      userRecords.forEach(u => {
        const m = u.created_at.substring(0, 7); // YYYY-MM
        monthCounts[m] = (monthCounts[m] || 0) + 1;
        if (u.roles.includes("provider")) providerMonthCounts[m] = (providerMonthCounts[m] || 0) + 1;
        if (u.roles.includes("client")) clientMonthCounts[m] = (clientMonthCounts[m] || 0) + 1;
      });

      const last12 = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return format(d, "yyyy-MM");
      });

      const registrationsPerMonth = last12.map(m => ({
        month: format(new Date(m + "-01"), "MMM yy", { locale: de }),
        count: monthCounts[m] || 0,
      }));

      const growthTrend = last12.map(m => ({
        month: format(new Date(m + "-01"), "MMM yy", { locale: de }),
        providers: providerMonthCounts[m] || 0,
        clients: clientMonthCounts[m] || 0,
      }));

      // Role distribution
      const roleDistribution = [
        { name: "Provider", value: providerCount },
        { name: "Kunden", value: clientCount },
        { name: "Partner", value: partnerCount },
        { name: "Mitarbeiter", value: employeeCount },
        { name: "Admins", value: adminCount },
      ].filter(r => r.value > 0);

      // Orgs by type
      const orgTypeCounts: Record<string, number> = {};
      orgs.forEach(o => {
        const t = o.type || "sonstige";
        orgTypeCounts[t] = (orgTypeCounts[t] || 0) + 1;
      });
      const orgsByType = Object.entries(orgTypeCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      const activeGrants = grants.filter(g => g.is_active && g.status === "active").length;
      const pendingGrants = grants.filter(g => g.status === "pending").length;
      const activeClientCons = clientCons.filter(c => c.status === "accepted").length;

      setStats({
        totalUsers: userRecords.length,
        providers: providerCount,
        clients: clientCount,
        partners: partnerCount,
        employees: employeeCount,
        admins: adminCount,
        organizations: orgs.length,
        totalHorses: horsesRes.count || horses.length,
        totalConnections: activeGrants,
        pendingConnections: pendingGrants,
        clientConnections: activeClientCons,
        stallAccess: stallAccessCount,
        registrationsPerMonth,
        roleDistribution,
        orgsByType,
        growthTrend,
      });
      setUsers(userRecords);
    } catch (err) {
      console.error("Platform overview error:", err);
      toast.error("Fehler beim Laden der Plattform-Daten");
    } finally {
      setLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) ||
      u.readable_id?.toLowerCase().includes(s) || u.city?.toLowerCase().includes(s) ||
      u.zip_code?.includes(s) || u.business_name?.toLowerCase().includes(s)
    );
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getRoleBadges = (roles: string[]) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      provider: { label: "Provider", variant: "default" },
      client: { label: "Kunde", variant: "secondary" },
      partner: { label: "Partner", variant: "outline" },
      employee: { label: "MA", variant: "outline" },
      admin: { label: "Admin", variant: "destructive" },
    };
    return roles.map(r => {
      const m = map[r] || { label: r, variant: "outline" as const };
      return <Badge key={r} variant={m.variant} className="text-[10px] px-1.5 py-0">{m.label}</Badge>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />Übersicht
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" />Alle Nutzer
          </TabsTrigger>
          <TabsTrigger value="connections" className="text-xs gap-1.5">
            <Link2 className="w-3.5 h-3.5" />Verbindungen
          </TabsTrigger>
          <TabsTrigger value="orgs" className="text-xs gap-1.5">
            <Building2 className="w-3.5 h-3.5" />Portale
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={<Users className="w-4 h-4" />} label="Gesamt-Nutzer" value={stats.totalUsers} accent="blue" />
            <KpiCard icon={<Briefcase className="w-4 h-4" />} label="Provider" value={stats.providers} accent="green" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Kunden" value={stats.clients} accent="blue" />
            <KpiCard icon={<Globe className="w-4 h-4" />} label="Partner" value={stats.partners} accent="amber" />
            <KpiCard icon={<Shield className="w-4 h-4" />} label="Mitarbeiter" value={stats.employees} accent="default" />
            <KpiCard icon={<span className="text-sm">🐴</span>} label="Pferde" value={stats.totalHorses} accent="default" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<Link2 className="w-4 h-4" />} label="Aktive Verbindungen" value={stats.totalConnections} sub={`${stats.pendingConnections} ausstehend`} accent="green" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Peer-Verbindungen" value={stats.clientConnections} sub="Kunden untereinander" accent="blue" />
            <KpiCard icon={<Building2 className="w-4 h-4" />} label="Portale / Orgs" value={stats.organizations} accent="amber" />
            <KpiCard icon={<Shield className="w-4 h-4" />} label="Stall-Zugriffe" value={stats.stallAccess} accent="default" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registrations Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Registrierungen (12 Monate)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.registrationsPerMonth} margin={{ left: 0, right: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}`, 'Registrierungen']} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.15)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rollen-Verteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.roleDistribution}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85}
                        paddingAngle={2} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {stats.roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}`, 'Nutzer']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Growth by Role */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Wachstum nach Rolle</CardTitle>
                <CardDescription className="text-xs">Neue Provider & Kunden pro Monat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.growthTrend} margin={{ left: 0, right: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={(v) => v === 'providers' ? 'Provider' : 'Kunden'} />
                      <Bar dataKey="providers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="clients" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Org Types */}
            {stats.orgsByType.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Portal-Kategorien</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.orgsByType} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}`, 'Portale']} />
                        <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── ALL USERS TAB ─── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Name, E-Mail, PID, PLZ, Ort..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Rollen</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="client">Kunden</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="employee">Mitarbeiter</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} Nutzer gefunden</p>

          <div className="rounded-lg border overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Rollen</TableHead>
                  <TableHead>Beitritt</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead className="text-right">🐴</TableHead>
                  <TableHead className="text-right">Verbind.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.slice(0, 100).map(u => (
                  <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailUser(u)}>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[180px]">{u.full_name || "—"}</p>
                        <p className="text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><div className="flex gap-1 flex-wrap">{getRoleBadges(u.roles)}</div></TableCell>
                    <TableCell className="whitespace-nowrap">{format(new Date(u.created_at), "dd.MM.yy", { locale: de })}</TableCell>
                    <TableCell>
                      {u.zip_code || u.city ? (
                        <span className="whitespace-nowrap">{u.zip_code} {u.city}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.horse_count || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.connection_count || "—"}</TableCell>
                    <TableCell>
                      {u.is_suspended ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><Ban className="w-3 h-3 mr-0.5" />Gesperrt</Badge>
                      ) : u.plan_override === "lifetime_grant" ? (
                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] px-1.5 py-0"><Crown className="w-3 h-3 mr-0.5" />Lifetime</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <CheckCircle className="w-3 h-3 mr-0.5" />Aktiv
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={(e) => { e.stopPropagation(); setDetailUser(u); }}>
                        <Eye className="w-3 h-3" />Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredUsers.length > 100 && (
            <p className="text-xs text-muted-foreground text-center">Zeige 100 von {filteredUsers.length} Nutzern. Suche verwenden um einzugrenzen.</p>
          )}
        </TabsContent>

        {/* ─── CONNECTIONS TAB ─── */}
        <TabsContent value="connections" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<Link2 className="w-4 h-4" />} label="Provider↔Kunde" value={stats.totalConnections} accent="green" />
            <KpiCard icon={<Clock className="w-4 h-4" />} label="Ausstehend" value={stats.pendingConnections} accent="amber" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Kunde↔Kunde" value={stats.clientConnections} accent="blue" />
            <KpiCard icon={<Building2 className="w-4 h-4" />} label="Stall-Zugriffe" value={stats.stallAccess} accent="default" />
          </div>

          {/* Top connected users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bestvernetzte Nutzer</CardTitle>
              <CardDescription className="text-xs">Top 20 nach Anzahl Verbindungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rollen</TableHead>
                      <TableHead className="text-right">Verbindungen</TableHead>
                      <TableHead className="text-right">Pferde</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...users].sort((a, b) => b.connection_count - a.connection_count).slice(0, 20).map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <p className="font-medium">{u.full_name || "—"}</p>
                          <p className="text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell><div className="flex gap-1 flex-wrap">{getRoleBadges(u.roles)}</div></TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{u.connection_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{u.horse_count}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setDetailUser(u)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ORGS TAB ─── */}
        <TabsContent value="orgs" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard icon={<Building2 className="w-4 h-4" />} label="Portale gesamt" value={stats.organizations} accent="blue" />
            <KpiCard icon={<Globe className="w-4 h-4" />} label="Kategorien" value={stats.orgsByType.length} accent="default" />
            <KpiCard icon={<Shield className="w-4 h-4" />} label="Stall-Zugriffe" value={stats.stallAccess} accent="default" />
          </div>

          {stats.orgsByType.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Portale nach Kategorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.orgsByType} margin={{ left: 10, right: 20, bottom: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}`, 'Portale']} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Noch keine Portale/Organisationen vorhanden.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Detail Sheet ─── */}
      <Sheet open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {detailUser?.readable_id && <code className="text-sm bg-muted px-2 py-0.5 rounded">#{detailUser.readable_id}</code>}
              {detailUser?.full_name || "Nutzer"}
            </SheetTitle>
            <SheetDescription>{detailUser?.email}</SheetDescription>
          </SheetHeader>
          {detailUser && (
            <div className="mt-6 space-y-5">
              {/* Roles */}
              <div className="flex gap-1.5 flex-wrap">{getRoleBadges(detailUser.roles)}</div>

              {/* Contact */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Kontakt</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />E-Mail</span>
                    {detailUser.email ? <a href={`mailto:${detailUser.email}`} className="text-primary hover:underline">{detailUser.email}</a> : "—"}
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Telefon</span>
                    {detailUser.phone ? <a href={`tel:${detailUser.phone}`} className="text-primary hover:underline">{detailUser.phone}</a> : "—"}
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Standort</span>
                    <span>{detailUser.zip_code} {detailUser.city || "—"}</span>
                  </div>
                  {detailUser.business_name && (
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Firma</span>
                      <span>{detailUser.business_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl font-bold">{detailUser.horse_count}</p>
                  <p className="text-[10px] text-muted-foreground">Pferde</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl font-bold">{detailUser.client_count}</p>
                  <p className="text-[10px] text-muted-foreground">Kunden</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl font-bold">{detailUser.connection_count}</p>
                  <p className="text-[10px] text-muted-foreground">Verbindungen</p>
                </div>
              </div>

              <Separator />

              {/* Membership */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Beitritt</span><span>{format(new Date(detailUser.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span>{detailUser.plan_override || detailUser.subscription_status || "—"}</span></div>
                {detailUser.access_valid_until && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zugang bis</span>
                    <span className={cn(new Date(detailUser.access_valid_until) < new Date() && "text-destructive")}>
                      {format(new Date(detailUser.access_valid_until), "dd.MM.yyyy", { locale: de })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  {detailUser.is_suspended ? (
                    <Badge variant="destructive" className="text-[10px]"><Ban className="w-3 h-3 mr-0.5" />Gesperrt</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" />Aktiv</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Kontakt aufnehmen</h4>
                <div className="grid grid-cols-2 gap-2">
                  {detailUser.email && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <a href={`mailto:${detailUser.email}`}><Mail className="w-3.5 h-3.5" />E-Mail</a>
                    </Button>
                  )}
                  {detailUser.phone && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                      <a href={`tel:${detailUser.phone}`}><Phone className="w-3.5 h-3.5" />Anrufen</a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
