import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  MousePointer,
  ShoppingCart,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
  Zap,
  Sparkles,
  Crown,
  BarChart3,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow, subDays, subHours } from "date-fns";
import { de } from "date-fns/locale";

interface ActivityLog {
  id: string;
  user_email: string;
  activity_type: string;
  page_path: string | null;
  action_name: string | null;
  copecart_plan: string | null;
  copecart_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DemoStats {
  totalPageViews: number;
  totalActions: number;
  totalCopecartClicks: number;
  clicksByPlan: Record<string, number>;
  topPages: { path: string; count: number }[];
  recentActivity: ActivityLog[];
  activityByHour: { hour: string; count: number }[];
  lastActive: string | null;
}

const PLAN_CONFIG = {
  starter: { label: "Anfänger", icon: Zap, color: "text-blue-500" },
  advanced: { label: "Fortgeschritten", icon: Sparkles, color: "text-primary" },
  pro: { label: "Profi", icon: Crown, color: "text-yellow-500" },
};

export function DemoAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");

  const getTimeRangeFilter = () => {
    switch (timeRange) {
      case "24h":
        return subHours(new Date(), 24).toISOString();
      case "7d":
        return subDays(new Date(), 7).toISOString();
      case "30d":
        return subDays(new Date(), 30).toISOString();
      default:
        return null;
    }
  };

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DemoStats>({
    queryKey: ["demo-analytics", timeRange],
    queryFn: async () => {
      const timeFilter = getTimeRangeFilter();
      
      let query = supabase
        .from("demo_activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (timeFilter) {
        query = query.gte("created_at", timeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const logs = (data || []) as ActivityLog[];

      // Calculate stats
      const totalPageViews = logs.filter(l => l.activity_type === "page_view").length;
      const totalActions = logs.filter(l => l.activity_type === "action").length;
      const copecartClicks = logs.filter(l => l.activity_type === "copecart_click");
      const totalCopecartClicks = copecartClicks.length;

      // Clicks by plan
      const clicksByPlan: Record<string, number> = {};
      copecartClicks.forEach(click => {
        const plan = click.copecart_plan || "unknown";
        clicksByPlan[plan] = (clicksByPlan[plan] || 0) + 1;
      });

      // Top pages
      const pageCounts: Record<string, number> = {};
      logs.filter(l => l.page_path).forEach(log => {
        const path = log.page_path!;
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Activity by hour (last 24 hours)
      const hourCounts: Record<string, number> = {};
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourKey = format(hour, "HH:00");
        hourCounts[hourKey] = 0;
      }
      logs.forEach(log => {
        const logDate = new Date(log.created_at);
        if (now.getTime() - logDate.getTime() <= 24 * 60 * 60 * 1000) {
          const hourKey = format(logDate, "HH:00");
          hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
        }
      });
      const activityByHour = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour, count }))
        .reverse();

      // Recent activity (last 20)
      const recentActivity = logs.slice(0, 20);

      // Last active
      const lastActive = logs.length > 0 ? logs[0].created_at : null;

      return {
        totalPageViews,
        totalActions,
        totalCopecartClicks,
        clicksByPlan,
        topPages,
        recentActivity,
        activityByHour,
        lastActive,
      };
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "page_view":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "action":
        return <MousePointer className="h-4 w-4 text-green-500" />;
      case "copecart_click":
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (log: ActivityLog) => {
    switch (log.activity_type) {
      case "page_view":
        return `Seite besucht: ${log.page_path}`;
      case "action":
        return `Aktion: ${log.action_name || "Unbekannt"}`;
      case "copecart_click":
        const planConfig = PLAN_CONFIG[log.copecart_plan as keyof typeof PLAN_CONFIG];
        return `CopeCart geklickt: ${planConfig?.label || log.copecart_plan}`;
      default:
        return log.activity_type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Demo-Account Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Tracking für hufbearbeiter.hufmanager@gmail.com
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <TabsList className="h-9">
              <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">7 Tage</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">30 Tage</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">Alle</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Last Active Status */}
      {stats?.lastActive && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Zuletzt aktiv:</span>
          <Badge variant="secondary">
            {formatDistanceToNow(new Date(stats.lastActive), { addSuffix: true, locale: de })}
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seitenaufrufe</p>
                <p className="text-3xl font-bold">{stats?.totalPageViews || 0}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktionen</p>
                <p className="text-3xl font-bold">{stats?.totalActions || 0}</p>
              </div>
              <MousePointer className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CopeCart Klicks</p>
                <p className="text-3xl font-bold text-primary">{stats?.totalCopecartClicks || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold">
                  {stats?.totalPageViews
                    ? ((stats.totalCopecartClicks / stats.totalPageViews) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CopeCart Clicks by Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CopeCart Klicks nach Paket</CardTitle>
          <CardDescription>Welche Pakete wurden am häufigsten angeklickt?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["starter", "advanced", "pro"] as const).map((plan) => {
              const config = PLAN_CONFIG[plan];
              const Icon = config.icon;
              const count = stats?.clicksByPlan[plan] || 0;

              return (
                <div
                  key={plan}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className={`p-3 rounded-full bg-muted ${config.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{config.label}</p>
                    <p className="text-2xl font-bold">{count} Klicks</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Seiten</CardTitle>
            <CardDescription>Meist besuchte Seiten im Demo-Account</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {stats?.topPages.map((page, index) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <code className="text-sm">{page.path}</code>
                    </div>
                    <Badge variant="secondary">{page.count}</Badge>
                  </div>
                ))}
                {(!stats?.topPages || stats.topPages.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Noch keine Daten vorhanden
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Letzte Aktivitäten</CardTitle>
            <CardDescription>Was hat der Demo-Nutzer zuletzt gemacht?</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {stats?.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    {getActivityIcon(log.activity_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{getActivityLabel(log)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Noch keine Aktivitäten vorhanden
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Full Activity Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitäts-Log (Detail)</CardTitle>
          <CardDescription>Vollständige Aufzeichnung aller Demo-Account Aktivitäten</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Seite</TableHead>
                  <TableHead>Zeitpunkt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentActivity.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActivityIcon(log.activity_type)}
                        <Badge variant="outline" className="text-xs">
                          {log.activity_type === "page_view" && "Seitenaufruf"}
                          {log.activity_type === "action" && "Aktion"}
                          {log.activity_type === "copecart_click" && "CopeCart"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.activity_type === "copecart_click" && (
                        <Badge className="bg-primary/20 text-primary">
                          {PLAN_CONFIG[log.copecart_plan as keyof typeof PLAN_CONFIG]?.label || log.copecart_plan}
                        </Badge>
                      )}
                      {log.activity_type === "action" && (
                        <span className="text-sm">{log.action_name}</span>
                      )}
                      {log.activity_type === "page_view" && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.page_path || "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd.MM. HH:mm", { locale: de })}
                    </TableCell>
                  </TableRow>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Noch keine Aktivitäten aufgezeichnet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
