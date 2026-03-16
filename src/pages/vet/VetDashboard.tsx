import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope, Syringe, Pill, FileText, Users, Settings,
  ArrowRight, RefreshCw, Upload, Calculator, Search, Link2
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { VetImpfDashboard } from "@/components/vet/VetImpfDashboard";

export default function VetDashboard() {
  const { user, loading: authLoading } = useAuth();

  // My horses (via partner access)
  const { data: myHorses, isLoading: horsesLoading } = useQuery({
    queryKey: ["vet-my-horses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses!horse_partner_access_horse_id_fkey(id, name, breed, photo_url, owner_id)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("can_view_medical", true)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  // Pending vaccinations
  const { data: overdueVacc } = useQuery({
    queryKey: ["vet-overdue-vacc", user?.id],
    queryFn: async () => {
      const horseIds = myHorses?.map((h: any) => h.horse_id) || [];
      if (!horseIds.length) return 0;
      const { count } = await supabase
        .from("horse_vaccinations")
        .select("id", { count: "exact", head: true })
        .in("horse_id", horseIds)
        .lt("next_due_date", new Date().toISOString());
      return count || 0;
    },
    enabled: !!myHorses?.length,
  });

  // Sync connections
  const { data: syncConns } = useQuery({
    queryKey: ["vet-sync-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vet_sync_connections")
        .select("id, provider_type, status, last_sync_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const connectedPMS = syncConns?.filter((c: any) => c.status === "connected") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Tierarzt-Portal</h1>
              <p className="text-xs text-muted-foreground">Ihre Pferde-Patienten im Überblick</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/vet/got-rechner">
              <Button variant="outline" size="sm">
                <Calculator className="h-4 w-4 mr-1" /> GOT-Rechner
              </Button>
            </Link>
            <Link to="/vet/pms-connect">
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-1" /> Software verbinden
              </Button>
            </Link>
            <Link to="/vet/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Meine Patienten"
            value={myHorses?.length ?? 0}
            icon={Users}
            loading={horsesLoading}
          />
          <StatCard
            title="Überfällige Impfungen"
            value={overdueVacc ?? 0}
            icon={Syringe}
            variant={overdueVacc && overdueVacc > 0 ? "warning" : "default"}
          />
          <StatCard
            title="PMS-Verbindungen"
            value={connectedPMS.length}
            icon={RefreshCw}
          />
          <StatCard
            title="Befunde (Monat)"
            value="–"
            icon={FileText}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/vet/soap">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">SOAP-Befund eintragen</p>
                  <p className="text-xs text-muted-foreground">Strukturierter Untersuchungsbefund</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/vet/impfungen">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Syringe className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Impf-Management</p>
                  <p className="text-xs text-muted-foreground">Impfstatus & überfällige Impfungen</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/vet/csv-import">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">CSV-Import</p>
                  <p className="text-xs text-muted-foreground">Befunde aus Praxissoftware importieren</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Horse Patient List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Meine Pferde-Patienten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {horsesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : !myHorses?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Pferde-Patienten.</p>
                <p className="text-xs mt-1">Pferdebesitzer müssen dir Zugriff auf ihre Pferdeakte geben.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myHorses.map((access: any) => {
                  const horse = access.horses;
                  if (!horse) return null;
                  return (
                    <Link
                      key={access.horse_id}
                      to={`/vet/horse/${access.horse_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {horse.photo_url ? (
                        <img src={horse.photo_url} alt={horse.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                          {horse.name?.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{horse.name}</p>
                        <p className="text-xs text-muted-foreground">{horse.breed || "Unbekannt"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PMS Sync Status */}
        {syncConns && syncConns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                PMS-Synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncConns.map((conn: any) => (
                  <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge variant={conn.status === "connected" ? "default" : "secondary"}>
                        {conn.provider_type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {conn.status === "connected" ? "Verbunden" : conn.status === "error" ? "Fehler" : "Ausstehend"}
                      </span>
                    </div>
                    {conn.last_sync_at && (
                      <span className="text-xs text-muted-foreground">
                        Letzter Sync: {new Date(conn.last_sync_at).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading, variant }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
  variant?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          variant === "warning" ? "bg-destructive/10" : "bg-primary/10"
        }`}>
          <Icon className={`h-5 w-5 ${variant === "warning" ? "text-destructive" : "text-primary"}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <p className="text-xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
