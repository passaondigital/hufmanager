import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Gift,
  Users,
  TrendingUp,
  ExternalLink,
  Calculator,
  Coins,
  CheckCircle2,
} from "lucide-react";

const GeldVerdienen = () => {
  const [referrals, setReferrals] = useState([5]);

  // 20% Provision auf 49€ Abo = 9,80€ pro Monat pro Kollege
  const commissionPerReferral = 9.80;
  const monthlyEarnings = referrals[0] * commissionPerReferral;
  const hufManagerCost = 49;
  const netProfit = monthlyEarnings - hufManagerCost;

  const affiliateUrl = "https://www.copecart.com/affiliate/hufmanager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <Badge variant="outline" className="mb-3">
          <Gift className="h-3 w-3 mr-1" />
          Partnerprogramm
        </Badge>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Partnerprogramm
        </h1>

        <p className="text-sm text-muted-foreground max-w-2xl">
          Empfiehl Hufi an Kollegen. Für jede Anmeldung über deinen Link
          erhältst du 20&nbsp;% Provision auf das Abo – monatlich, solange der Account aktiv ist.
        </p>

        <Button
          size="sm"
          className="mt-4"
          onClick={() => window.open(affiliateUrl, '_blank')}
        >
          Partner-Link anfordern
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Calculator Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Provisionsrechner
          </CardTitle>
          <CardDescription>
            Hochrechnung auf Basis von 20&nbsp;% auf das Fortgeschritten-Abo (49&nbsp;€/Monat)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Geworbene Kollegen</span>
              <span className="text-lg font-semibold text-foreground">{referrals[0]}</span>
            </div>
            <Slider
              value={referrals}
              onValueChange={setReferrals}
              max={20}
              min={1}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          {/* Results as table-like rows */}
          <div className="border rounded-lg divide-y divide-border">
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-muted-foreground">Monatliche Provision</span>
              <span className="text-sm font-semibold text-foreground">
                {monthlyEarnings.toFixed(2)}&nbsp;€
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-muted-foreground">Dein Hufi-Abo</span>
              <span className="text-sm font-semibold text-foreground">
                −{hufManagerCost.toFixed(2)}&nbsp;€
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-muted/30">
              <span className="text-sm font-medium text-foreground">
                {netProfit >= 0 ? 'Netto-Verdienst' : 'Differenz'}
              </span>
              <span className={`text-sm font-bold ${netProfit >= 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}&nbsp;€
              </span>
            </div>
          </div>

          {referrals[0] >= 5 && (
            <p className="text-sm text-muted-foreground text-center">
              Ab {referrals[0]} Empfehlungen deckt die Provision dein Abo.
              {netProfit > 0 && ` Verbleibend: ${netProfit.toFixed(2)}\u00a0€/Monat.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">So funktioniert es</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Link teilen</h3>
              <p className="text-xs text-muted-foreground">
                Sende deinen Affiliate-Link per Nachricht, E-Mail oder Social Media an Kollegen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Wiederkehrende Provision</h3>
              <p className="text-xs text-muted-foreground">
                Du erhältst monatlich 20&nbsp;%, solange der geworbene Kollege sein Abo nutzt.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-3">
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Transparente Abrechnung</h3>
              <p className="text-xs text-muted-foreground">
                Provisionen werden über Copecart abgerechnet und monatlich ausgezahlt.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
          Registrierung als Partner über Copecart. Kein eigenes Abo erforderlich.
        </p>
        <Button
          onClick={() => window.open(affiliateUrl, '_blank')}
        >
          Partner-Link anfordern
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default GeldVerdienen;
