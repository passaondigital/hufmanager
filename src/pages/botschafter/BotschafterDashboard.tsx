import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Sparkles, Info, Calculator, ChevronDown, ChevronUp } from "lucide-react";
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
  { key: "bronze", label: "Bronze", min: 0, hm: 20, tresor: 10, icon: "🥉" },
  { key: "silver", label: "Silber", min: 10, hm: 22, tresor: 12, icon: "🥈" },
  { key: "gold", label: "Gold", min: 20, hm: 25, tresor: 15, icon: "🥇" },
  { key: "platinum", label: "Platin", min: 50, hm: 30, tresor: 20, icon: "💎" },
];

const CONTENT_IDEAS = [
  "5 Dinge die jeder Pferdebesitzer wissen muss",
  "So funktioniert die digitale Pferdeakte",
  "Warum Datenschutz auch für Pferde wichtig ist",
  "QR-Code am Stall: So rettest du im Notfall Leben",
];

const HM_PLANS = [
  { label: "Starter (19€)", price: 19 },
  { label: "Pro (29€)", price: 29 },
  { label: "Duo (49€)", price: 49 },
  { label: "Team (79€)", price: 79 },
];

const TRESOR_PLANS = [
  { label: "Light (2,99€)", price: 2.99 },
  { label: "Pro (7,99€)", price: 7.99 },
  { label: "Gestüt (14,99€)", price: 14.99 },
  { label: "Unlimited (24,99€)", price: 24.99 },
];

