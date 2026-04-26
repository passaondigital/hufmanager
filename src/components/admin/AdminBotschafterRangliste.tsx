import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trophy, Medal, Award, Info } from "lucide-react";
import { toast } from "sonner";

type RankedBot = {
  id: string;
  first_name: string;
  last_name: string;
  type: string;
  total_conversions: number | null;
  total_earnings_cents: number | null;
  public_display_name: string | null;
  user_id: string | null;
  status: string | null;
};

const MEDAL_ICONS = [
  <Trophy className="w-6 h-6 text-yellow-400" />,
  <Medal className="w-6 h-6 text-gray-300" />,
  <Award className="w-6 h-6 text-orange-600" />,
];

const TYPE_LABELS: Record<string, string> = { creator: "Creator", profi: "Profi", unternehmen: "Unternehmen" };

export function AdminBotschafterRangliste() {
  const [ranked, setRanked] = useState<RankedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicToggle, setPublicToggle] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, first_name, last_name, type, total_conversions, total_earnings_cents, public_display_name, user_id, status")
      .eq("status", "active")
      .order("total_conversions", { ascending: false })
      .limit(10);
    if (error) toast.error("Fehler beim Laden");
    else setRanked(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const qualified = ranked.filter(b => (b.total_conversions || 0) > 0).length;

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 Top 10 Botschafter — Live Rangliste</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Öffentlich zeigen</span>
          <Switch checked={publicToggle} onCheckedChange={setPublicToggle} />
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Die Top 10 erhalten automatisch Hufi Pro 1 Jahr kostenlos.</p>
            <p className="text-sm text-muted-foreground">Aktuell qualifiziert: {qualified} von 10 Plätzen vergeben</p>
          </div>
        </CardContent>
      </Card>

      {/* Podium (Top 3) */}
      {ranked.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 0, 2].map(idx => {
            const b = ranked[idx];
            if (!b) return null;
            const rank = idx + 1;
            const heights = ["h-48", "h-56", "h-40"];
            const bgColors = ["bg-yellow-500/10 border-yellow-500/30", "bg-gray-300/10 border-gray-300/30", "bg-orange-600/10 border-orange-600/30"];
            return (
              <Card key={b.id} className={`${bgColors[idx]} flex flex-col items-center justify-end ${heights[idx]} relative`}>
                <CardContent className="text-center pb-4 pt-6">
                  <div className="mb-2">{MEDAL_ICONS[idx]}</div>
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold mx-auto mb-2">
                    {b.first_name[0]}{b.last_name[0]}
                  </div>
                  <p className="font-bold">{b.first_name} {b.last_name}</p>
                  <p className="text-sm text-muted-foreground">{TYPE_LABELS[b.type] || b.type}</p>
                  <p className="text-lg font-bold text-primary mt-1">{b.total_conversions || 0} Conv.</p>
                  <p className="text-sm text-muted-foreground">{((b.total_earnings_cents || 0) / 100).toFixed(2)} €</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest (4-10) */}
      <Card>
        <CardHeader><CardTitle>Platz 4–10</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Rang</th><th className="pb-2">Name</th><th className="pb-2">Typ</th>
                <th className="pb-2">Conversions</th><th className="pb-2">Verdienst</th>
              </tr></thead>
              <tbody>
                {ranked.slice(3).map((b, i) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-3 font-bold text-muted-foreground">#{i + 4}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{b.first_name[0]}{b.last_name[0]}</div>
                        <span className="font-medium">{b.first_name} {b.last_name}</span>
                      </div>
                    </td>
                    <td className="py-3"><Badge variant="outline">{TYPE_LABELS[b.type] || b.type}</Badge></td>
                    <td className="py-3 font-bold">{b.total_conversions || 0}</td>
                    <td className="py-3">{((b.total_earnings_cents || 0) / 100).toFixed(2)} €</td>
                  </tr>
                ))}
                {ranked.length <= 3 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Noch nicht genug Botschafter</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
