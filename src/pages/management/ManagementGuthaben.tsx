import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useHufiVoiceCredits,
  useHufiVoiceCreditHistory,
  formatMinSec,
  type VoiceCreditTransaction,
} from "@/hooks/useHufiVoiceCredits";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const CREDIT_TIERS = [
  { label: "5€ Guthaben", amount: "5€", url: "https://copecart.com/products/d0cdf68a/checkout" },
  { label: "10€ Guthaben", amount: "10€", url: "https://copecart.com/products/023890f8/checkout" },
  { label: "25€ Guthaben", amount: "25€", url: "https://copecart.com/products/2556cac0/checkout" },
];

function txLabel(tx: VoiceCreditTransaction): string {
  if (tx.type === "purchase") return "Guthaben gekauft";
  if (tx.type === "monthly_reset") return "Basis-Kontingent zurückgesetzt";
  if (tx.type === "admin_adjustment") return tx.description ?? "Anpassung";
  return tx.description ?? "Sprachausgabe";
}

export default function ManagementGuthaben() {
  const navigate = useNavigate();
  const {
    monthlyBalanceCents, monthlyBaseCents, purchasedBalanceCents,
    purchasedExpiresAt, isLow, isLoading,
  } = useHufiVoiceCredits();
  const { data: history, isLoading: historyLoading } = useHufiVoiceCreditHistory();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/management")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" /> Voice-Guthaben
        </h1>
        <p className="text-muted-foreground mt-1">Dein Kontingent für Hufis Premium-Stimme</p>
      </div>

      {isLow && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Dein Voice-Guthaben ist fast aufgebraucht</p>
            <p className="text-xs text-muted-foreground mt-0.5">Lade unten Guthaben auf, um weiter die Premium-Stimme zu nutzen.</p>
          </div>
        </div>
      )}

      {/* Guthabenstand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Basis-Kontingent (monatlich)</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "…" : formatMinSec(monthlyBalanceCents)} <span className="text-sm font-normal text-muted-foreground">Min</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            von {formatMinSec(monthlyBaseCents)} Min inklusive · wird jeden Monat zurückgesetzt, nicht übertragbar
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Gekauftes Zusatz-Guthaben</p>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "…" : formatMinSec(purchasedBalanceCents)} <span className="text-sm font-normal text-muted-foreground">Min</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {purchasedExpiresAt
              ? `Gültig bis ${format(new Date(purchasedExpiresAt), "d. MMMM yyyy", { locale: de })}`
              : "Kein Zusatz-Guthaben vorhanden"}
          </p>
        </div>
      </div>

      {/* Guthaben aufladen */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Voice-Guthaben aufladen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CREDIT_TIERS.map((tier) => (
            <a
              key={tier.url}
              href={tier.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              <span className="text-2xl font-bold text-foreground">{tier.amount}</span>
              <span className="text-xs text-muted-foreground">Guthaben</span>
            </a>
          ))}
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5" /> Guthaben-Bedingungen
          </CollapsibleTrigger>
          <CollapsibleContent className="text-xs text-muted-foreground leading-relaxed pt-2 pl-4">
            Guthaben ist 12 Monate gültig. Keine Rückerstattung, keine Übertragung.
            Bei Abo-Kündigung bleibt Restguthaben bis Ablauf nutzbar. Verbrauch jederzeit einsehbar.
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Verbrauchshistorie */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Verlauf</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {historyLoading && <p className="p-4 text-sm text-muted-foreground">Lädt…</p>}
          {!historyLoading && (history?.length ?? 0) === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Noch keine Sprachausgabe genutzt.</p>
          )}
          {history?.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm text-foreground">{txLabel(tx)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.created_at), "d. MMM yyyy, HH:mm", { locale: de })}
                  {tx.duration_seconds ? ` · ${Math.round(tx.duration_seconds)}s` : ""}
                </p>
              </div>
              <span className={`text-sm font-semibold ${tx.amount_cents < 0 ? "text-muted-foreground" : "text-primary"}`}>
                {tx.amount_cents > 0 ? "+" : ""}{formatMinSec(Math.abs(tx.amount_cents))} Min
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
