import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Monitor, Smartphone, Globe, Laptop } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(25, 80%, 50%)",
  "hsl(150, 35%, 35%)",
  "hsl(40, 70%, 50%)",
  "hsl(200, 60%, 50%)",
  "hsl(280, 50%, 50%)",
  "hsl(0, 60%, 50%)",
  "hsl(30, 10%, 45%)",
];

interface ParsedUA {
  browser: string;
  os: string;
  device: string;
  isPWA: boolean;
}

function parseUserAgent(ua: string): ParsedUA {
  let browser = "Sonstige";
  let os = "Sonstige";
  let device = "Desktop";
  const isPWA = false;

  // Browser detection
  if (ua.includes("Ecosia")) browser = "Ecosia";
  else if (ua.includes("Edg/") || ua.includes("Edge/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("CriOS/")) browser = "Chrome (iOS)";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  // OS detection
  if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("CrOS")) os = "ChromeOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device type
  if (ua.includes("iPhone") || (ua.includes("Android") && ua.includes("Mobile"))) device = "Smartphone";
  else if (ua.includes("iPad") || (ua.includes("Android") && !ua.includes("Mobile"))) device = "Tablet";
  else device = "Desktop";

  return { browser, os, device, isPWA };
}

function aggregateData(records: { ua: string; count: number }[]) {
  const browsers: Record<string, number> = {};
  const osSystems: Record<string, number> = {};
  const devices: Record<string, number> = {};
  let total = 0;

  for (const { ua, count } of records) {
    const parsed = parseUserAgent(ua);
    browsers[parsed.browser] = (browsers[parsed.browser] || 0) + count;
    osSystems[parsed.os] = (osSystems[parsed.os] || 0) + count;
    devices[parsed.device] = (devices[parsed.device] || 0) + count;
    total += count;
  }

  const toChartData = (map: Record<string, number>) =>
    Object.entries(map)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value);

  return {
    browsers: toChartData(browsers),
    osSystems: toChartData(osSystems),
    devices: toChartData(devices),
    total,
  };
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Smartphone: <Smartphone className="w-4 h-4" />,
  Tablet: <Laptop className="w-4 h-4" />,
  Desktop: <Monitor className="w-4 h-4" />,
};

export function AdminBrowserAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-browser-analytics"],
    queryFn: async () => {
      // Fetch user_agent data from performance_metrics metadata
      const { data: metrics, error } = await supabase
        .from("performance_metrics")
        .select("metadata")
        .not("metadata", "is", null);

      if (error) throw error;

      // Extract and count unique user agents
      const uaCounts: Record<string, number> = {};
      for (const row of metrics || []) {
        const meta = row.metadata as Record<string, unknown> | null;
        const ua = meta?.user_agent as string | undefined;
        if (ua && typeof ua === "string") {
          uaCounts[ua] = (uaCounts[ua] || 0) + 1;
        }
      }

      const records = Object.entries(uaCounts).map(([ua, count]) => ({ ua, count }));
      return aggregateData(records);
    },
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Keine Browser-Daten vorhanden.</p>
          <p className="text-xs text-muted-foreground mt-1">
            User-Agent-Daten werden über Performance-Metriken erfasst.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Browser & Geräte-Analyse
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Basierend auf {data.total.toLocaleString("de-DE")} erfassten Performance-Metriken
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Browser</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.browsers[0]?.name || "–"}</p>
            <p className="text-xs text-muted-foreground">{data.browsers[0]?.percent || 0}% aller Zugriffe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Betriebssystem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.osSystems[0]?.name || "–"}</p>
            <p className="text-xs text-muted-foreground">{data.osSystems[0]?.percent || 0}% aller Zugriffe</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Geräte-Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.devices.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {DEVICE_ICONS[d.name] || <Monitor className="w-4 h-4" />}
                    {d.name}
                  </span>
                  <span className="font-medium">{d.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Browser-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.browsers}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} (${percent}%)`}
                    labelLine={false}
                  >
                    {data.browsers.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString("de-DE")} Zugriffe`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* OS Distribution Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Betriebssystem-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.osSystems} layout="vertical" margin={{ left: 70 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("de-DE")} Zugriffe`,
                      "Anzahl",
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.osSystems.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alle Browser im Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.browsers.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm flex-1">{b.name}</span>
                <span className="text-sm font-medium">{b.value.toLocaleString("de-DE")}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{b.percent}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ℹ️ Datenquelle: <code className="bg-muted px-1 rounded">performance_metrics.metadata.user_agent</code> – 
        PWA-Installationsstatus kann client-seitig nicht zuverlässig aus dem User-Agent abgeleitet werden.
      </p>
    </div>
  );
}
