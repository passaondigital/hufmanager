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
  Sparkles
} from "lucide-react";

const GeldVerdienen = () => {
  const [referrals, setReferrals] = useState([5]);
  
  // Fiktive Berechnung: 20% Provision auf 49€ Abo = 9,80€ pro Monat pro Kollege
  const commissionPerReferral = 9.80;
  const monthlyEarnings = referrals[0] * commissionPerReferral;
  const hufManagerCost = 49; // Monatliche Kosten HufManager
  const netProfit = monthlyEarnings - hufManagerCost;
  
  // Copecart Affiliate URL (Placeholder)
  const affiliateUrl = "https://www.copecart.com/affiliate/hufmanager";

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Gift className="h-3 w-3 mr-1" />
            Partnerprogramm
          </Badge>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Empfehle HufManager und verdiene an jedem Kollegen mit!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-6">
            Nutze deinen persönlichen Affiliate-Link. Wenn sich ein Kollege darüber anmeldet, 
            erhältst du automatisch <span className="text-primary font-semibold">20% Provision</span> auf 
            sein Abo – jeden Monat, solange er dabei ist.
          </p>
          
          <Button 
            size="lg" 
            className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            onClick={() => window.open(affiliateUrl, '_blank')}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Jetzt Partner werden & Link holen
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Calculator Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Verdienst-Rechner
          </CardTitle>
          <CardDescription>
            Berechne, wie viel du mit deinen Empfehlungen verdienen kannst
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Geworbene Kollegen</span>
              <span className="text-2xl font-bold text-primary">{referrals[0]}</span>
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
              <span>1 Kollege</span>
              <span>20 Kollegen</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50 border-0">
              <CardContent className="pt-6 text-center">
                <Coins className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground mb-1">Monatliche Provision</p>
                <p className="text-2xl font-bold text-foreground">
                  {monthlyEarnings.toFixed(2)} €
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-0">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-muted-foreground mb-1">Dein HufManager-Abo</p>
                <p className="text-2xl font-bold text-foreground">
                  -{hufManagerCost.toFixed(2)} €
                </p>
              </CardContent>
            </Card>
            
            <Card className={`border-2 ${netProfit >= 0 ? 'border-green-500/50 bg-green-500/10' : 'border-primary/50 bg-primary/10'}`}>
              <CardContent className="pt-6 text-center">
                <Gift className={`h-8 w-8 mx-auto mb-2 ${netProfit >= 0 ? 'text-green-500' : 'text-primary'}`} />
                <p className="text-sm text-muted-foreground mb-1">
                  {netProfit >= 0 ? 'Dein Gewinn' : 'Noch zu zahlen'}
                </p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-foreground'}`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} €
                </p>
              </CardContent>
            </Card>
          </div>

          {referrals[0] >= 5 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-green-500 font-semibold">
                🎉 Mit {referrals[0]} Kollegen ist dein HufManager kostenlos 
                {netProfit > 0 && ` + ${netProfit.toFixed(2)} € Taschengeld!`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-muted">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Einfach teilen</h3>
            <p className="text-sm text-muted-foreground">
              Teile deinen Link per WhatsApp, E-Mail oder auf Social Media mit Kollegen
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-muted">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Passives Einkommen</h3>
            <p className="text-sm text-muted-foreground">
              Du verdienst jeden Monat automatisch, solange deine Kollegen dabei bleiben
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-muted">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Faire Provision</h3>
            <p className="text-sm text-muted-foreground">
              20% auf jeden Umsatz deiner geworbenen Kollegen – fair und transparent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Bereit, dein Netzwerk zu aktivieren?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Werde jetzt Partner und erhalte deinen persönlichen Affiliate-Link. 
            Die Anmeldung dauert nur 2 Minuten.
          </p>
          <Button 
            size="lg" 
            className="gradient-primary text-primary-foreground"
            onClick={() => window.open(affiliateUrl, '_blank')}
          >
            <Gift className="h-5 w-5 mr-2" />
            Kostenlos Partner werden
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeldVerdienen;
