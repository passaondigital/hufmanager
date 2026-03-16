import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ExternalLink, Eye, ArrowRightCircle, MessageCircle, Palette, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { BotschafterHelpTooltip } from "@/components/botschafter/BotschafterHelpTooltip";
import { BotschafterFloatingHelp } from "@/components/botschafter/BotschafterFloatingHelp";
import { BotschafterOnboardingModal } from "@/components/botschafter/BotschafterOnboardingModal";
import { BotschafterChecklist } from "@/components/botschafter/BotschafterChecklist";

type BotschafterData = {
  id: string;
  referral_code: string;
  total_clicks: number | null;
  total_conversions: number | null;
  total_earnings_cents: number | null;
  commission_rate: number | null;
  copecart_username: string | null;
  onboarding_completed: boolean | null;
  bid: string | null;
};

const PROVISION_STUFEN = [
  { min: 0, rate: 20, label: "Stufe 1" },
  { min: 5, rate: 30, label: "Stufe 2" },
  { min: 15, rate: 40, label: "Stufe 3" },
  { min: 30, rate: 50, label: "Stufe 4" },
];

export default function BotschafterUebersicht() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<BotschafterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const userEmail = user!.email || "";
    // Zuerst per user_id suchen, falls nicht gefunden per E-Mail
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, referral_code, total_clicks, total_conversions, total_earnings_cents, commission_rate, copecart_username, onboarding_completed, bid, user_id")
      .or(`user_id.eq.${user!.id},email.eq.${userEmail}`)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (bot) {
      // user_id nachträglich setzen falls per E-Mail gefunden
      if (!bot.user_id || bot.user_id !== user!.id) {
        await supabase
          .from("pferdeakte_botschafter")
          .update({ user_id: user!.id } as any)
          .eq("id", bot.id);
      }
      setData(bot as unknown as BotschafterData);
      if (!(bot as any).onboarding_completed) {
        setShowOnboarding(true);
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!data) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Du bist kein aktiver Botschafter.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Zurück</Button>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/pferdeakte/botschafter?ref=${data.referral_code}`;
  const conversions = data.total_conversions || 0;
  const currentStufe = [...PROVISION_STUFEN].reverse().find(s => conversions >= s.min) || PROVISION_STUFEN[0];

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link kopiert!");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <BotschafterOnboardingModal
          bid={data.bid || data.id}
          referralCode={data.referral_code}
          botschafterId={data.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Deine #BID: <Badge variant="outline" className="font-mono">{(data.bid || data.id).slice(0, 8).toUpperCase()}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/botschafter/nachrichten")}>
            <MessageCircle className="w-4 h-4 mr-1" /> Nachrichten
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/botschafter/werbemittel")}>
            <Palette className="w-4 h-4 mr-1" /> Werbemittel
          </Button>
        </div>
      </div>

      {/* Referral Link */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Dein Referral-Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm p-2.5 bg-muted rounded-lg break-all">{referralLink}</code>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-1" /> Kopieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist (hides when all done + 7 days) */}
      <BotschafterChecklist
        copecartUsername={data.copecart_username}
        totalClicks={data.total_clicks || 0}
        totalConversions={conversions}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-sm text-muted-foreground">Klicks</p>
              <BotschafterHelpTooltip
                title="Was sind Klicks?"
                content="Jedes Mal wenn jemand auf deinen Referral-Link klickt wird es hier gezählt — unabhängig ob er kauft."
              />
            </div>
            <p className="text-3xl font-bold">{data.total_clicks || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-sm text-muted-foreground">Conversions</p>
              <BotschafterHelpTooltip
                title="Was ist eine Conversion?"
                content="Eine Conversion entsteht wenn jemand über deinen Link ein bezahltes Paket bucht."
              />
            </div>
            <p className="text-3xl font-bold">{conversions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-sm text-muted-foreground">Offene Provision</p>
              <BotschafterHelpTooltip
                title="Wann wird ausgezahlt?"
                content="Provisionen werden monatlich zum 15. über CopeCart ausgezahlt — vorausgesetzt du hast einen verifizierten CopeCart-Account."
              />
            </div>
            <p className="text-3xl font-bold">{((data.total_earnings_cents || 0) / 100).toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Provision Stufen */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-1">
            <CardTitle className="text-base">Provisions-Stufen</CardTitle>
            <BotschafterHelpTooltip
              title="Wie steige ich auf?"
              content="Mit jeder bestätigten Conversion steigst du automatisch in die nächste Stufe auf. Stufe 4 = 50% Provision."
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVISION_STUFEN.map(stufe => {
              const isActive = currentStufe.rate === stufe.rate;
              return (
                <div
                  key={stufe.rate}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    isActive ? "border-orange-500 bg-orange-500/10" : "border-border"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{stufe.label}</p>
                  <p className={`text-xl font-bold ${isActive ? "text-orange-500" : ""}`}>{stufe.rate}%</p>
                  <p className="text-[11px] text-muted-foreground">ab {stufe.min} Conv.</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "📢", label: "Werbemittel", path: "/botschafter/werbemittel" },
          { icon: "💰", label: "Abrechnung", path: "/botschafter/abrechnung" },
          { icon: "🎓", label: "Akademie", path: "/botschafter/akademie" },
          { icon: "💬", label: "Nachrichten", path: "/botschafter/nachrichten" },
        ].map(item => (
          <Card key={item.path} className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => navigate(item.path)}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-sm font-medium">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Floating Help */}
      <BotschafterFloatingHelp />
    </div>
  );
}
