import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Coins, Zap, Star, Shield, Loader2, CheckCircle } from "lucide-react";
import {
  createCreditCheckout,
  createPremiumSubscription,
  CREDIT_PACKAGES,
  type CreditPackage,
} from "@/lib/stripe-checkout";

interface CreditRow {
  balance: number;
  total_purchased: number;
}

interface TxRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function Credits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [credits, setCredits] = useState<CreditRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const success = params.get("success") === "true";

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: cred }, { data: tx }] = await Promise.all([
        supabase.from("hufi_credits").select("balance, total_purchased").eq("user_id", user.id).maybeSingle(),
        supabase.from("hufi_credit_transactions").select("id, type, amount, description, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setCredits(cred ?? { balance: 0, total_purchased: 0 });
      setTransactions(tx ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  async function handleBuy(pkg: CreditPackage) {
    if (!user?.id || !user.email) return;
    setBuying(pkg);
    try {
      const url = await createCreditCheckout(user.id, user.email, pkg);
      window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setBuying(null);
    }
  }

  async function handlePremium() {
    if (!user?.id || !user.email) return;
    setBuying("premium");
    try {
      const url = await createPremiumSubscription(user.id, user.email);
      window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setBuying(null);
    }
  }

  const balance = credits?.balance ?? 0;
  const balanceColor = balance === 0 ? "#EF4444" : balance < 50 ? "#F97316" : "#10B981";

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100dvh", padding: "24px 16px 100px" }}>

      {/* Success banner */}
      {success && (
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <CheckCircle size={20} style={{ color: "#10B981", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: "#065F46", fontSize: 14 }}>Zahlung erfolgreich!</div>
            <div style={{ fontSize: 12, color: "#065F46", opacity: 0.8 }}>Dein Guthaben wurde aufgeladen.</div>
          </div>
        </div>
      )}

      {/* Balance card */}
      <div style={{
        background: "#FFFFFF", borderRadius: 20, padding: "24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: 8 }}>
          Verfügbares Guthaben
        </div>
        {loading ? (
          <Loader2 size={32} style={{ color: "#F97316", animation: "spin 1s linear infinite", margin: "8px auto" }} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
              <Coins size={32} style={{ color: balanceColor }} />
              <span style={{ fontSize: 56, fontWeight: 900, color: balanceColor, lineHeight: 1, letterSpacing: "-2px" }}>
                {balance.toLocaleString("de-DE")}
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#6B7280" }}>
              Verfügbare KI-Antworten
            </div>
            {balance === 0 && (
              <div style={{ marginTop: 12, background: "#FEF2F2", borderRadius: 10, padding: "8px 14px", display: "inline-block" }}>
                <span style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>⚠️ Guthaben erschöpft — jetzt aufladen</span>
              </div>
            )}
            {balance > 0 && balance < 50 && (
              <div style={{ marginTop: 12, background: "#FFF7ED", borderRadius: 10, padding: "8px 14px", display: "inline-block" }}>
                <span style={{ fontSize: 13, color: "#F97316", fontWeight: 600 }}>Guthaben wird knapp — bald aufladen</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Packages */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A", marginBottom: 14, letterSpacing: "-0.3px" }}>
        Guthaben aufladen
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {(Object.entries(CREDIT_PACKAGES) as [CreditPackage, typeof CREDIT_PACKAGES["500"]][]).map(([key, pkg]) => (
          <div
            key={key}
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "20px",
              boxShadow: pkg.popular ? "0 4px 20px rgba(249,115,22,0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
              border: pkg.popular ? "2px solid #F97316" : "1px solid #F0F0F0",
              position: "relative" as const,
            }}
          >
            {pkg.popular && (
              <div style={{
                position: "absolute" as const, top: -12, left: "50%", transform: "translateX(-50%)",
                background: "#F97316", color: "#FFFFFF", fontSize: 11, fontWeight: 700,
                padding: "3px 12px", borderRadius: 20, letterSpacing: ".06em",
                textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
              }}>
                ⭐ Beliebt
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", marginBottom: 2 }}>{pkg.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "#1A1A1A", letterSpacing: "-1px" }}>
                    {(pkg.credits + pkg.bonus).toLocaleString("de-DE")}
                  </span>
                  <span style={{ fontSize: 14, color: "#6B7280" }}>Antworten</span>
                </div>
                {pkg.bonus > 0 && (
                  <div style={{ fontSize: 12, color: "#10B981", fontWeight: 600, marginTop: 2 }}>
                    +{pkg.bonus} Bonus inkludiert
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A", marginBottom: 8 }}>
                  €{pkg.priceEur.toFixed(2)}
                </div>
                <button
                  onClick={() => handleBuy(key)}
                  disabled={!!buying}
                  style={{
                    background: pkg.popular ? "#F97316" : "#1A1A1A",
                    color: "#FFFFFF", border: "none", borderRadius: 12,
                    padding: "10px 20px", fontSize: 14, fontWeight: 700,
                    cursor: buying ? "wait" : "pointer", fontFamily: "inherit",
                    boxShadow: pkg.popular ? "0 4px 12px rgba(249,115,22,0.4)" : "none",
                    minWidth: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {buying === key ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  Kaufen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium CTA */}
      <div style={{
        background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
        border: "1px solid rgba(249,115,22,0.2)",
        borderRadius: 20, padding: "20px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={20} style={{ color: "#FFFFFF" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A", marginBottom: 4 }}>
              Mit Premium — unlimitierte KI
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, marginBottom: 14 }}>
              Keine Credits nötig. Hufi antwortet unlimitiert, priorisiert und mit erweiterten Features.
            </div>
            <button
              onClick={handlePremium}
              disabled={!!buying}
              style={{
                background: "#F97316", color: "#FFFFFF", border: "none",
                borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700,
                cursor: buying ? "wait" : "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {buying === "premium" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Star size={14} />}
              Premium für €9,99/Monat
            </button>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { icon: "✓", text: "Credits verfallen nie" },
          { icon: "🔒", text: "Bezahlung via Stripe" },
        ].map((b, i) => (
          <div key={i} style={{ flex: 1, background: "#FFFFFF", borderRadius: 12, padding: "10px 12px", textAlign: "center" as const, fontSize: 12, color: "#6B7280", border: "1px solid #F0F0F0" }}>
            <span style={{ fontWeight: 700 }}>{b.icon}</span> {b.text}
          </div>
        ))}
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
            Verlauf
          </h2>
          <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            {transactions.map((tx, i) => {
              const isPositive = tx.amount > 0;
              const date = new Date(tx.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", padding: "12px 16px",
                  borderBottom: i < transactions.length - 1 ? "1px solid #F5F5F5" : "none",
                  gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isPositive ? "#F0FDF4" : "#FEF2F2",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14,
                  }}>
                    {isPositive ? "+" : "−"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tx.description ?? (isPositive ? "Guthaben hinzugefügt" : "KI-Antwort")}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{date}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isPositive ? "#10B981" : "#6B7280", flexShrink: 0 }}>
                    {isPositive ? "+" : ""}{tx.amount}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
