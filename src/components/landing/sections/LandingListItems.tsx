import { Card, CardContent } from "@/components/ui/card";
import { ServiceListItem } from "@/components/landing/ServiceListItem";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  external_link: string | null;
  billing_type: string | null;
}

interface LandingListItemsProps {
  offers: Offer[];
  primaryColor: string;
}

export const LandingListItems = ({ offers, primaryColor }: LandingListItemsProps) => (
  <section className="py-16 px-4 bg-muted/30">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Weitere Services</h2>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {offers.map((offer) => (
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
  </section>
);
