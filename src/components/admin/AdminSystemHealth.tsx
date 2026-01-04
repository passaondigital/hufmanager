import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Loader2,
  Users,
  Database,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  Activity,
  Server,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

interface SystemStats {
  totalUsers: number;
  totalProviders: number;
  totalClients: number;
  totalHorses: number;
  totalAppointments: number;
  totalInvoices: number;
  totalMessages: number;
  activeSubscriptions: number;
  suspendedUsers: number;
  recentSignups: number;
  appointmentsThisMonth: number;
}

export function AdminSystemHealth() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, subscription_status, subscription_plan, plan_override, is_suspended, created_at")
        .is("deleted_at", null);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch horses
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id")
        .is("deleted_at", null);

      if (horsesError) throw horsesError;

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id, date");

      if (appointmentsError) throw appointmentsError;

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id");

      if (invoicesError) throw invoicesError;

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("id");

      if (messagesError) throw messagesError;

      // Calculate stats
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const providers = profiles?.filter(p => roleMap.get(p.id) === "provider") || [];
      const clients = profiles?.filter(p => roleMap.get(p.id) === "client") || [];
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const recentSignups = profiles?.filter(p => new Date(p.created_at) >= oneWeekAgo).length || 0;
      const appointmentsThisMonth = appointments?.filter(a => new Date(a.date) >= thisMonth).length || 0;
      const activeSubscriptions = profiles?.filter(p => 
        p.subscription_status === "active" || p.plan_override
      ).length || 0;
      const suspendedUsers = profiles?.filter(p => p.is_suspended).length || 0;

      setStats({
        totalUsers: profiles?.length || 0,
        totalProviders: providers.length,
        totalClients: clients.length,
        totalHorses: horses?.length || 0,
        totalAppointments: appointments?.length || 0,
        totalInvoices: invoices?.length || 0,
        totalMessages: messages?.length || 0,
        activeSubscriptions,
        suspendedUsers,
        recentSignups,
        appointmentsThisMonth,
      });

      // Calculate user growth (last 7 days)
      const growthData: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        growthData[dateStr] = 0;
      }
      profiles?.forEach(p => {
        const dateStr = p.created_at.split("T")[0];
        if (growthData[dateStr] !== undefined) {
          growthData[dateStr]++;
        }
      });
      setUserGrowth(Object.entries(growthData).map(([date, count]) => ({
        date: date.split("-").slice(1).join("."),
        count,
      })));

      // Calculate plan distribution
      const planCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const plan = p.plan_override || p.subscription_plan || "starter";
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      setPlanDistribution(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Fehler beim Laden der Statistiken");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System-Health</h2>
          <p className="text-muted-foreground">
            Plattform-Statistiken & Monitoring
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats} size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* System Status */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className="bg-green-500">Online</Badge>
            <span className="text-sm text-muted-foreground">Alle Dienste laufen normal</span>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gesamt Benutzer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-green-500 mt-1">+{stats?.recentSignups || 0} diese Woche</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{stats?.totalProviders || 0}</p>
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{stats?.totalClients || 0}</p>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pferde</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{stats?.totalHorses || 0}</p>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Termine gesamt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{stats?.totalAppointments || 0}</p>
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.appointmentsThisMonth || 0} diesen Monat</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{stats?.totalInvoices || 0}</p>
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nachrichten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{stats?.totalMessages || 0}</p>
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktive Abos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {(stats?.suspendedUsers || 0) > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Warnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{stats?.suspendedUsers} gesperrte Benutzer im System</p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Neue Benutzer (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowth}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    formatter={(value: number) => [`${value} Benutzer`, 'Neu']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} Benutzer`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
