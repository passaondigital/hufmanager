import { OfferCard } from "@/components/landing/OfferCard";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  offer_type: string | null;
  media_url: string | null;
  external_link: string | null;
  billing_type: string | null;
}

interface LandingShopGridProps {
  offers: Offer[];
  primaryColor: string;
}

export const LandingShopGrid = ({ offers, primaryColor }: LandingShopGridProps) => (
  <section className="py-16 px-4">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Produkte</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {offers.map((offer) => (
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
  </section>
);
