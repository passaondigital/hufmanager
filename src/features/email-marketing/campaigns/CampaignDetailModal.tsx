import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Send, Eye, MousePointer, UserMinus } from "lucide-react";

interface CampaignDetailModalProps {
  campaign: any;
  onClose: () => void;
}

export function CampaignDetailModal({ campaign, onClose }: CampaignDetailModalProps) {
  const sent = campaign.stats_sent || 0;
  const opened = campaign.stats_opened || 0;
  const clicked = campaign.stats_clicked || 0;
  const unsub = campaign.stats_unsubscribed || 0;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const notOpened = sent - opened;

  const kpis = [
    { label: "Gesendet", value: sent, icon: Send, color: "#F47B20" },
    { label: "Geöffnet", value: opened, icon: Eye, color: "#22c55e" },
    { label: "Geklickt", value: clicked, icon: MousePointer, color: "#3b82f6" },
    { label: "Abgemeldet", value: unsub, icon: UserMinus, color: "#ef4444" },
  ];

  const chartData = [
    { name: "Geöffnet", value: opened },
    { name: "Nicht geöffnet", value: notOpened > 0 ? notOpened : 0 },
  ];
  const COLORS = ["#F47B20", "#e5e7eb"];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-black">{campaign.name}</DialogTitle>
        </DialogHeader>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Card key={k.label} className="bg-white rounded-xl shadow-sm">
              <CardContent className="pt-4 pb-3 text-center">
                <k.icon className="w-5 h-5 mx-auto mb-1" style={{ color: k.color }} />
                <p className="text-2xl font-bold text-black">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Donut Chart */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-black mb-2">Öffnungsrate: {openRate}%</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
