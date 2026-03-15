import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Footprints, ClipboardCheck, Syringe, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPLETENESS_FIELDS = [
  "name", "breed", "gender", "birth_year",
  "chip_number", "passport_number", "contacts", "insurance_company",
] as const;

function calcCompleteness(horse: any): number {
  let filled = 0;
  for (const f of COMPLETENESS_FIELDS) {
    if (f === "contacts") {
      if (horse.contacts && typeof horse.contacts === "object" && Object.keys(horse.contacts).length > 0) filled++;
    } else if (horse[f]) filled++;
  }
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

export function PferdeakteInsights() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["pferdeakte-insights", user?.id],
    queryFn: async () => {
      const horsesRes = await supabase
        .from("horses")
        .select("id, name, breed, gender, birth_year, chip_number, passport_number, contacts, insurance_company")
        .eq("provider_id", user!.id)
        .is("deleted_at", null);

      const horses = horsesRes.data || [];
      const horseIds = horses.map(h => h.id);

      const [vaccRes, partnersRes, recentRes] = await Promise.all([
        horseIds.length > 0
          ? supabase
              .from("horse_vaccinations")
              .select("id, horse_id")
              .in("horse_id", horseIds)
              .lt("next_due_date", new Date().toISOString())
              .not("next_due_date", "is", null)
          : Promise.resolve({ data: [] }),
        horseIds.length > 0
          ? supabase
              .from("horse_partner_access")
              .select("partner_profile_id, horse_id")
              .in("horse_id", horseIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
        supabase
          .from("appointments")
          .select("id, horse_id, date, service_type")
          .eq("provider_id", user!.id)
          .eq("status", "completed")
          .order("date", { ascending: false })
          .limit(5),
      ]);

      const horses = horsesRes.data || [];
      const avgScore = horses.length > 0
        ? Math.round(horses.reduce((sum, h) => sum + calcCompleteness(h), 0) / horses.length)
        : 0;

      // Filter vacc alerts to provider's horses
      const providerHorseIds = new Set(horses.map(h => h.id));
      const overdueVacc = (vaccRes.data || []).filter((v: any) =>
        providerHorseIds.has(v.horse_id)
      ).length;

      const uniquePartners = new Set(
        (partnersRes.data || [])
          .filter((p: any) => providerHorseIds.has(p.horse_id))
          .map((p: any) => p.partner_profile_id)
      ).size;

      const recent = (recentRes.data || []).map((a: any) => ({
        id: a.id,
        horseId: a.horse_id,
        horseName: (a.horses as any)?.name || "Unbekannt",
        type: a.service_type || "Termin",
        date: a.date,
      }));

      return {
        horseCount: horses.length,
        avgScore,
        overdueVacc,
        partnerCount: uniquePartners,
        recent,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const metrics = [
    { icon: Footprints, label: "Pferde dokumentiert", value: data.horseCount, color: "text-primary" },
    { icon: ClipboardCheck, label: "Ø Akten-Score", value: `${data.avgScore}%`, color: "text-blue-500" },
    { icon: Syringe, label: "Impfalarm", value: data.overdueVacc, color: data.overdueVacc > 0 ? "text-red-500" : "text-green-500", alert: data.overdueVacc > 0 },
    { icon: Users, label: "Fachpartner", value: data.partnerCount, color: "text-purple-500" },
  ];

  const daysAgo = (dateStr: string) => {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    return d === 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Footprints className="h-4 w-4 text-primary" />
          Pferdeakte-Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <m.icon className={cn("h-5 w-5 mx-auto mb-1", m.color)} />
              <p className={cn("text-xl font-bold", m.alert && "text-red-500")}>
                {m.value}
                {m.alert && " ⚠️"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        {data.recent.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Letzte Aktivität</p>
            {data.recent.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/pferd/${r.horseId}?tab=pferdeakte`)}
                className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
              >
                <span className="text-xs text-foreground truncate">
                  <span className="font-medium">{r.horseName}</span>
                  <span className="text-muted-foreground"> · {r.type}</span>
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  {daysAgo(r.date)}
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
