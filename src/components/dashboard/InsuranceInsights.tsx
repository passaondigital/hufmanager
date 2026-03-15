import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, Syringe, FileCheck, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const SCORE_LABELS: Record<string, { label: string; color: string }> = {
  "A+": { label: "A+", color: "text-green-500" },
  "A": { label: "A", color: "text-green-500" },
  "B+": { label: "B+", color: "text-blue-500" },
  "B": { label: "B", color: "text-amber-500" },
  "C": { label: "C", color: "text-destructive" },
};

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  return "C";
}

interface RiskHorse {
  id: string;
  name: string;
  level: "green" | "yellow" | "red";
  reason: string;
}

export function InsuranceInsights() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["insurance-insights", user?.id],
    queryFn: async () => {
      // Get provider horses
      const { data: horses } = await (supabase.from("horses") as any)
        .select("id, name, insurance_company, breed, birth_year, chip_number, passport_number, contacts, gender")
        .eq("provider_id", user!.id)
        .is("deleted_at", null);

      const allHorses = (horses || []) as any[];
      if (allHorses.length === 0) return null;

      const ids = allHorses.map((h: any) => h.id);

      // Parallel queries
      const [vaccRes, apptRes] = await Promise.all([
        supabase.from("horse_vaccinations").select("horse_id, next_due_date").in("horse_id", ids).not("next_due_date", "is", null),
        supabase.from("appointments").select("horse_id, date, status").in("horse_id", ids).eq("status", "completed").order("date", { ascending: false }),
      ]);

      const vaccinations = (vaccRes.data || []) as any[];
      const appointments = (apptRes.data || []) as any[];

      // Insurance rate
      const insuredCount = allHorses.filter((h: any) => h.insurance_company).length;
      const insuredPct = Math.round((insuredCount / allHorses.length) * 100);

      // Vaccination status
      const now = new Date();
      const horsesWithOverdue = new Set<string>();
      vaccinations.forEach((v: any) => {
        if (new Date(v.next_due_date) < now) horsesWithOverdue.add(v.horse_id);
      });
      const vaccCurrentPct = Math.round(((allHorses.length - horsesWithOverdue.size) / allHorses.length) * 100);

      // Prevention score: weighted from completeness (40%), vacc (30%), regularity (30%)
      const FIELDS = ["name", "breed", "gender", "birth_year", "chip_number", "passport_number", "contacts", "insurance_company"];
      const avgCompleteness = allHorses.reduce((sum: number, h: any) => {
        let filled = 0;
        for (const f of FIELDS) {
          if (f === "contacts") {
            if (h.contacts && typeof h.contacts === "object" && Object.keys(h.contacts).length > 0) filled++;
          } else if (h[f]) filled++;
        }
        return sum + (filled / FIELDS.length) * 100;
      }, 0) / allHorses.length;

      // Regularity: check if recent 3 appointments per horse are in 6-12 week rhythm
      const horseAppts: Record<string, string[]> = {};
      appointments.forEach((a: any) => {
        if (!horseAppts[a.horse_id]) horseAppts[a.horse_id] = [];
        if (horseAppts[a.horse_id].length < 4) horseAppts[a.horse_id].push(a.date);
      });

      let regularityScore = 0;
      let regularityCount = 0;
      Object.values(horseAppts).forEach((dates) => {
        if (dates.length >= 2) {
          regularityCount++;
          let regularPairs = 0;
          for (let i = 0; i < dates.length - 1 && i < 3; i++) {
            const diff = (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) / (1000 * 60 * 60 * 24);
            if (diff >= 42 && diff <= 84) regularPairs++;
          }
          regularityScore += (regularPairs / Math.min(dates.length - 1, 3)) * 100;
        }
      });
      const avgRegularity = regularityCount > 0 ? regularityScore / regularityCount : 50;

      const preventionScore = Math.round(avgCompleteness * 0.4 + vaccCurrentPct * 0.3 + avgRegularity * 0.3);
      const grade = getGrade(preventionScore);

      // Risk list (top 5)
      const riskList: RiskHorse[] = allHorses.map((h: any) => {
        const noInsurance = !h.insurance_company;
        const overdue = horsesWithOverdue.has(h.id);
        const completeness = (() => {
          let filled = 0;
          for (const f of FIELDS) {
            if (f === "contacts") {
              if (h.contacts && typeof h.contacts === "object" && Object.keys(h.contacts).length > 0) filled++;
            } else if (h[f]) filled++;
          }
          return (filled / FIELDS.length) * 100;
        })();

        let level: "green" | "yellow" | "red" = "green";
        let reason = "Alles aktuell";

        if (noInsurance || (overdue && completeness < 60)) {
          level = "red";
          reason = noInsurance ? "Keine Versicherung erfasst" : "Überfällige Impfung + unvollständige Akte";
        } else if (overdue || completeness < 60) {
          level = "yellow";
          reason = overdue ? "Impfung überfällig" : `Akte nur ${Math.round(completeness)}% vollständig`;
        }

        return { id: h.id, name: h.name, level, reason };
      })
        .sort((a, b) => {
          const order = { red: 0, yellow: 1, green: 2 };
          return order[a.level] - order[b.level];
        })
        .slice(0, 5);

      // Insight text
      let insight = "Pferde mit vollständiger digitaler Akte haben nachweislich weniger Behandlungslücken.";
      if (horsesWithOverdue.size > 0) {
        insight = `${horsesWithOverdue.size} Pferd${horsesWithOverdue.size > 1 ? "e" : ""} mit überfälligen Impfungen. Lückenlose Dokumentation senkt das Risiko.`;
      } else if (avgCompleteness > 80) {
        insight = "Regelmäßige Hufbearbeitung im 8-Wochen-Rhythmus reduziert Huferkrankungen signifikant.";
      }

      return { insuredPct, vaccCurrentPct, preventionScore, grade, riskList, insight, docPct: 0 };
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

  const gradeConfig = SCORE_LABELS[data.grade] || SCORE_LABELS["C"];
  const levelIcons = { green: "🟢", yellow: "🟡", red: "🔴" };

  const metrics = [
    { icon: Shield, label: "Versichert erfasst", value: `${data.insuredPct}%`, color: "text-primary" },
    { icon: Syringe, label: "Impfstatus aktuell", value: `${data.vaccCurrentPct}%`, color: data.vaccCurrentPct >= 80 ? "text-green-500" : "text-amber-500" },
    { icon: FileCheck, label: "Im Tresor", value: `${data.docPct}%`, color: "text-muted-foreground" },
    { icon: TrendingUp, label: "Präventions-Score", value: gradeConfig.label, color: gradeConfig.color },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Versicherungs-Perspektive
          <Badge variant="secondary" className="text-[9px] ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <m.icon className={cn("h-5 w-5 mx-auto mb-1", m.color)} />
              <p className={cn("text-xl font-bold", m.color)}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">{data.insight}</p>
        </div>

        {/* Risk List */}
        {data.riskList.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Risiko-Übersicht</p>
            {data.riskList.map((h) => (
              <div key={h.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs">
                <span>{levelIcons[h.level]}</span>
                <span className="font-medium text-foreground">{h.name}</span>
                <span className="text-muted-foreground ml-auto">{h.reason}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
