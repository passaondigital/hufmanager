import { ServiceCard } from "@/components/landing/ServiceCard";

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration: number | null;
  booking_action: 'direct_book' | 'request_only';
}

interface LandingServicesProps {
  services: Service[];
  primaryColor: string;
  onBook: (name: string) => void;
  onRequest: (name: string) => void;
}

export const LandingServices = ({ services, primaryColor, onBook, onRequest }: LandingServicesProps) => (
  <section className="py-16 px-4 bg-muted/30">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Services</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
        Wählen Sie einen Service und buchen Sie direkt oder stellen Sie eine Anfrage
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        {services
          .filter((s) => !s.name.toUpperCase().includes('BALANCE'))
          .map((service) => (
            <ServiceCard
              key={service.id}
              title={service.name}
              description={service.description}
              price={service.base_price}
              priceType={service.duration ? `${service.duration} Min.` : null}
              features={null}
              primaryColor={primaryColor}
              bookingAction={service.booking_action}
              onBook={() => onBook(service.name)}
              onRequest={() => onRequest(service.name)}
            />
          ))}
      </div>
    </div>
  </section>
);
