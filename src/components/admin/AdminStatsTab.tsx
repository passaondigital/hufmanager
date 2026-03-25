import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { ProviderData } from "./AdminProviderTab";

interface AdminStatsTabProps {
  providers: ProviderData[];
}

export function AdminStatsTab({ providers }: AdminStatsTabProps) {
  // Summary stats
  const totalClients = providers.reduce((s, p) => s + p.client_count, 0);
  const totalHorses = providers.reduce((s, p) => s + p.horse_count, 0);
  const withPrice = providers.filter(p => p.base_price);
  const avgPrice = withPrice.length > 0
    ? (withPrice.reduce((s, p) => s + (p.base_price || 0), 0) / withPrice.length).toFixed(0)
    : "—";

  // Region data
  const regionCounts = providers.reduce((acc, p) => {
    const region = p.zip_code?.substring(0, 2) || "??";
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regionBarData = Object.entries(regionCounts)
    .map(([region, count]) => ({ region: region === "??" ? "?" : `${region}xxx`, count }))
    .sort((a, b) => b.count - a.count).slice(0, 12);

  // Plan distribution
  const planCounts = providers.reduce((acc, p) => {
    const plan = p.plan_override || p.subscription_plan || "starter";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const planLabels: Record<string, string> = {
    pro: "Pro", starter: "Starter", lifetime_grant: "Lifetime",
    beta_tester: "Beta", employee: "Team", manual_cash_1y: "Cash 1Y",
  };
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))'];
  const planChartData = Object.entries(planCounts)
    .map(([plan, count]) => ({ name: planLabels[plan] || plan, value: count }))
    .sort((a, b) => b.value - a.value);

  // Volume by region
  const regionVolume = providers.reduce((acc, p) => {
    const region = p.zip_code?.substring(0, 2) || "??";
    if (!acc[region]) acc[region] = { providers: 0, clients: 0, horses: 0 };
    acc[region].providers++;
    acc[region].clients += p.client_count;
    acc[region].horses += p.horse_count;
    return acc;
  }, {} as Record<string, { providers: number; clients: number; horses: number }>);
  const volumeData = Object.entries(regionVolume)
    .map(([region, d]) => ({ region: region === "??" ? "?" : `${region}xxx`, ...d }))
    .sort((a, b) => b.clients - a.clients).slice(0, 12);

  // Avg price by region
  const regionPrices = providers.reduce((acc, p) => {
    if (!p.base_price) return acc;
    const region = p.zip_code?.substring(0, 2) || "??";
    if (!acc[region]) acc[region] = { total: 0, count: 0 };
    acc[region].total += p.base_price;
    acc[region].count++;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);
  const priceData = Object.entries(regionPrices)
    .map(([region, d]) => ({ region: region === "??" ? "?" : `${region}xxx`, avgPrice: Math.round(d.total / d.count) }))
    .sort((a, b) => b.avgPrice - a.avgPrice).slice(0, 12);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Provider", value: providers.length },
          { label: "Kunden", value: totalClients },
          { label: "Pferde", value: totalHorses },
          { label: "Ø Preis", value: avgPrice === "—" ? avgPrice : `${avgPrice} €` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PLZ-Regionen</CardTitle>
          </CardHeader>
          <CardContent>
            {regionBarData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="region" width={55} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} Provider`, 'Anzahl']} contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Keine Daten</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            {planChartData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {planChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} Provider`, 'Anzahl']} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Keine Daten</div>}
          </CardContent>
        </Card>
      </div>

      {/* Volume & Price */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kundenvolumen</CardTitle>
            <CardDescription className="text-xs">Kunden & Pferde pro Region</CardDescription>
          </CardHeader>
          <CardContent>
            {volumeData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} margin={{ left: 10, right: 20, bottom: 30 }}>
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}`, name === 'clients' ? 'Kunden' : 'Pferde']} />
                    <Legend formatter={(v) => v === 'clients' ? 'Kunden' : 'Pferde'} />
                    <Bar dataKey="clients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="horses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Keine Daten</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ø Preise nach Region</CardTitle>
          </CardHeader>
          <CardContent>
            {priceData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}€`} />
                    <YAxis type="category" dataKey="region" width={55} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} €`, 'Ø Preis']} contentStyle={tooltipStyle} />
                    <Bar dataKey="avgPrice" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Keine Daten</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
