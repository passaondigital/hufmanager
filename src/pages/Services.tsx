import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Clock, Euro } from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    id: 1,
    name: "Barhufbearbeitung",
    description: "Professionelle Barhufpflege für gesunde, natürliche Hufe",
    category: "Standard",
    basePrice: 65,
    duration: 45,
    isActive: true,
  },
  {
    id: 2,
    name: "Hufbeschlag (vorne)",
    description: "Beschlag der Vorderhufe mit Standardeisen",
    category: "Beschlag",
    basePrice: 80,
    duration: 60,
    isActive: true,
  },
  {
    id: 3,
    name: "Hufbeschlag (komplett)",
    description: "Vollständiger Beschlag aller vier Hufe",
    category: "Beschlag",
    basePrice: 140,
    duration: 90,
    isActive: true,
  },
  {
    id: 4,
    name: "Korrektur-Beschlag",
    description: "Orthopädischer Spezialbeschlag bei Fehlstellungen",
    category: "Spezial",
    basePrice: 180,
    duration: 120,
    isActive: true,
  },
  {
    id: 5,
    name: "Hufschuhe anpassen",
    description: "Anpassung und Einstellung von Hufschuhen",
    category: "Zubehör",
    basePrice: 45,
    duration: 30,
    isActive: false,
  },
];

const categoryColors: Record<string, string> = {
  Standard: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Spezial: "bg-amber-500/10 text-amber-600",
  Zubehör: "bg-muted text-muted-foreground",
};

const Services = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre angebotenen Dienstleistungen
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Service
        </Button>
      </div>

      <div className="grid gap-4">
        {services.map((service, index) => (
          <Card
            key={service.id}
            className={cn(
              "animate-slide-up",
              !service.isActive && "opacity-60"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                    <Badge className={cn("font-medium", categoryColors[service.category])}>
                      {service.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <Euro className="h-4 w-4 text-primary" />
                      €{service.basePrice}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      ca. {service.duration} Min.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Aktiv</span>
                    <Switch checked={service.isActive} />
                  </div>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Services;
