import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type RankEntry = {
  id: string;
  public_display_name: string | null;
  first_name: string;
  type: string;
  total_conversions: number;
  is_self: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function BotschafterRangliste() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"total" | "month">("total");

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    // Get all active botschafter ranked by conversions
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, public_display_name, first_name, last_name, type, total_conversions, user_id")
      .eq("status", "active")
      .eq("listed_publicly", true)
      .order("total_conversions", { ascending: false })
      .limit(50);

    const entries: RankEntry[] = (data || []).map(b => ({
      id: b.id,
      public_display_name: (b as any).public_display_name || `${b.first_name} ${(b.last_name || "").charAt(0)}.`,
      first_name: b.first_name,
      type: b.type,
      total_conversions: b.total_conversions || 0,
      is_self: b.user_id === user?.id,
    }));
    setRanking(entries);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;

  const selfRank = ranking.findIndex(r => r.is_self) + 1;
  const typeLabel = (t: string) => t === "creator" ? "Creator" : t === "profi" ? "Profi" : "Business";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">🏆 Botschafter-Rangliste</h1>

      {selfRank > 0 && (
        <div className="text-center text-sm p-3 rounded-lg" style={{ backgroundColor: "rgba(245,151,10,0.1)", color: "#F5970A" }}>
          Dein Rang: <strong>#{selfRank}</strong> von {ranking.length}
          {selfRank > 3 && ` · Noch ${ranking[2]?.total_conversions - (ranking[selfRank - 1]?.total_conversions || 0) + 1} Conversions bis Top 3`}
        </div>
      )}

      <div className="space-y-2">
        {ranking.map((entry, i) => (
          <Card
            key={entry.id}
            style={{
              backgroundColor: entry.is_self ? "rgba(245,151,10,0.08)" : "#1a1a12",
              borderColor: entry.is_self ? "#F5970A" : "#2a2a1f",
            }}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-lg w-8 text-center">
                {i < 3 ? MEDALS[i] : <span className="text-sm" style={{ color: "#6b7280" }}>#{i + 1}</span>}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {entry.is_self && "➡️ "}
                  {entry.public_display_name}
                </p>
                <p className="text-[10px]" style={{ color: "#6b7280" }}>{typeLabel(entry.type)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: "#F5970A" }}>{entry.total_conversions}</p>
                <p className="text-[10px]" style={{ color: "#6b7280" }}>Conv.</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {ranking.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "#6b7280" }}>Noch keine Botschafter in der Rangliste.</p>
        )}
      </div>
    </div>
  );
}
