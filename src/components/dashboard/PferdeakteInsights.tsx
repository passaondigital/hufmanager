import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Footprints, ClipboardCheck, Syringe, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS = ["name", "breed", "gender", "birth_year", "chip_number", "passport_number", "contacts", "insurance_company"] as const;

function calcScore(horse: Record<string, unknown>): number {
  let filled = 0;
  for (const f of FIELDS) {
    if (f === "contacts") {
      const c = horse.contacts;
      if (c && typeof c === "object" && Object.keys(c).length > 0) filled++;
    } else if (horse[f]) filled++;
  }
  return Math.round((filled / FIELDS.length) * 100);
}

function daysAgoLabel(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return d === 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`;
}

export function PferdeakteInsights() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["pferdeakte-insights", user?.id],
    queryFn: async () => {
      // Step 1: Get provider horses
      const { data: horseRows } = await (supabase
        .from("horses")
        .select("id, name, breed, gender, birth_year, chip_number, passport_number, contacts, insurance_company")
        .eq("provider_id", user!.id) as any)
        .is("deleted_at", null);

      const horses = (horseRows || []) as any[];
      const ids = horses.map((h) => h.id);

      if (ids.length === 0) {
        return { horseCount: 0, avgScore: 0, overdueVacc: 0, partnerCount: 0, recent: [] as Array<{ id: string; horseId: string; horseName: string; type: string; date: string }> };
      }

      // Step 2: parallel queries
      const [vaccRes, partnerRes, apptRes] = await Promise.all([
        supabase.from("horse_vaccinations").select("id, horse_id").in("horse_id", ids).lt("next_due_date", new Date().toISOString()).not("next_due_date", "is", null),
        supabase.from("horse_partner_access").select("partner_profile_id").in("horse_id", ids).eq("status", "active"),
        supabase.from("appointments").select("id, horse_id, date, service_type").eq("provider_id", user!.id).eq("status", "completed").order("date", { ascending: false }).limit(5),
      ]);

      const avgScore = Math.round(horses.reduce((s, h) => s + calcScore(h as Record<string, unknown>), 0) / horses.length);
      const nameMap = new Map(horses.map((h) => [h.id, h.name]));

      return {
        horseCount: horses.length,
        avgScore,
        overdueVacc: (vaccRes.data || []).length,
        partnerCount: new Set((partnerRes.data || []).map((p) => p.partner_profile_id)).size,
        recent: (apptRes.data || []).map((a) => ({
          id: a.id,
          horseId: a.horse_id,
          horseName: nameMap.get(a.horse_id) || "Pferd",
          type: a.service_type || "Termin",
          date: a.date,
        })),
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
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const metrics = [
    { icon: Footprints, label: "Pferde dokumentiert", value: String(data.horseCount), color: "text-primary" },
    { icon: ClipboardCheck, label: "Ø Akten-Score", value: `${data.avgScore}%`, color: "text-blue-500" },
    { icon: Syringe, label: "Impfalarm", value: String(data.overdueVacc), color: data.overdueVacc > 0 ? "text-destructive" : "text-green-500", alert: data.overdueVacc > 0 },
    { icon: Users, label: "Fachpartner", value: String(data.partnerCount), color: "text-purple-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Footprints className="h-4 w-4 text-primary" />
          Pferdeakte-Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <m.icon className={cn("h-5 w-5 mx-auto mb-1", m.color)} />
              <p className={cn("text-xl font-bold", m.alert && "text-destructive")}>
                {m.value}{m.alert ? " ⚠️" : ""}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

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
                  {daysAgoLabel(r.date)}
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
