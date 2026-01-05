import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  FileText,
  MessageSquare,
  Map,
  GraduationCap,
  ClipboardList,
  Users,
  BarChart3,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ProviderFeatureData {
  id: string;
  email: string | null;
  full_name: string | null;
  readable_id: string | null;
  feature_flags: {
    module_invoicing?: boolean;
    module_chat?: boolean;
    module_maps?: boolean;
    module_academy?: boolean;
    module_hufanalyse?: boolean;
    module_network?: boolean;
    module_analytics?: boolean;
    beta_features?: boolean;
  } | null;
  // Usage stats
  invoice_count: number;
  last_invoice_date: string | null;
  message_count: number;
  last_message_date: string | null;
  analysis_count: number;
  last_analysis_date: string | null;
  connection_count: number;
  last_connection_date: string | null;
}

interface ModuleStats {
  module: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabledCount: number;
  totalCount: number;
  usageCount: number;
  lastUsed: string | null;
}

const MODULE_CONFIG = [
  { key: "module_invoicing", label: "Rechnungen", icon: FileText },
  { key: "module_chat", label: "Chat", icon: MessageSquare },
  { key: "module_maps", label: "Anfahrt / Maps", icon: Map },
  { key: "module_academy", label: "Academy", icon: GraduationCap },
  { key: "module_hufanalyse", label: "Hufanalyse (LTZ)", icon: ClipboardList },
  { key: "module_network", label: "Netzwerk", icon: Users },
  { key: "module_analytics", label: "Analytics", icon: BarChart3 },
  { key: "beta_features", label: "Beta Features", icon: Sparkles },
];

