import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, Smartphone, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Statistiken() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["public-statistics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_statistics")
        .select("id, period, data, horse_count, provider_count, generated_at, is_published")
        .eq("is_published", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const hasData = stats && (stats.horse_count || 0) >= 500;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <BarChart3 className="inline h-8 w-8 mr-2 text-primary" />
            Hufi Branchen-Report
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live-Daten aus dem Netzwerk – anonymisiert und aggregiert. Ein Blick auf die Hufbearbeitungs-Branche im DACH-Raum.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : !hasData ? (
          /* Threshold not met */
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Statistiken werden aufgebaut</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sobald genügend Pferdeakten im Netzwerk aktiv sind, veröffentlichen wir hier anonymisierte Branchen-Statistiken.
              </p>
              <p className="text-xs text-muted-foreground">
                Aktuell: {stats?.horse_count || 0} Pferde · {stats?.provider_count || 0} Dienstleister
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Smartphone className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">{stats.horse_count?.toLocaleString("de-DE")}</p>
                  <p className="text-sm text-muted-foreground">Pferde im Netzwerk</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">{stats.provider_count?.toLocaleString("de-DE")}</p>
                  <p className="text-sm text-muted-foreground">Dienstleister</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">
                    {typeof (stats.data as any)?.treatment_count === "number"
                      ? (stats.data as any).treatment_count.toLocaleString("de-DE")
                      : "–"}
                  </p>
                  <p className="text-sm text-muted-foreground">Behandlungen dokumentiert</p>
                </CardContent>
              </Card>
            </div>

            {(stats.horse_count || 0) < 2000 && (
              <p className="text-xs text-center text-muted-foreground">
                Beta-Daten – Das Netzwerk wächst. Angaben basieren auf {stats.horse_count} Pferdeakten.
              </p>
            )}

            <Card>
              <CardHeader><CardTitle>Rassen-Verteilung</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Charts werden geladen sobald ausreichend Daten verfügbar sind.</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* CTA */}
        <div className="text-center py-8 space-y-4">
          <p className="text-sm font-medium">
            Powered by Hufi · {stats?.horse_count || 0} Pferdeakten
          </p>
          <Link to="/auth">
            <Button size="lg">Werde Teil des Netzwerks – Kostenlos registrieren</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
