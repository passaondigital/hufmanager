import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Calendar, TrendingUp, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelLead {
  status: string;
  contact_preference?: string | null;
}

interface FunnelKPIsProps {
  leads: FunnelLead[];
}

export function FunnelKPIs({ leads }: FunnelKPIsProps) {
  const total = leads.length;
  const neu = leads.filter(l => l.status === "neu").length;
  const demos = leads.filter(l => ["demo_gebucht", "demo_durchgeführt", "angebot", "gewonnen"].includes(l.status)).length;
  const won = leads.filter(l => l.status === "gewonnen").length;
  const rate = total > 0 ? Math.round((won / total) * 100) : 0;
  const phonePref = leads.filter(l => l.contact_preference === "phone").length;
  const videoPref = leads.filter(l => l.contact_preference === "video").length;

  const kpis = [
    { label: "Gesamt", value: total, icon: Users, color: "text-primary" },
    { label: "Neu", value: neu, icon: UserPlus, color: "text-blue-500" },
    { label: "Demos", value: demos, icon: Calendar, color: "text-purple-500" },
    { label: "Conversion", value: `${rate}%`, icon: TrendingUp, color: "text-green-500" },
    { label: "Telefon", value: phonePref, icon: Phone, color: "text-amber-500" },
    { label: "Video", value: videoPref, icon: Video, color: "text-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {kpis.map(kpi => (
        <Card key={kpi.label}>
          <CardContent className="p-2.5 md:p-3">
            <div className="flex items-center gap-1.5">
              <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg md:text-xl font-bold mt-0.5">{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
