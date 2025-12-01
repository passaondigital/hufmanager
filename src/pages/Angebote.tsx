import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const offers = [
  {
    id: 1,
    title: "Barhufbearbeitung",
    description: "Professionelle Barhufpflege für gesunde Hufe. Inklusive Beratung zur optimalen Hufgesundheit.",
    price: "65",
    priceType: "fest",
    features: ["Ausschneiden", "Raspeln", "Strahlfurchen reinigen", "Beratung"],
    isActive: true,
    imageUrl: null,
  },
  {
    id: 2,
    title: "Hufbeschlag",
    description: "Individuell angepasster Hufbeschlag mit hochwertigen Materialien.",
    price: "120",
    priceType: "ab",
    features: ["Hufeisen nach Maß", "Nieten & Nageln", "Korrektur bei Bedarf", "Nachkontrolle"],
    isActive: true,
    imageUrl: null,
  },
  {
    id: 3,
    title: "Korrektur-Beschlag",
    description: "Spezieller orthopädischer Beschlag bei Hufproblemen und Fehlstellungen.",
    price: null,
    priceType: "auf_anfrage",
    features: ["Analyse der Fehlstellung", "Individueller Plan", "Spezialhufeisen", "Verlaufskontrolle"],
    isActive: false,
    imageUrl: null,
  },
];

const priceTypeLabels: Record<string, string> = {
  fest: "Festpreis",
  ab: "Ab",
  auf_anfrage: "Auf Anfrage",
};

const Angebote = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Angebote</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Service-Angebote für die Landingpage (max. 3 aktiv)
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neues Angebot
        </Button>
      </div>

      <div className="grid gap-6">
        {offers.map((offer, index) => (
          <Card
            key={offer.id}
            className={cn(
              "relative overflow-hidden animate-slide-up",
              !offer.isActive && "opacity-60"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Drag Handle */}
                <div className="flex items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                </div>

                {/* Image Placeholder */}
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{offer.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {offer.price ? (
                          <span className="text-2xl font-bold text-primary">
                            {offer.priceType === "ab" && "ab "}€{offer.price}
                          </span>
                        ) : (
                          <Badge variant="secondary">{priceTypeLabels[offer.priceType]}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Aktiv</span>
                        <Switch checked={offer.isActive} />
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4">{offer.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {offer.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="bg-muted/50">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Maximal <strong>3 Angebote</strong> können gleichzeitig aktiv sein und werden auf Ihrer Landingpage angezeigt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Angebote;
