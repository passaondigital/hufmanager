import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Euro,
  Download,
  BarChart3,
  Loader2,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAnalyseStats } from "@/hooks/useAnalyseStats";

const Analyse = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: stats, isLoading } = useAnalyseStats(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderChangeIndicator = (change: number, suffix: string = "vs. Vorjahr") => {
    if (change === 0) {
      return (
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          Keine Änderung
        </p>
      );
    }
    const isPositive = change > 0;
    return (
      <p className={`text-sm flex items-center gap-1 mt-1 ${isPositive ? "text-accent" : "text-muted-foreground"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? "+" : ""}{change}% {suffix}
      </p>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Analyse
              <HelpTip id="analyse.bereich" />
            </h1>
            <p className="text-muted-foreground mt-1">
              Geschäftsübersicht und Leistungskennzahlen
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const monthlyData = stats?.monthlyData || [];
  const serviceDistribution = stats?.serviceDistribution || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Analyse
            <HelpTip id="analyse.bereich" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Geschäftsübersicht und Leistungskennzahlen
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
              <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jahresumsatz</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats?.yearlyRevenue || 0)}
                </p>
                {renderChangeIndicator(stats?.yearlyRevenueChange || 0)}
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Euro className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Termine (Jahr)</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.yearlyAppointments || 0}
                </p>
                {renderChangeIndicator(stats?.yearlyAppointmentsChange || 0)}
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktive Kunden</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.activeClients || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Gesamt
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ø pro Termin</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats?.avgPerAppointment || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Durchschnitt
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle className="text-lg">Umsatzentwicklung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyData.every(d => d.umsatz === 0) ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Umsatzdaten für {selectedYear}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `€${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`€${value}`, "Umsatz"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="umsatz"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointments Chart */}
        <Card className="animate-slide-up" style={{ animationDelay: "250ms" }}>
          <CardHeader>
            <CardTitle className="text-lg">Termine pro Monat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyData.every(d => d.termine === 0) ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Termine für {selectedYear}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [value, "Termine"]}
                    />
                    <Bar
                      dataKey="termine"
                      fill="hsl(var(--accent))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Distribution */}
      <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
        <CardHeader>
          <CardTitle className="text-lg">Serviceverteilung</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Keine Service-Daten für {selectedYear}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4">
                {serviceDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analyse;
