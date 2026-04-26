import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Check, ExternalLink, Mail, Shield, Server, CreditCard, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PLAN_HORSE_LIMITS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "9,90",
    interval: "monatlich",
    maxHorses: 10,
    users: 1,
    highlight: false,
    features: [
      "Kalender & Terminverwaltung",
      "Kundenverwaltung",
      "Digitale Pferdeakte",
      "Bis zu 10 Pferde",
    ],
    copecartId: "hufi-starter",
  },
  {
    id: "pro",
    name: "PRO",
    price: "29",
    interval: "monatlich",
    maxHorses: 75,
    users: 1,
    highlight: true,
    features: [
      "Alles aus Starter",
      "GPS-Navigation & Tour",
      "KI-Assistent (Hufi Brain)",
      "Automatische Erinnerungen",
      "Rechnungen & Buchhaltung",
      "Analyse & Statistiken",
      "Bis zu 75 Pferde",
    ],
    copecartId: "hufi-pro",
  },
  {
    id: "duo",
    name: "DUO",
    price: "49",
    interval: "monatlich",
    maxHorses: 150,
    users: 2,
    highlight: false,
    features: [
      "Alles aus PRO",
      "2 Nutzer-Accounts",
      "Team-Kalender",
      "Bis zu 150 Pferde",
    ],
    copecartId: "hufi-duo",
  },
  {
    id: "team",
    name: "TEAM",
    price: "79",
    interval: "monatlich",
    maxHorses: Infinity,
    users: Infinity,
    highlight: false,
    features: [
      "Alles aus DUO",
      "Unbegrenzte Nutzer",
      "Erweiterte Analysen",
      "Unbegrenzte Pferde",
      "Priority Support",
    ],
    copecartId: "hufi-team",
  },
];

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

  const handleUpgrade = (copecartId: string) => {
    window.open(`https://copecart.com/products/${copecartId}/checkout`, "_blank");
  };

  const handleKuendigung = () => {
    const subject = encodeURIComponent(`Kündigung Hufi ${currentPlanLabel}`);
    window.open(`mailto:kontakt@hufiapp.de?subject=${subject}`, "_blank");
  };

  const handleRechnungsanfrage = () => {
    const subject = encodeURIComponent("Rechnungsanfrage Hufi");
    window.open(`mailto:kontakt@hufiapp.de?subject=${subject}`, "_blank");
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
            {(PLANS.find(p => p.id === plan || (plan === "advanced" && p.id === "pro"))?.features ?? PLANS[0].features).map((f) => (
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

      {/* Upgrade Options */}
      {!isLifetime && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Weitere Pakete</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.filter(p => p.id !== plan && !(plan === "advanced" && p.id === "pro")).map((p) => (
              <Card
                key={p.id}
                className={cn(
                  "relative border transition-shadow hover:shadow-md",
                  p.highlight && "border-primary/60"
                )}
              >
                {p.highlight && (
                  <div className="absolute -top-2.5 left-4">
                    <Badge className="bg-primary text-white text-xs">Beliebteste Wahl</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <span className="text-lg font-bold">{p.price}€<span className="text-xs font-normal text-muted-foreground">/Monat</span></span>
                  </div>
                  <CardDescription className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {p.maxHorses === Infinity ? "∞" : p.maxHorses} Pferde
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {p.users === Infinity ? "∞" : p.users} {p.users === 1 ? "Nutzer" : "Nutzer"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1">
                    {p.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                    {p.features.length > 3 && (
                      <li className="text-xs text-muted-foreground pl-4">+{p.features.length - 3} weitere</li>
                    )}
                  </ul>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => handleUpgrade(p.copecartId)}
                  >
                    Auf {p.name} wechseln
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
        Alle Preise netto. Gemäß § 19 UStG wird keine Umsatzsteuer erhoben.
        Bei Fragen: <a href="mailto:kontakt@hufiapp.de" className="underline">kontakt@hufiapp.de</a>
      </p>
    </div>
  );
}
