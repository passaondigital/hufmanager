import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Sparkles, FileDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type BotschafterData = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  referral_code: string;
  total_clicks: number | null;
  total_conversions: number | null;
  total_earnings_cents: number | null;
  tier: string | null;
  created_at: string | null;
  company_name: string | null;
  social_handle: string | null;
};

const TIERS = [
  { key: "bronze", label: "Bronze", min: 0, rate: 20, icon: "🥉" },
  { key: "silver", label: "Silber", min: 10, rate: 22, icon: "🥈" },
  { key: "gold", label: "Gold", min: 20, rate: 25, icon: "🥇" },
  { key: "platinum", label: "Platin", min: 50, rate: 30, icon: "💎" },
];

const CONTENT_IDEAS = [
  "5 Dinge die jeder Pferdebesitzer wissen muss",
  "So funktioniert die digitale Pferdeakte",
  "Warum Datenschutz auch für Pferde wichtig ist",
  "QR-Code am Stall: So rettest du im Notfall Leben",
];

export default function BotschafterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<BotschafterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, type, first_name, last_name, referral_code, total_clicks, total_conversions, total_earnings_cents, tier, created_at, company_name, social_handle")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .eq("status", "active")
      .maybeSingle();

    if (bot) {
      setData(bot as unknown as BotschafterData);
    } else {
      navigate("/botschafter/login", { replace: true });
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!data) return null;

  const conversions = data.total_conversions || 0;
  const currentTier = [...TIERS].reverse().find(t => conversions >= t.min) || TIERS[0];
  const nextTier = TIERS.find(t => t.min > conversions);
  const referralLink = `${window.location.origin}/?ref=${data.referral_code}`;
  const sinceDate = data.created_at ? new Date(data.created_at).toLocaleDateString("de-DE", { month: "long", year: "numeric" }) : "";

  const typeLabel = data.type === "creator" ? "Creator" : data.type === "profi" ? "Pferdeprofi" : "Unternehmen";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link kopiert!");
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold">
          👋 {data.type === "unternehmen" ? `Willkommen, ${data.company_name || data.first_name}!` : `Hey ${data.first_name}!`}
        </h1>
        <p className="text-sm" style={{ color: "#9ca3af" }}>
          {typeLabel} seit {sinceDate}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Klicks", value: data.total_clicks || 0 },
          { label: "Partner", value: conversions },
          { label: "Verdient", value: `${((data.total_earnings_cents || 0) / 100).toFixed(0)}€` },
          { label: "Rang", value: `${currentTier.icon} ${currentTier.label}` },
        ].map(stat => (
          <Card key={stat.label} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-4 text-center">
              <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: "#F5970A" }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 text-xs p-2.5 rounded-lg break-all" style={{ backgroundColor: "#0a0700", color: "#F5970A" }}>
              {referralLink}
            </code>
            <Button size="sm" onClick={copyLink} style={{ backgroundColor: "#F5970A", color: "#0a0700" }} className="hover:opacity-90">
              <Copy className="w-4 h-4 mr-1" /> Kopieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Type-specific content */}
      {data.type === "creator" && (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Content-Ideen für dich</h3>
            <div className="space-y-2">
              {CONTENT_IDEAS.map((idea, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "#d1d5db" }}>
                  <span style={{ color: "#F5970A" }}>💡</span>
                  <span>"{idea}"</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/botschafter/werbemittel")} style={{ borderColor: "#F5970A", color: "#F5970A" }}>
              <Sparkles className="w-4 h-4 mr-1" /> Content mit KI erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {data.type === "profi" && (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Empfehlung leicht gemacht</h3>
            <div className="space-y-2">
              <button onClick={() => navigate("/botschafter/werbemittel")} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#d1d5db" }}>
                <span>📋</span> Flyer für deine Kunden
              </button>
              <button onClick={() => navigate("/botschafter/links")} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#d1d5db" }}>
                <span>📱</span> QR-Code für Visitenkarte
              </button>
              <button onClick={() => {
                navigator.clipboard.writeText(`Hey! Ich nutze die digitale Pferdeakte von HufManager – kostenlos und mega praktisch. Schau mal: ${referralLink}`);
                toast.success("WhatsApp-Vorlage kopiert!");
              }} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#d1d5db" }}>
                <span>💬</span> WhatsApp-Vorlage kopieren
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {data.type === "unternehmen" && (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Co-Branding</h3>
            <div className="space-y-2 text-sm" style={{ color: "#d1d5db" }}>
              <p>✓ Dein Logo auf der Sponsoring-Seite</p>
              <p>✓ "Empfohlen von {data.company_name}" Badge</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/botschafter/sponsoring")} style={{ borderColor: "#F5970A", color: "#F5970A" }}>
              Sponsoring-Seite bearbeiten →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tier Progress */}
      {nextTier && (
        <div className="text-center text-sm p-3 rounded-lg" style={{ backgroundColor: "rgba(245,151,10,0.1)", color: "#F5970A" }}>
          🎯 Noch {nextTier.min - conversions} Partner bis {nextTier.label} ({nextTier.rate}% Provision)
        </div>
      )}
    </div>
  );
}