export default function FeatureUsageOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderFeatureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth?redirect=/admin/feature-usage");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin access:", error);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all provider IDs
      const { data: providerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");

      if (rolesError) throw rolesError;

      const providerIds = providerRoles?.map(r => r.user_id) || [];

      if (providerIds.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Fetch profiles with feature flags
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, readable_id, feature_flags")
        .in("id", providerIds)
        .is("deleted_at", null);

      if (profilesError) throw profilesError;

      // Fetch invoice counts
      const { data: invoices } = await supabase
        .from("invoices")
        .select("provider_id, created_at")
        .in("provider_id", providerIds)
        .order("created_at", { ascending: false });

      // Fetch message counts
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_id, created_at")
        .in("sender_id", providerIds)
        .order("created_at", { ascending: false });

      // Fetch hoof analysis counts
      const { data: analyses } = await supabase
        .from("hoof_analyses")
        .select("provider_id, created_at")
        .in("provider_id", providerIds)
        .order("created_at", { ascending: false });

      // Fetch connection counts
      const { data: connections } = await supabase
        .from("access_grants")
        .select("provider_id, granted_at")
        .in("provider_id", providerIds)
        .eq("is_active", true)
        .order("granted_at", { ascending: false });

      // Build usage maps
      const invoiceMap = new globalThis.Map<string, { count: number; lastDate: string | null }>();
      invoices?.forEach(inv => {
        if (!inv.provider_id) return;
        const existing = invoiceMap.get(inv.provider_id);
        if (!existing) {
          invoiceMap.set(inv.provider_id, { count: 1, lastDate: inv.created_at });
        } else {
          invoiceMap.set(inv.provider_id, { count: existing.count + 1, lastDate: existing.lastDate });
        }
      });

      const messageMap = new globalThis.Map<string, { count: number; lastDate: string | null }>();
      messages?.forEach(msg => {
        const existing = messageMap.get(msg.sender_id);
        if (!existing) {
          messageMap.set(msg.sender_id, { count: 1, lastDate: msg.created_at });
        } else {
          messageMap.set(msg.sender_id, { count: existing.count + 1, lastDate: existing.lastDate });
        }
      });

      const analysisMap = new globalThis.Map<string, { count: number; lastDate: string | null }>();
      analyses?.forEach(ana => {
        const existing = analysisMap.get(ana.provider_id);
        if (!existing) {
          analysisMap.set(ana.provider_id, { count: 1, lastDate: ana.created_at });
        } else {
          analysisMap.set(ana.provider_id, { count: existing.count + 1, lastDate: existing.lastDate });
        }
      });

      const connectionMap = new globalThis.Map<string, { count: number; lastDate: string | null }>();
      connections?.forEach(conn => {
        const existing = connectionMap.get(conn.provider_id);
        if (!existing) {
          connectionMap.set(conn.provider_id, { count: 1, lastDate: conn.granted_at });
        } else {
          connectionMap.set(conn.provider_id, { count: existing.count + 1, lastDate: existing.lastDate });
        }
      });

      // Merge data
      const providersWithUsage: ProviderFeatureData[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        readable_id: profile.readable_id,
        feature_flags: profile.feature_flags as ProviderFeatureData["feature_flags"],
        invoice_count: invoiceMap.get(profile.id)?.count || 0,
        last_invoice_date: invoiceMap.get(profile.id)?.lastDate || null,
        message_count: messageMap.get(profile.id)?.count || 0,
        last_message_date: messageMap.get(profile.id)?.lastDate || null,
        analysis_count: analysisMap.get(profile.id)?.count || 0,
        last_analysis_date: analysisMap.get(profile.id)?.lastDate || null,
        connection_count: connectionMap.get(profile.id)?.count || 0,
        last_connection_date: connectionMap.get(profile.id)?.lastDate || null,
      }));

      setProviders(providersWithUsage);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.email?.toLowerCase().includes(search) ||
      p.full_name?.toLowerCase().includes(search) ||
      p.readable_id?.toLowerCase().includes(search)
    );
  });

  const getModuleStats = (): ModuleStats[] => {
    return MODULE_CONFIG.map(config => {
      const enabledCount = providers.filter(p => 
        p.feature_flags?.[config.key as keyof typeof p.feature_flags] === true
      ).length;

      let usageCount = 0;
      let lastUsed: string | null = null;

      if (config.key === "module_invoicing") {
        usageCount = providers.reduce((sum, p) => sum + p.invoice_count, 0);
        const dates = providers.map(p => p.last_invoice_date).filter(Boolean).sort().reverse();
        lastUsed = dates[0] || null;
      } else if (config.key === "module_chat") {
        usageCount = providers.reduce((sum, p) => sum + p.message_count, 0);
        const dates = providers.map(p => p.last_message_date).filter(Boolean).sort().reverse();
        lastUsed = dates[0] || null;
      } else if (config.key === "module_hufanalyse") {
        usageCount = providers.reduce((sum, p) => sum + p.analysis_count, 0);
        const dates = providers.map(p => p.last_analysis_date).filter(Boolean).sort().reverse();
        lastUsed = dates[0] || null;
      } else if (config.key === "module_network") {
        usageCount = providers.reduce((sum, p) => sum + p.connection_count, 0);
        const dates = providers.map(p => p.last_connection_date).filter(Boolean).sort().reverse();
        lastUsed = dates[0] || null;
      }

      return {
        module: config.key,
        label: config.label,
        icon: config.icon,
        enabledCount,
        totalCount: providers.length,
        usageCount,
        lastUsed,
      };
    });
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Zugriff verweigert</h1>
        <p className="text-muted-foreground">Du hast keine Berechtigung, diese Seite zu sehen.</p>
        <Button onClick={() => navigate("/")}>Zurück zum Dashboard</Button>
      </div>
    );
  }

  const moduleStats = getModuleStats();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mission-control")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Feature-Flags Übersicht</h1>
              <p className="text-muted-foreground">
                Modul-Aktivierung und Nutzungsstatistiken
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchData} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="providers">Provider-Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {moduleStats.map(stat => (
                <Card key={stat.module}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold">{stat.enabledCount}/{stat.totalCount}</span>
                      <Badge variant={stat.enabledCount > stat.totalCount / 2 ? "default" : "secondary"}>
                        {Math.round((stat.enabledCount / stat.totalCount) * 100) || 0}%
                      </Badge>
                    </div>
                    <Progress 
                      value={(stat.enabledCount / stat.totalCount) * 100} 
                      className="h-2 mb-2"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      {stat.usageCount > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{stat.usageCount} Nutzungen</span>
                        </div>
                      )}
                      {stat.lastUsed && (
                        <div>
                          Zuletzt: {format(new Date(stat.lastUsed), "dd.MM.yyyy HH:mm", { locale: de })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Modul-Aktivierung Summary</CardTitle>
                <CardDescription>
                  Zeigt wie viele Provider welche Module aktiviert haben
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moduleStats.map(stat => (
                    <div key={stat.module} className="flex items-center gap-4">
                      <stat.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{stat.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {stat.enabledCount} von {stat.totalCount}
                          </span>
                        </div>
                        <Progress 
                          value={(stat.enabledCount / stat.totalCount) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, E-Mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-center">Rechnungen</TableHead>
                        <TableHead className="text-center">Chat</TableHead>
                        <TableHead className="text-center">Maps</TableHead>
                        <TableHead className="text-center">Academy</TableHead>
                        <TableHead className="text-center">Hufanalyse</TableHead>
                        <TableHead className="text-center">Netzwerk</TableHead>
                        <TableHead className="text-center">Analytics</TableHead>
                        <TableHead className="text-center">Beta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProviders.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{provider.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{provider.readable_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_invoicing ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {provider.invoice_count > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {provider.invoice_count}x
                                  </span>
                                )}
                              </div>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_chat ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {provider.message_count > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {provider.message_count}x
                                  </span>
                                )}
                              </div>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_maps ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_academy ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_hufanalyse ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {provider.analysis_count > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {provider.analysis_count}x
                                  </span>
                                )}
                              </div>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_network ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {provider.connection_count > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {provider.connection_count}x
                                  </span>
                                )}
                              </div>
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.module_analytics ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {provider.feature_flags?.beta_features ? (
                              <CheckCircle className="h-4 w-4 text-amber-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredProviders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Keine Provider gefunden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}