import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Search, RefreshCw, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Registration {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: string | null;
  has_logged_in: boolean | null;
  readable_id: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  provider: { label: "Hufbearbeiter", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  client: { label: "Pferdebesitzer", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  partner: { label: "Fachpartner", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  employee: { label: "Mitarbeiter", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  admin: { label: "Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, thisWeek: 0, today: 0 });

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      // Get profiles with their roles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, has_logged_in, readable_id, role")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Get roles for all users
      const userIds = (profiles || []).map(p => p.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string>();
      (roles || []).forEach(r => {
        // Prefer non-client roles for display
        const existing = roleMap.get(r.user_id);
        if (!existing || (existing === "client" && r.role !== "client")) {
          roleMap.set(r.user_id, r.role);
        }
      });

      const regs: Registration[] = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.id) || p.role || null,
      }));

      setRegistrations(regs);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      setStats({
        total: regs.length,
        thisMonth: regs.filter(r => new Date(r.created_at) >= startOfMonth).length,
        thisWeek: regs.filter(r => new Date(r.created_at) >= startOfWeek).length,
        today: regs.filter(r => new Date(r.created_at) >= startOfDay).length,
      });
    } catch (err) {
      console.error("Error loading registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = registrations.filter(r => {
    const matchesSearch = !search || 
      r.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.readable_id?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || r.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" />
            Registrierungen
          </h2>
          <p className="text-sm text-muted-foreground">Alle Nutzer-Registrierungen mit Rolle und Zeitpunkt</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRegistrations} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: stats.total, icon: Users },
          { label: "Diesen Monat", value: stats.thisMonth, icon: UserPlus },
          { label: "Diese Woche", value: stats.thisWeek, icon: UserPlus },
          { label: "Heute", value: stats.today, icon: UserPlus },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Name, E-Mail oder ID suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Rollen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rollen</SelectItem>
            <SelectItem value="provider">Hufbearbeiter</SelectItem>
            <SelectItem value="client">Pferdebesitzer</SelectItem>
            <SelectItem value="partner">Fachpartner</SelectItem>
            <SelectItem value="employee">Mitarbeiter</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Keine Registrierungen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((reg) => {
                    const roleConfig = reg.role ? ROLE_CONFIG[reg.role] : null;
                    return (
                      <TableRow key={reg.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(reg.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                        </TableCell>
                        <TableCell className="font-medium">{reg.full_name || "–"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{reg.email || "–"}</TableCell>
                        <TableCell>
                          {roleConfig ? (
                            <Badge variant="outline" className={roleConfig.color}>
                              {roleConfig.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Keine Rolle
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {reg.readable_id || "–"}
                        </TableCell>
                        <TableCell>
                          {reg.has_logged_in ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                              Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                              Nie eingeloggt
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} von {registrations.length} Registrierungen angezeigt
      </p>
    </div>
  );
}
