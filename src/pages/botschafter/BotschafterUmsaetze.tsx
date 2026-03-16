import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const COPECART_SIGNUP = "https://copecart.com/users/sign_up?cp=barhufserviceschmid&language=de";

const TIERS = [
  { key: "bronze", label: "Bronze", min: 0, hm: 20, tresor: 10, extra: "", icon: "🥉" },
  { key: "silver", label: "Silber", min: 10, hm: 22, tresor: 12, extra: "+ Badge", icon: "🥈" },
  { key: "gold", label: "Gold", min: 20, hm: 25, tresor: 15, extra: "+ Prio-Support", icon: "🥇" },
  { key: "platinum", label: "Platin", min: 50, hm: 30, tresor: 20, extra: "+ Events + Beta", icon: "💎" },
];

export default function BotschafterUmsaetze() {
  const { user } = useAuth();
  const [bot, setBot] = useState<any>(null);
  const [abrechnungen, setAbrechnungen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copecartEmail, setCopecartEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: botData } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, copecart_username, copecart_verified, total_earnings_cents, total_paid_out_cents, total_conversions, tier")
      .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
      .eq("status", "active")
      .maybeSingle();

    if (botData) {
      setBot(botData);
      setCopecartEmail(botData.copecart_username || "");
      const { data: abr } = await supabase
        .from("botschafter_abrechnungen")
        .select("id, total_amount_cents, total_conversions, status, paid_at, period_start, period_end")
        .eq("botschafter_id", botData.id)
        .order("created_at", { ascending: false });
      setAbrechnungen(abr || []);
    }
    setLoading(false);
  };

  const saveCopecart = async () => {
    if (!copecartEmail.trim() || !bot) return;
    setSaving(true);
    await supabase
      .from("pferdeakte_botschafter")
      .update({ copecart_username: copecartEmail.trim() } as any)
      .eq("id", bot.id);
    setBot((prev: any) => ({ ...prev, copecart_username: copecartEmail.trim() }));
    setSaving(false);
    toast.success("CopeCart-E-Mail gespeichert!");
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F5970A" }} /></div>;
  if (!bot) return null;

  const totalEarned = (bot.total_earnings_cents || 0) / 100;
  const totalPaid = (bot.total_paid_out_cents || 0) / 100;
  const openBalance = totalEarned - totalPaid;
  const conversions = bot.total_conversions || 0;
  const currentTier = [...TIERS].reverse().find(t => conversions >= t.min) || TIERS[0];
  const nextTier = TIERS.find(t => t.min > conversions);
  const hasCopecart = !!bot.copecart_username;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">💰 Meine Umsätze</h1>

      {/* CopeCart Setup */}
      {!hasCopecart && (
        <Card style={{ backgroundColor: "#1a1a12", borderColor: "#F5970A" }}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#F5970A" }} />
              <div>
                <h3 className="font-semibold text-sm">Bevor du Provisionen erhalten kannst</h3>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  CopeCart ist unser Zahlungspartner. Alle Provisionen werden automatisch über CopeCart ausgezahlt.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm" style={{ color: "#d1d5db" }}>
              <div className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "#F5970A" }}>1.</span>
                <div>
                  <p className="font-medium">CopeCart-Account anlegen (kostenlos)</p>
                  <a href={COPECART_SIGNUP} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: "#F5970A" }}>
                    Jetzt bei CopeCart registrieren <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "#F5970A" }}>2.</span>
                <p>Verifizierung abwarten (1-3 Werktage)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold" style={{ color: "#F5970A" }}>3.</span>
                <div className="flex-1">
                  <p className="font-medium mb-2">CopeCart-E-Mail hier eintragen</p>
                  <div className="flex gap-2">
                    <Input value={copecartEmail} onChange={e => setCopecartEmail(e.target.value)}
                      placeholder="deine@copecart-email.de" className="bg-[#0a0700] border-[#2a2a1f] text-white text-sm" />
                    <Button size="sm" onClick={saveCopecart} disabled={saving} style={{ backgroundColor: "#F5970A", color: "#0a0700" }}>
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#9ca3af" }}>
              <span>Status:</span>
              <span style={{ color: "#eab308" }}>🟡 CopeCart nicht verbunden</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Stats */}
      {hasCopecart && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
            <span style={{ color: "#22c55e" }}>CopeCart verifiziert</span>
            <span style={{ color: "#6b7280" }}>· {bot.copecart_username}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Verdient gesamt", value: `${totalEarned.toFixed(2)}€` },
              { label: "Ausgezahlt", value: `${totalPaid.toFixed(2)}€` },
              { label: "Offenes Guthaben", value: `${openBalance.toFixed(2)}€` },
            ].map(s => (
              <Card key={s.label} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
                <CardContent className="p-4 text-center">
                  <p className="text-[11px] mb-1" style={{ color: "#9ca3af" }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: "#F5970A" }}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dual Provision Breakdown */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">💰 Provisionsstruktur</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-bold" style={{ color: "#F5970A" }}>HUFBEARBEITER & PARTNER</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{currentTier.hm}% Lifetime · Monat für Monat</p>
              <div className="space-y-1 text-xs" style={{ color: "#d1d5db" }}>
                <p>Starter (19€) → <strong style={{ color: "#F5970A" }}>{(19 * currentTier.hm / 100).toFixed(2)}€</strong></p>
                <p>Pro (29€) → <strong style={{ color: "#F5970A" }}>{(29 * currentTier.hm / 100).toFixed(2)}€</strong></p>
                <p>Duo (49€) → <strong style={{ color: "#F5970A" }}>{(49 * currentTier.hm / 100).toFixed(2)}€</strong></p>
                <p>Team (79€) → <strong style={{ color: "#F5970A" }}>{(79 * currentTier.hm / 100).toFixed(2)}€</strong></p>
              </div>
            </div>
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: "#0a0700" }}>
              <p className="text-xs font-bold" style={{ color: "#F5970A" }}>PFERDEAKTE TRESOR-ABOS</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{currentTier.tresor}% Lifetime · Jede Akte, jeden Monat</p>
              <div className="space-y-1 text-xs" style={{ color: "#d1d5db" }}>
                <p>Light (2,99€) → <strong style={{ color: "#F5970A" }}>{(2.99 * currentTier.tresor / 100).toFixed(2)}€</strong></p>
                <p>Pro (7,99€) → <strong style={{ color: "#F5970A" }}>{(7.99 * currentTier.tresor / 100).toFixed(2)}€</strong></p>
                <p>Gestüt (14,99€) → <strong style={{ color: "#F5970A" }}>{(14.99 * currentTier.tresor / 100).toFixed(2)}€</strong></p>
                <p>Unlimited (24,99€) → <strong style={{ color: "#F5970A" }}>{(24.99 * currentTier.tresor / 100).toFixed(2)}€</strong></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Progress */}
      <Card style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Dein Level</h3>
          <div className="flex gap-2">
            {TIERS.map(t => (
              <div key={t.key} className="flex-1 text-center p-2 rounded-lg text-xs"
                style={{
                  backgroundColor: currentTier.key === t.key ? "rgba(245,151,10,0.15)" : "transparent",
                  border: currentTier.key === t.key ? "1px solid #F5970A" : "1px solid #2a2a1f",
                }}>
                <div className="text-lg">{t.icon}</div>
                <div className="font-semibold" style={{ color: currentTier.key === t.key ? "#F5970A" : "#9ca3af" }}>{t.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
            Dein Level: <strong style={{ color: "#F5970A" }}>{currentTier.label}</strong> ({conversions} Partner)
            {nextTier && <> · Noch {nextTier.min - conversions} bis {nextTier.label}</>}
          </p>
          <div className="space-y-1 text-xs" style={{ color: "#6b7280" }}>
            {TIERS.map(t => (
              <div key={t.key} className="flex justify-between" style={{ color: currentTier.key === t.key ? "#F5970A" : undefined }}>
                <span>{t.label} ({t.min}+):</span>
                <span>{t.hm}% HufManager · {t.tresor}% Tresor {t.extra}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <h3 className="font-semibold text-sm">Auszahlungshistorie</h3>
      <div className="space-y-2">
        {abrechnungen.map(a => (
          <Card key={a.id} style={{ backgroundColor: "#1a1a12", borderColor: "#2a2a1f" }}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="text-sm">
                <p>{a.paid_at ? new Date(a.paid_at).toLocaleDateString("de-DE") : "Ausstehend"}</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>{a.total_conversions || 0} Conversions</p>
              </div>
              <div className="text-right">
                <p className="font-semibold" style={{ color: "#F5970A" }}>{((a.total_amount_cents || 0) / 100).toFixed(2)}€</p>
                <p className="text-[10px]" style={{ color: a.status === "paid" ? "#22c55e" : "#eab308" }}>
                  {a.status === "paid" ? "✓ Ausgezahlt" : "⏳ Ausstehend"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {abrechnungen.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "#6b7280" }}>Noch keine Auszahlungen</p>
        )}
      </div>

      <p className="text-[11px] text-center" style={{ color: "#6b7280" }}>
        Auszahlung: Automatisch über CopeCart ab 50€
      </p>
    </div>
  );
}
