import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Search, Shield, Ban, Mail, Eye, AlertTriangle, CheckCircle2, Clock, UserX } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
  avatar_url: string | null;
  account_status: string | null;
  trial_ends_at: string | null;
  last_active_at: string | null;
  phone: string | null;
}

type StatusFilter = "all" | "trial" | "active" | "expired" | "suspended";

export function AdminUserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stats, setStats] = useState({ total: 0, providers: 0, clients: 0, partners: 0, newThisWeek: 0 });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, full_name, role, created_at, avatar_url, account_status, trial_ends_at, last_active_at, phone")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error("Fehler beim Laden der Nutzer");
      console.error(error);
    } else if (data) {
      setUsers(data);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      setStats({
        total: data.length,
        providers: data.filter(u => u.role === "provider").length,
        clients: data.filter(u => u.role === "client").length,
        partners: data.filter(u => u.role === "partner").length,
        newThisWeek: data.filter(u => new Date(u.created_at) > weekAgo).length,
      });
    }
    setLoading(false);
  };

  const updateAccountStatus = async (userId: string, status: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: status })
      .eq("id", userId);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success(`Status auf "${status}" gesetzt`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: status } : u));
    }
  };

  const getProfileCompleteness = (u: UserRow): number => {
    let score = 0;
    if (u.display_name || u.full_name) score += 25;
    if (u.email) score += 25;
    if (u.avatar_url) score += 25;
    if (u.phone) score += 25;
    return score;
  };

  const getStatusBadge = (u: UserRow) => {
    const status = u.account_status || "trial";
    const completeness = getProfileCompleteness(u);
    const isSuspicious = completeness <= 25 && 
      new Date(u.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (status === "suspended") return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Gesperrt</Badge>;
    if (isSuspicious) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Verdächtig</Badge>;
    if (status === "active") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Aktiv</Badge>;
    if (status === "expired") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Abgelaufen</Badge>;
    
    // Trial
    const trialEnds = u.trial_ends_at ? new Date(u.trial_ends_at) : null;
    const daysLeft = trialEnds ? Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Trial {daysLeft != null && daysLeft > 0 ? `(${daysLeft}T)` : ""}
      </Badge>
    );
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || 
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || u.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Gesamt</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.providers}</p><p className="text-xs text-muted-foreground">Provider</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.clients}</p><p className="text-xs text-muted-foreground">Kunden</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.partners}</p><p className="text-xs text-muted-foreground">Partner</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{stats.newThisWeek}</p><p className="text-xs text-muted-foreground">Neu (7T)</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name oder E-Mail suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "trial", "active", "expired", "suspended"] as StatusFilter[]).map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s === "all" ? "Alle" : s === "trial" ? "Trial" : s === "active" ? "Aktiv" : s === "expired" ? "Abgelaufen" : "Gesperrt"}
            </Button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.map(u => {
          const completeness = getProfileCompleteness(u);
          return (
            <Card key={u.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {u.display_name || u.full_name || "Kein Name"}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">{u.role || "?"}</Badge>
                        {getStatusBadge(u)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email || "Keine E-Mail"}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Registriert: {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: de })}</span>
                        <span>Profil: {completeness}%</span>
                        {u.last_active_at && (
                          <span>Aktiv: {formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true, locale: de })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {u.account_status !== "suspended" ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => updateAccountStatus(u.id, "suspended")}>
                        <Ban className="h-3 w-3 mr-1" />Sperren
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateAccountStatus(u.id, "active")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Entsperren
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Keine Nutzer gefunden.</p>
        )}
      </div>
    </div>
  );
}
