import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const CATEGORY_STYLES: Record<string, { badge: string; icon: string }> = {
  update: { badge: "🆕", icon: "UPDATE" },
  numbers: { badge: "📊", icon: "ZAHLEN" },
  roadmap: { badge: "🗺️", icon: "ROADMAP" },
  tips: { badge: "💡", icon: "TIPP" },
  event: { badge: "📅", icon: "EVENT" },
};

export default function BotschafterInsights() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("botschafter_updates")
      .select("id, title, content, category, published_at, is_pinned")
      .not("published_at", "is", null)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(50);
    setUpdates(data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">📰 Botschafter-Insights</h1>
      <p className="text-xs" style={{ color: "#6b7280" }}>Exklusive News & Einblicke nur für Botschafter</p>

      <div className="space-y-3">
        {updates.map(u => {
          const cat = CATEGORY_STYLES[u.category] || CATEGORY_STYLES.update;
          const date = u.published_at ? new Date(u.published_at).toLocaleDateString("de-DE") : "";
          return (
            <Card key={u.id} style={{ backgroundColor: "#1a1a12", borderColor: u.is_pinned ? "#F5970A" : "#2a2a1f" }}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat.badge}</span>
                  <span className="text-[10px] font-bold" style={{ color: "#9ca3af" }}>{date} · {cat.icon}</span>
                  {u.is_pinned && <Badge className="text-[9px] px-1" style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>📌 Pinned</Badge>}
                </div>
                <h3 className="font-semibold text-sm">{u.title}</h3>
                <p className="text-sm whitespace-pre-line" style={{ color: "#d1d5db" }}>{u.content}</p>
              </CardContent>
            </Card>
          );
        })}
        {updates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📰</div>
            <p className="text-sm" style={{ color: "#6b7280" }}>Noch keine Insights. Schau bald wieder vorbei!</p>
          </div>
        )}
      </div>
    </div>
  );
}