export default function BotschafterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<BotschafterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcHbs, setCalcHbs] = useState(5);
  const [calcOwners, setCalcOwners] = useState(20);
  const [calcHbPlan, setCalcHbPlan] = useState("29");
  const [calcTresorPlan, setCalcTresorPlan] = useState("7.99");

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, type, first_name, last_name, referral_code, total_clicks, total_conversions, total_earnings_cents, tier, created_at, company_name, social_handle")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (bot) {
      setData(bot as unknown as BotschafterData);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!data) return (
    <div className="p-6 max-w-2xl mx-auto text-center py-16 space-y-4">
      <p className="text-lg font-semibold">Du bist noch kein Botschafter.</p>
      <p className="text-sm" style={{ color: "#9ca3af" }}>Registriere dich jetzt und verdiene mit HufManager.</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => navigate("/botschafter/login")} style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
          Jetzt Botschafter werden
        </Button>
        <Button variant="outline" onClick={async () => { await logout(); }} style={{ borderColor: "#2a2a1f" }}>
          Abmelden
        </Button>
      </div>
    </div>
  );

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

  // Calculator logic
  const hbPrice = parseFloat(calcHbPlan);
  const tresorPrice = parseFloat(calcTresorPlan);
  const monthlyHb = calcHbs * hbPrice * (currentTier.hm / 100);
  const monthlyTresor = calcOwners * tresorPrice * (currentTier.tresor / 100);
  const after12Hbs = calcHbs * 12;
  const after12Owners = calcOwners * 12;
  const after12MonthlyHb = after12Hbs * hbPrice * (currentTier.hm / 100);
  const after12MonthlyTresor = after12Owners * tresorPrice * (currentTier.tresor / 100);

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

      {/* Info Box: So funktioniert HufManager */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#F5970A" }} />
            <h3 className="font-semibold text-sm">So funktioniert HufManager</h3>
          </div>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Die Pferdeakte ist der Kern von HufManager. Alles baut darauf auf.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ color: "#d1d5db" }}>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "#0a0700" }}>
              <p className="font-semibold mb-1">🐴 Für Pferdebesitzer</p>
              <p>Kostenloser Account. Pferdeakte gratis.</p>
              <p>Tresor ab 2,99€/Monat.</p>
              <p className="mt-1 font-semibold" style={{ color: "#F5970A" }}>→ Deine Provision: {currentTier.tresor}% auf Tresor-Abos</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "#0a0700" }}>
              <p className="font-semibold mb-1">🔨 Für Hufbearbeiter & Partner</p>
              <p>Ab 19€/Monat. Termine, Rechnungen, Pferdeakte.</p>
              <p className="mt-1 font-semibold" style={{ color: "#F5970A" }}>→ Deine Provision: {currentTier.hm}% Lifetime</p>
            </div>
          </div>
          <p className="text-[11px] text-center" style={{ color: "#6b7280" }}>
            Beides Lifetime. Solange sie zahlen, verdienst du.
          </p>
        </CardContent>
      </Card>

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

      {/* Dual Earnings Display */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">💰 Deine Einnahmen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-medium" style={{ color: "#9ca3af" }}>HufManager-Accounts ({currentTier.hm}% Lifetime)</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#F5970A" }}>
                {((data.total_earnings_cents || 0) * 0.7 / 100).toFixed(2)}€
              </p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>recurring / Monat</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-medium" style={{ color: "#9ca3af" }}>Pferdeakte Tresor ({currentTier.tresor}% Lifetime)</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#F5970A" }}>
                {((data.total_earnings_cents || 0) * 0.3 / 100).toFixed(2)}€
              </p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>recurring / Monat</p>
            </div>
          </div>

          {/* Calculator Toggle */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center gap-1 text-xs font-medium hover:underline w-full justify-center pt-1"
            style={{ color: "#F5970A" }}
          >
            <Calculator className="w-3 h-3" />
            Einnahmen-Rechner {showCalculator ? "schließen" : "öffnen"}
            {showCalculator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Earnings Calculator */}
          {showCalculator && (
            <div className="space-y-4 pt-3 border-t" style={{ borderColor: "#2a2a1f" }}>
              <h4 className="text-sm font-semibold flex items-center gap-2">🧮 Einnahmen-Rechner</h4>

              {/* HB Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#9ca3af" }}>Hufbearbeiter pro Monat</span>
                  <span className="font-bold" style={{ color: "#F5970A" }}>{calcHbs}</span>
                </div>
                <Slider
                  value={[calcHbs]}
                  onValueChange={v => setCalcHbs(v[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="[&_[data-radix-slider-track]]:bg-[#2a2a1f] [&_[data-radix-slider-range]]:bg-[#F5970A] [&_[data-radix-slider-thumb]]:border-[#F5970A]"
                />
                <Select value={calcHbPlan} onValueChange={setCalcHbPlan}>
                  <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "#0a0700", borderColor: "#2a2a1f" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HM_PLANS.map(p => (
                      <SelectItem key={p.price} value={String(p.price)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs" style={{ color: "#d1d5db" }}>
                  → {calcHbs} × {hbPrice}€ × {currentTier.hm}% = <strong style={{ color: "#F5970A" }}>{monthlyHb.toFixed(2)}€/Monat</strong>
                </p>
              </div>

              {/* Tresor Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#9ca3af" }}>Pferdebesitzer pro Monat</span>
                  <span className="font-bold" style={{ color: "#F5970A" }}>{calcOwners}</span>
                </div>
                <Slider
                  value={[calcOwners]}
                  onValueChange={v => setCalcOwners(v[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="[&_[data-radix-slider-track]]:bg-[#2a2a1f] [&_[data-radix-slider-range]]:bg-[#F5970A] [&_[data-radix-slider-thumb]]:border-[#F5970A]"
                />
                <Select value={calcTresorPlan} onValueChange={setCalcTresorPlan}>
                  <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "#0a0700", borderColor: "#2a2a1f" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRESOR_PLANS.map(p => (
                      <SelectItem key={p.price} value={String(p.price)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs" style={{ color: "#d1d5db" }}>
                  → {calcOwners} × {tresorPrice}€ × {currentTier.tresor}% = <strong style={{ color: "#F5970A" }}>{monthlyTresor.toFixed(2)}€/Monat</strong>
                </p>
              </div>

              {/* 12-month projection */}
              <div className="p-3 rounded-lg text-center space-y-1" style={{ backgroundColor: "rgba(245,151,10,0.1)" }}>
                <p className="text-xs font-medium" style={{ color: "#9ca3af" }}>Nach 12 Monaten (kumuliert)</p>
                <p className="text-xs" style={{ color: "#d1d5db" }}>
                  HufManager: {after12Hbs} HBs × {hbPrice}€ × {currentTier.hm}% = {after12MonthlyHb.toFixed(0)}€/Mon
                </p>
                <p className="text-xs" style={{ color: "#d1d5db" }}>
                  Tresor: {after12Owners} Besitzer × {tresorPrice}€ × {currentTier.tresor}% = {after12MonthlyTresor.toFixed(0)}€/Mon
                </p>
                <p className="text-lg font-bold mt-2" style={{ color: "#F5970A" }}>
                  💰 {(after12MonthlyHb + after12MonthlyTresor).toFixed(0)}€ passives Einkommen / Monat
                </p>
                <p className="text-sm font-semibold" style={{ color: "#F5970A" }}>
                  💰 {((after12MonthlyHb + after12MonthlyTresor) * 12).toFixed(0)}€ / Jahr
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#6b7280" }}>
                  Und das wächst jeden Monat weiter.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Provision Table */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">💰 So verdienst du mit HufManager</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-bold" style={{ color: "#F5970A" }}>HUFBEARBEITER & PARTNER</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{currentTier.hm}% Lifetime-Provision</p>
              <div className="space-y-1 text-xs" style={{ color: "#d1d5db" }}>
                <p>Starter (19€) → <strong style={{ color: "#F5970A" }}>{(19 * currentTier.hm / 100).toFixed(2)}€/Mon</strong></p>
                <p>Pro (29€) → <strong style={{ color: "#F5970A" }}>{(29 * currentTier.hm / 100).toFixed(2)}€/Mon</strong></p>
                <p>Duo (49€) → <strong style={{ color: "#F5970A" }}>{(49 * currentTier.hm / 100).toFixed(2)}€/Mon</strong></p>
                <p>Team (79€) → <strong style={{ color: "#F5970A" }}>{(79 * currentTier.hm / 100).toFixed(2)}€/Mon</strong></p>
              </div>
            </div>
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-bold" style={{ color: "#F5970A" }}>PFERDEAKTE TRESOR-ABOS</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{currentTier.tresor}% Lifetime-Provision</p>
              <div className="space-y-1 text-xs" style={{ color: "#d1d5db" }}>
                <p>Light (2,99€) → <strong style={{ color: "#F5970A" }}>{(2.99 * currentTier.tresor / 100).toFixed(2)}€/Mon</strong></p>
                <p>Pro (7,99€) → <strong style={{ color: "#F5970A" }}>{(7.99 * currentTier.tresor / 100).toFixed(2)}€/Mon</strong></p>
                <p>Gestüt (14,99€) → <strong style={{ color: "#F5970A" }}>{(14.99 * currentTier.tresor / 100).toFixed(2)}€/Mon</strong></p>
                <p>Unlimited (24,99€) → <strong style={{ color: "#F5970A" }}>{(24.99 * currentTier.tresor / 100).toFixed(2)}€/Mon</strong></p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center" style={{ color: "#6b7280" }}>
            Alle Provisionen sind LIFETIME – du verdienst solange dein geworbener Nutzer aktiv bleibt. Auszahlung über CopeCart.
          </p>
        </CardContent>
      </Card>

      {/* Tier Progress */}
      {nextTier && (
        <div className="text-center text-sm p-3 rounded-lg" style={{ backgroundColor: "rgba(245,151,10,0.1)", color: "#F5970A" }}>
          🎯 Noch {nextTier.min - conversions} Partner bis {nextTier.label} ({nextTier.hm}% HufManager / {nextTier.tresor}% Tresor)
        </div>
      )}
    </div>
  );
}
