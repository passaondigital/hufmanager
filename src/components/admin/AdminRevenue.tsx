import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Euro,
  Users,
  Calculator,
  Download,
  PiggyBank,
} from "lucide-react";

interface PlanCounts {
  starter: number;
  pro: number;
  duo: number;
  team: number;
}

const PLAN_PRICES: Record<keyof PlanCounts, number> = {
  starter: 9.9,
  pro: 29,
  duo: 49,
  team: 79,
};

const PLAN_LABELS: Record<keyof PlanCounts, string> = {
  starter: "Starter (9,90 €)",
  pro: "Pro (29 €)",
  duo: "Duo (49 €)",
  team: "Team (79 €)",
};

const PLAN_COLORS: Record<keyof PlanCounts, string> = {
  starter: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  pro: "bg-primary/10 text-primary border-primary/30",
  duo: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  team: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export function AdminRevenue() {
  const [counts, setCounts] = useState<PlanCounts>({
    starter: 0,
    pro: 0,
    duo: 0,
    team: 0,
  });

  const totalSubs = Object.values(counts).reduce((a, b) => a + b, 0);
  const monthlyRevenue = Object.entries(counts).reduce(
    (sum, [plan, count]) => sum + count * PLAN_PRICES[plan as keyof PlanCounts],
    0
  );
  const yearlyRevenue = monthlyRevenue * 12;

  const updateCount = (plan: keyof PlanCounts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts((prev) => ({ ...prev, [plan]: Math.max(0, num) }));
  };

  const exportCSV = () => {
    const rows = [
      ["Plan", "Preis/Monat", "Anzahl Abos", "Monatlich", "Jährlich"],
      ...Object.entries(counts).map(([plan, count]) => {
        const price = PLAN_PRICES[plan as keyof PlanCounts];
        return [
          plan.charAt(0).toUpperCase() + plan.slice(1),
          `${price.toFixed(2)} €`,
          count.toString(),
          `${(count * price).toFixed(2)} €`,
          `${(count * price * 12).toFixed(2)} €`,
        ];
      }),
      ["", "", "", "", ""],
      ["Gesamt", "", totalSubs.toString(), `${monthlyRevenue.toFixed(2)} €`, `${yearlyRevenue.toFixed(2)} €`],
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hufmanager-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary" />
            Einnahmen-Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manuelle Abo-Übersicht · CopeCart-Produkte werden nachgepflegt
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          CSV Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktive Abos</p>
                <p className="text-3xl font-bold">{totalSubs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Euro className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monatliche Einnahmen</p>
                <p className="text-3xl font-bold">{monthlyRevenue.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hochrechnung / Jahr</p>
                <p className="text-3xl font-bold">{yearlyRevenue.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Input Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Abo-Anzahl pro Plan
          </CardTitle>
          <CardDescription>
            Trage die aktuelle Anzahl aktiver Abonnements pro Plan ein.
            Sobald CopeCart-Produkte eingerichtet sind, werden diese automatisch synchronisiert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map((plan) => (
              <div key={plan} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline" className={PLAN_COLORS[plan]}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{PLAN_PRICES[plan].toFixed(2)} €/Mo.</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={counts[plan]}
                  onChange={(e) => updateCount(plan, e.target.value)}
                  className="text-center text-lg font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">
                  = {(counts[plan] * PLAN_PRICES[plan]).toFixed(2)} €/Mo.
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aufschlüsselung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Preis</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Abos</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Monatlich</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Jährlich</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PLAN_PRICES) as Array<keyof PlanCounts>).map((plan) => {
                  const monthly = counts[plan] * PLAN_PRICES[plan];
                  return (
                    <tr key={plan} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={PLAN_COLORS[plan]}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{PLAN_PRICES[plan].toFixed(2)} €</td>
                      <td className="py-2 px-3 text-right font-mono">{counts[plan]}</td>
                      <td className="py-2 px-3 text-right font-mono">{monthly.toFixed(2)} €</td>
                      <td className="py-2 px-3 text-right font-mono">{(monthly * 12).toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-2 px-3 font-bold">Gesamt</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-right font-bold font-mono">{totalSubs}</td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-primary">
                    {monthlyRevenue.toFixed(2)} €
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-primary">
                    {yearlyRevenue.toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">§ 19 UStG – Kleinunternehmerregelung:</strong>{" "}
            Es wird keine Umsatzsteuer erhoben. Alle Preise sind Bruttopreise = Nettopreise.
            CopeCart übernimmt Zahlungsabwicklung & Rechnungsstellung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
