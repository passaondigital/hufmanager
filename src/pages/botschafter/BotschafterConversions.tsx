import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Conversion = {
  id: string;
  referral_code: string;
  product_name: string | null;
  amount_cents: number | null;
  commission_cents: number | null;
  status: string | null;
  created_at: string | null;
};

const STATUS_MAP: Record<string, { color: string; icon: string; label: string }> = {
  confirmed: { color: "#22c55e", icon: "🟢", label: "Aktiv" },
  pending: { color: "#eab308", icon: "🟡", label: "Trial" },
  cancelled: { color: "#6b7280", icon: "⚪", label: "Inaktiv" },
};

export default function BotschafterConversions() {
  const { user } = useAuth();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .eq("status", "active")
      .maybeSingle();

    if (bot) {
      const { data: convs } = await supabase
        .from("botschafter_conversions")
        .select("id, referral_code, product_name, amount_cents, commission_cents, status, created_at")
        .eq("botschafter_id", bot.id)
        .order("created_at", { ascending: false });
      setConversions(convs || []);
      
      const confirmed = (convs || []).filter(c => c.status === "confirmed");
      const pending = (convs || []).filter(c => c.status === "pending");
      setTotalPaid(confirmed.length);
      setTotalPending(pending.length);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">👥 Gewonnene Partner/innen</h1>

      <div className="flex gap-4 text-sm" style={{ color: "#9ca3af" }}>
        <span>Gesamt: {conversions.length} Registrierungen</span>
        <span>·</span>
        <span>{totalPaid} zahlend</span>
        <span>·</span>
        <span>{totalPending} Trial</span>
      </div>

      <div className="flex gap-3 text-xs" style={{ color: "#9ca3af" }}>
        <span>🟢 zahlend</span>
        <span>🟡 trial</span>
        <span>⚪ inaktiv</span>
      </div>

      <div className="space-y-2">
        {conversions.map(conv => {
          const s = STATUS_MAP[conv.status || "pending"] || STATUS_MAP.pending;
          const date = conv.created_at ? new Date(conv.created_at).toLocaleDateString("de-DE") : "";
          return (
            <Card key={conv.id} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{conv.product_name || "Registrierung"}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>{date} · Status: {s.label}</p>
                    </div>
                  </div>
                  {conv.commission_cents ? (
                    <span className="text-sm font-semibold" style={{ color: "#F5970A" }}>
                      {(conv.commission_cents / 100).toFixed(2)}€
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "#6b7280" }}>aussteh.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {conversions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm" style={{ color: "#6b7280" }}>Noch keine Conversions. Teile deinen Link!</p>
          </div>
        )}
      </div>
    </div>
  );
}
