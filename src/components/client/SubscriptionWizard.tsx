import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, TrendingDown, ExternalLink, Check, Gift } from "lucide-react";

interface SubscriptionSettings {
  price_4_weeks_zone1: number;
  price_4_weeks_zone2: number;
  price_6_weeks_zone1: number;
  price_6_weeks_zone2: number;
  price_8_weeks_zone1: number;
  price_8_weeks_zone2: number;
  discount_percentage: number;
  copecart_base_url: string;
}

interface SubscriptionWizardProps {
  settings: SubscriptionSettings;
  onSwitchToStandard: () => void;
}

type Interval = "4" | "6" | "8";
type Zone = "1" | "2";

export function SubscriptionWizard({ settings, onSwitchToStandard }: SubscriptionWizardProps) {
  const [horses, setHorses] = useState(1);
  const [interval, setInterval] = useState<Interval>("6");
  const [zone, setZone] = useState<Zone>("1");

  // Calculate prices based on settings
  const getPricePerHorse = (int: Interval, z: Zone): number => {
    const key = `price_${int}_weeks_zone${z}` as keyof SubscriptionSettings;
    return (settings[key] as number) || 0;
  };

  const calculation = useMemo(() => {
    const pricePerHorse = getPricePerHorse(interval, zone);
    const totalMonthly = pricePerHorse * horses;
    
    // Calculate yearly based on interval
    const intervalsPerYear = {
      "4": 13,  // 52 weeks / 4
      "6": 8.67, // 52 weeks / 6
      "8": 6.5,  // 52 weeks / 8
    };
    
    const visitsPerYear = intervalsPerYear[interval];
    const totalYearly = totalMonthly * visitsPerYear;
    
    // Calculate savings vs single price (assume single = no discount)
    const singlePricePerVisit = pricePerHorse / (1 - settings.discount_percentage / 100);
    const totalYearlySingle = singlePricePerVisit * horses * visitsPerYear;
    const yearlySavings = totalYearlySingle - totalYearly;
    
    return {
      pricePerHorse,
      totalMonthly,
      totalYearly: Math.round(totalYearly),
      yearlySavings: Math.round(yearlySavings),
      visitsPerYear: Math.round(visitsPerYear),
      discountPercentage: settings.discount_percentage,
    };
  }, [horses, interval, zone, settings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleCheckout = () => {
    if (settings.copecart_base_url) {
      // Build checkout URL with parameters
      const url = new URL(settings.copecart_base_url);
      url.searchParams.set("horses", horses.toString());
      url.searchParams.set("interval", interval);
      url.searchParams.set("zone", zone);
      window.open(url.toString(), "_blank");
    }
  };

  const intervalLabels = {
    "4": "4 Wochen",
    "6": "6 Wochen",
    "8": "8 Wochen",
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Dein Sorglos-Paket</CardTitle>
          </div>
          <CardDescription className="text-base">
            Regelmäßige Hufpflege zum Vorteilspreis – du sparst {settings.discount_percentage}%
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Konfiguriere dein Abo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Horses Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Anzahl Pferde</Label>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {horses}
              </Badge>
            </div>
            <Slider
              value={[horses]}
              onValueChange={([val]) => setHorses(val)}
              min={1}
              max={5}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          <Separator />

          {/* Interval Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Bearbeitungsintervall</Label>
            <RadioGroup
              value={interval}
              onValueChange={(val) => setInterval(val as Interval)}
              className="grid grid-cols-3 gap-3"
            >
              {(["4", "6", "8"] as Interval[]).map((int) => (
                <div key={int}>
                  <RadioGroupItem
                    value={int}
                    id={`interval-${int}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`interval-${int}`}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <span className="font-bold text-lg">{int}</span>
                    <span className="text-xs text-muted-foreground">Wochen</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Zone Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Anfahrtszone</Label>
            <RadioGroup
              value={zone}
              onValueChange={(val) => setZone(val as Zone)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="1"
                  id="zone-1"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="zone-1"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                >
                  <span className="font-bold">Zone 1</span>
                  <span className="text-xs text-muted-foreground">Nahbereich</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="2"
                  id="zone-2"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="zone-2"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                >
                  <span className="font-bold">Zone 2</span>
                  <span className="text-xs text-muted-foreground">Weiter entfernt</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Price Summary Card */}
      <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Preis pro Pferd</span>
            <span className="font-medium">{formatCurrency(calculation.pricePerHorse)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Besuche pro Jahr</span>
            <span className="font-medium">ca. {calculation.visitsPerYear}x</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Dein Preis (pro Termin)</span>
            <span className="font-bold text-primary text-2xl">
              {formatCurrency(calculation.totalMonthly)}
            </span>
          </div>

          {calculation.yearlySavings > 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-500/10 rounded-lg p-3">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">
                Du sparst ca. {formatCurrency(calculation.yearlySavings)} pro Jahr!
              </span>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {settings.copecart_base_url ? (
              <Button 
                onClick={handleCheckout} 
                className="w-full" 
                size="lg"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Jetzt Abo abschließen
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>
                Checkout nicht konfiguriert
              </Button>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground" 
              onClick={onSwitchToStandard}
            >
              Lieber einzeln buchen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Deine Vorteile im Abo</h4>
          <ul className="space-y-2">
            {[
              `${settings.discount_percentage}% Rabatt auf jeden Termin`,
              "Automatische Terminplanung",
              "Bevorzugte Terminvergabe",
              "Keine vergessenen Termine mehr",
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
