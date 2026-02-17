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

interface LandingHighlightsProps {
  offers: Offer[];
  primaryColor: string;
}

export const LandingHighlights = ({ offers, primaryColor }: LandingHighlightsProps) => (
  <section className="py-16 px-4">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Leistungen & Pakete</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
        Professionelle Hufbearbeitung für jede Anforderung
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        {offers.slice(0, 3).map((offer) => (
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
