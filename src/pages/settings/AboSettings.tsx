import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Check, ExternalLink, Mail, Shield, Server, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PLAN_HORSE_LIMITS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { HUFMANAGER_SLIM_TEXT } from "@/config/subscriptionPlans";

const HUFMANAGER_SLIM_CHECKOUT_URL = HUFMANAGER_SLIM_TEXT.checkoutUrl || "https://copecart.com/products/3a97bd25/checkout";

const HUFMANAGER_SLIM_PLAN = {
  name: HUFMANAGER_SLIM_TEXT.productName,
  price: "19,95",
  interval: "monatlich",
  features: HUFMANAGER_SLIM_TEXT.included,
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  advanced: "PRO",
  pro: "PRO",
  duo: "DUO",
  team: "TEAM",
};

export default function AboSettings() {
  const navigate = useNavigate();
  const { status, plan, loading, planOverride, accessValidUntil, horseLimit } = useSubscription();

  const currentPlanLabel = plan ? (PLAN_LABELS[plan] ?? plan) : "Starter";
  const isLifetime = status === "lifetime" || planOverride === "lifetime_grant";

  const handleUpgrade = () => {
    window.open(HUFMANAGER_SLIM_CHECKOUT_URL, "_blank");
  };

  const handleKuendigung = () => {
    const subject = encodeURIComponent(`Kündigung HufManager ${currentPlanLabel}`);
    window.open(`mailto:teamhufmanager@gmail.com?subject=${subject}`, "_blank");
  };

  const handleRechnungsanfrage = () => {
    const subject = encodeURIComponent("Rechnungsanfrage HufManager");
    window.open(`mailto:teamhufmanager@gmail.com?subject=${subject}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 mb-2 text-muted-foreground"
          onClick={() => navigate("/management/abo")}
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Abo & Zahlung</h1>
        <p className="text-muted-foreground mt-1">Dein Plan, deine Abrechnung und Upgrade-Optionen</p>
      </div>

      {/* Current Plan Card */}
      <Card className={cn(
        "border-2",
        isLifetime ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/20" : "border-green-500 bg-green-50/30 dark:bg-green-950/20"
      )}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isLifetime ? "bg-amber-100 dark:bg-amber-900/50" : "bg-green-100 dark:bg-green-900/50"
              )}>
                <Crown className={cn("h-6 w-6", isLifetime ? "text-amber-600" : "text-green-600")} />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {isLifetime ? "Lifetime" : currentPlanLabel} Paket
                  {isLifetime && <Badge className="bg-amber-500 text-white">Lifetime</Badge>}
                  {!isLifetime && status === "active" && <Badge className="bg-green-500 text-white">Aktiv</Badge>}
                  {status === "trialing" && <Badge variant="secondary">Testphase</Badge>}
                  {status === "cancelled" && <Badge variant="outline">Gekündigt</Badge>}
                  {status === "past_due" && <Badge variant="destructive">Zahlung ausstehend</Badge>}
                </CardTitle>
                <CardDescription>
                  {isLifetime
                    ? "Unbegrenzter Zugang zu allen Hufi Features"
                    : `Bis zu ${horseLimit === Infinity ? "unbegrenzt" : horseLimit} Pferde`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HUFMANAGER_SLIM_PLAN.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {accessValidUntil && (
            <p className="text-sm text-muted-foreground">
              Zugang gültig bis: <strong>{new Date(accessValidUntil).toLocaleDateString("de-DE")}</strong>
            </p>
          )}

          {/* Actions */}
          {!isLifetime && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleKuendigung}>
                <Mail className="h-4 w-4" />
                Plan kündigen
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleRechnungsanfrage}>
                <ExternalLink className="h-4 w-4" />
                Rechnung anfordern
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Option */}
      {!isLifetime && plan !== "pro" && plan !== "advanced" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">HufManager Slim</h2>
          <Card className="relative border border-primary/60 transition-shadow hover:shadow-md">
            <div className="absolute -top-2.5 left-4">
              <Badge className="bg-primary text-white text-xs">Ein Tarif</Badge>
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{HUFMANAGER_SLIM_PLAN.name}</CardTitle>
                <span className="text-lg font-bold">{HUFMANAGER_SLIM_PLAN.price}€<span className="text-xs font-normal text-muted-foreground">/Monat</span></span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1">
                {HUFMANAGER_SLIM_PLAN.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
                {HUFMANAGER_SLIM_PLAN.features.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-4">+{HUFMANAGER_SLIM_PLAN.features.length - 3} weitere</li>
                )}
              </ul>
              <Button size="sm" className="w-full" onClick={handleUpgrade}>
                Jetzt upgraden
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-4 w-4" />
          <span>Zahlung über CopeCart</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4" />
          <span>DSGVO-konform</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Server className="h-4 w-4" />
          <span>EU-Server (Frankfurt)</span>
        </div>
      </div>

      {/* Legal footer */}
      <p className="text-xs text-center text-muted-foreground">
        Der Checkout läuft über CopeCart. Die App zeigt den beworbenen monatlichen Preis.
        Bei Fragen: <a href="mailto:teamhufmanager@gmail.com" className="underline">teamhufmanager@gmail.com</a>
      </p>
    </div>
  );
}
