import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Smartphone, Monitor } from "lucide-react";
import { OfferCard } from "./OfferCard";
import { ServiceListItem } from "./ServiceListItem";
import { cn } from "@/lib/utils";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  is_active: boolean | null;
  offer_type: string | null;
  display_mode: string | null;
  media_url: string | null;
  external_link: string | null;
  billing_type: string | null;
}

interface OfferPreviewPanelProps {
  offers: Offer[];
  primaryColor?: string;
}

const BILLING_LABELS: Record<string, string> = {
  einmalig: "Einmalig",
  abo: "Abo",
  stuendlich: "Stündlich",
  kostenlos: "Kostenlos",
};

export const OfferPreviewPanel = ({ offers, primaryColor = "#F47B20" }: OfferPreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const activeOffers = offers.filter((o) => o.is_active);
  const highlightOffers = activeOffers.filter(
    (o) => o.display_mode === "highlight_card" || !o.display_mode
  );
  const listOffers = activeOffers.filter((o) => o.display_mode === "list_item");
  const shopOffers = activeOffers.filter((o) => o.display_mode === "shop_grid");

  if (activeOffers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aktivieren Sie mindestens ein Angebot, um die Vorschau zu sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live-Vorschau
          </CardTitle>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <button
              onClick={() => setViewMode("desktop")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className={cn(
            "bg-muted/30 rounded-lg p-4 overflow-auto transition-all",
            viewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
          )}
          style={{ maxHeight: "600px" }}
        >
          {/* Highlights Section */}
          {highlightOffers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Leistungen & Pakete</h3>
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {highlightOffers.slice(0, 3).map((offer) => (
                  <OfferCard
                    key={offer.id}
                    title={offer.title}
                    description={offer.description}
                    price={offer.price}
                    priceType={offer.price_type}
                    features={offer.features}
                    offerType={offer.offer_type || undefined}
                    mediaUrl={offer.media_url}
                    externalLink={offer.external_link}
                    primaryColor={primaryColor}
                    billingType={offer.billing_type}
                  />
                ))}
              </div>
            </div>
          )}

          {/* List Section */}
          {listOffers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-3">Weitere Services</h3>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {listOffers.map((offer) => (
                    <ServiceListItem
                      key={offer.id}
                      title={offer.title}
                      description={offer.description}
                      price={offer.price}
                      priceType={offer.price_type}
                      externalLink={offer.external_link}
                      primaryColor={primaryColor}
                      billingType={offer.billing_type}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Shop Grid Section */}
          {shopOffers.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Produkte</h3>
              <div
                className={cn(
                  "grid gap-3",
                  viewMode === "mobile" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
                )}
              >
                {shopOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    title={offer.title}
                    description={offer.description}
                    price={offer.price}
                    priceType={offer.price_type}
                    features={offer.features}
                    offerType={offer.offer_type || undefined}
                    mediaUrl={offer.media_url}
                    externalLink={offer.external_link}
                    primaryColor={primaryColor}
                    billingType={offer.billing_type}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
