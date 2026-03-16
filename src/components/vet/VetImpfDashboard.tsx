import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Syringe, AlertTriangle, CheckCircle, Bell, Calendar } from "lucide-react";

export function VetImpfDashboard() {
  const { user } = useAuth();

  const { data: horseVaccinations, isLoading } = useQuery({
    queryKey: ["vet-vaccination-overview", user?.id],
    queryFn: async () => {
      // Get horses I have access to
      const { data: accessData } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses!horse_partner_access_horse_id_fkey(id, name, breed, photo_url)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("can_view_medical", true);

      if (!accessData?.length) return [];

      const horseIds = accessData.map((a: any) => a.horse_id);

      // Get vaccinations for these horses
      const { data: vaccinations } = await supabase
        .from("horse_vaccinations")
        .select("id, horse_id, vaccine_type, vaccination_date, next_due_date, batch_number, manufacturer, administered_by")
        .in("horse_id", horseIds)
        .order("next_due_date", { ascending: true });

      // Combine
      return accessData.map((access: any) => {
        const horse = access.horses;
        const horseVaccs = vaccinations?.filter((v: any) => v.horse_id === access.horse_id) || [];
        const overdue = horseVaccs.filter((v: any) => v.next_due_date && new Date(v.next_due_date) < new Date());
        const upcoming = horseVaccs.filter((v: any) => {
          if (!v.next_due_date) return false;
          const d = new Date(v.next_due_date);
          return d >= new Date() && d <= new Date(Date.now() + 30 * 86400000);
        });

        return {
          horse,
          vaccinations: horseVaccs,
          overdue,
          upcoming,
        };
      }).sort((a: any, b: any) => b.overdue.length - a.overdue.length);
    },
    enabled: !!user?.id,
  });

  const totalOverdue = horseVaccinations?.reduce((sum: number, h: any) => sum + h.overdue.length, 0) || 0;
  const totalUpcoming = horseVaccinations?.reduce((sum: number, h: any) => sum + h.upcoming.length, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Überfällig</p>
              <p className="text-lg font-bold text-destructive">{totalOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fällig (30 Tage)</p>
              <p className="text-lg font-bold text-amber-600">{totalUpcoming}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Syringe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patienten</p>
              <p className="text-lg font-bold">{horseVaccinations?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Horse List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Lade Impfdaten...</p>
      ) : !horseVaccinations?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Syringe className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Noch keine Pferde-Patienten mit Impfdaten.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {horseVaccinations.map((entry: any) => (
            <Card key={entry.horse?.id} className={entry.overdue.length > 0 ? "border-destructive/30" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {entry.horse?.photo_url ? (
                      <img src={entry.horse.photo_url} alt={entry.horse.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                        {entry.horse?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{entry.horse?.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.horse?.breed}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {entry.overdue.length > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {entry.overdue.length} überfällig
                      </Badge>
                    )}
                    {entry.upcoming.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                        {entry.upcoming.length} demnächst
                      </Badge>
                    )}
                  </div>
                </div>
                {entry.overdue.length > 0 && (
                  <div className="space-y-1">
                    {entry.overdue.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-destructive/5">
                        <span className="text-destructive font-medium">{v.vaccine_type}</span>
                        <span className="text-muted-foreground">
                          Fällig seit {new Date(v.next_due_date).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
