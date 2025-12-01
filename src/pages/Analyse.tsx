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
} from "lucide-react";
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
import { cn } from "@/lib/utils";

const revenueData = [
  { month: "Jan", umsatz: 3200 },
  { month: "Feb", umsatz: 3800 },
  { month: "Mär", umsatz: 3500 },
  { month: "Apr", umsatz: 4100 },
  { month: "Mai", umsatz: 4500 },
  { month: "Jun", umsatz: 4200 },
  { month: "Jul", umsatz: 4800 },
  { month: "Aug", umsatz: 4600 },
  { month: "Sep", umsatz: 5100 },
  { month: "Okt", umsatz: 4900 },
  { month: "Nov", umsatz: 4250 },
  { month: "Dez", umsatz: 3900 },
];

const appointmentsData = [
  { month: "Jan", termine: 42 },
  { month: "Feb", termine: 48 },
  { month: "Mär", termine: 45 },
  { month: "Apr", termine: 52 },
  { month: "Mai", termine: 58 },
  { month: "Jun", termine: 55 },
  { month: "Jul", termine: 62 },
  { month: "Aug", termine: 59 },
  { month: "Sep", termine: 65 },
  { month: "Okt", termine: 61 },
  { month: "Nov", termine: 54 },
  { month: "Dez", termine: 48 },
];

const serviceDistribution = [
  { name: "Barhuf", value: 45, color: "hsl(150, 35%, 35%)" },
  { name: "Beschlag", value: 35, color: "hsl(25, 80%, 50%)" },
  { name: "Korrektur", value: 15, color: "hsl(40, 70%, 50%)" },
  { name: "Sonstiges", value: 5, color: "hsl(30, 10%, 45%)" },
];

const Analyse = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analyse</h1>
          <p className="text-muted-foreground mt-1">
            Geschäftsübersicht und Leistungskennzahlen
          </p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="2024">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
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
                <p className="text-2xl font-bold text-foreground">€50.850</p>
                <p className="text-sm text-accent flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +15% vs. Vorjahr
                </p>
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
                <p className="text-2xl font-bold text-foreground">649</p>
                <p className="text-sm text-accent flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs. Vorjahr
                </p>
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
                <p className="text-2xl font-bold text-foreground">47</p>
                <p className="text-sm text-accent flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +6 dieses Jahr
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
                <p className="text-2xl font-bold text-foreground">€78</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  -2% vs. Vorjahr
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsData}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Analyse;
